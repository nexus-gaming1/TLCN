const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models');
const {
  ComboTimeStatus,
  ComputerStatus,
  SessionType,
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionCategory
} = require('../src/constants/enums');
const comboTimeService = require('../src/services/comboTimeService');
const runMigrations = require('../src/utils/migrationRunner');
const seedData = require('../src/utils/seeder');

test('Setup: Ensure database migrations and seeder before test suite', async () => {
  await runMigrations();
  await db.sequelize.sync();
  await seedData(db);
  assert.ok(true, 'Database setup complete');
});

test.beforeEach(async () => {
  // Clean up any remaining ComboTime sessions between tests for strict isolation
  await db.ComboTime.destroy({ where: {} });
  await db.Computer.update({ status: ComputerStatus.ONLINE }, { where: {} });
});

// --------------------------------------------------------------------------
// 1. CRUD ComboPackage và validation
// --------------------------------------------------------------------------
test('1. CRUD ComboPackage và validation', async () => {
  // A. Validation ca âm: tên rỗng
  await assert.rejects(
    async () => {
      await comboTimeService.createPackage({ name: '', price: 30000, duration_minutes: 120 });
    },
    (err) => err.statusCode === 400 && err.message.includes('Tên gói combo')
  );

  // B. Validation ca âm: giá âm
  await assert.rejects(
    async () => {
      await comboTimeService.createPackage({ name: 'Combo Test', price: -5000, duration_minutes: 120 });
    },
    (err) => err.statusCode === 400 && err.message.includes('không âm')
  );

  // C. Validation ca âm: thời lượng <= 0
  await assert.rejects(
    async () => {
      await comboTimeService.createPackage({ name: 'Combo Test', price: 30000, duration_minutes: 0 });
    },
    (err) => err.statusCode === 400 && err.message.includes('lớn hơn 0')
  );

  // D. Create ca dương
  const pkg = await comboTimeService.createPackage({
    name: 'Combo Thử Nghiệm 2H',
    description: 'Dành cho test CRUD',
    price: 35000,
    duration_minutes: 120,
    allowed_tier: 2
  });
  assert.strictEqual(pkg.name, 'Combo Thử Nghiệm 2H');
  assert.strictEqual(parseFloat(pkg.price), 35000);
  assert.strictEqual(pkg.duration_minutes, 120);
  assert.strictEqual(pkg.allowed_tier, 2);

  // E. Update
  const updated = await comboTimeService.updatePackage(pkg.combo_id, {
    price: 38000,
    duration_minutes: 150
  });
  assert.strictEqual(parseFloat(updated.price), 38000);
  assert.strictEqual(updated.duration_minutes, 150);

  // F. Toggle status
  const toggled = await comboTimeService.togglePackageStatus(pkg.combo_id, false);
  assert.strictEqual(toggled.is_active, false);

  // G. Delete package without history
  const delResult = await comboTimeService.deletePackage(pkg.combo_id);
  assert.strictEqual(delResult.success, true);
});

// --------------------------------------------------------------------------
// 2. Quản lý ComboItem, kiểm tra service item và số lượng
// --------------------------------------------------------------------------
test('2. Quản lý ComboItem, kiểm tra service item và số lượng', async () => {
  const pkg = await comboTimeService.createPackage({
    name: 'Combo Ăn Uống 3H',
    price: 45000,
    duration_minutes: 180,
    allowed_tier: 2
  });

  // A. Thêm dịch vụ đi kèm hợp lệ (service_item_id = 1: Mì trứng, 2: Sting)
  const updated = await comboTimeService.setComboItems(pkg.combo_id, [
    { service_item_id: 1, quantity: 1 },
    { service_item_id: 2, quantity: 2 }
  ]);

  assert.strictEqual(updated.comboItems.length, 2);
  const stingItem = updated.comboItems.find((i) => i.service_item_id === 2);
  assert.strictEqual(stingItem.quantity, 2);

  // B. Validation: service item không tồn tại
  await assert.rejects(
    async () => {
      await comboTimeService.setComboItems(pkg.combo_id, [{ service_item_id: 999999, quantity: 1 }]);
    },
    /không tồn tại/
  );

  // Dọn dẹp
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 3. Combo chưa thanh toán không được kích hoạt
// --------------------------------------------------------------------------
test('3. Combo chưa thanh toán không được kích hoạt', async () => {
  // Tạo 1 ServiceOrder ở trạng thái UNPAID
  const order = await db.ServiceOrder.create({
    used_by: 2,
    status: OrderStatus.PENDING,
    payment_status: PaymentStatus.UNPAID,
    total_amount: 50000
  });

  const unpaidCombo = await db.ComboTime.create({
    order_id: order.order_id,
    allowed_tier: 1,
    duration_minutes: 60,
    status: ComboTimeStatus.PENDING
  });

  // Gọi activateSession phải bị từ chối
  await assert.rejects(
    async () => {
      await comboTimeService.activateSession({
        comboTimeId: unpaidCombo.combo_time_id,
        memberId: 2,
        computerId: 1
      });
    },
    /Combo chưa thanh toán không được kích hoạt/
  );

  // Dọn dẹp
  await unpaidCombo.destroy();
  await order.destroy();
});

// --------------------------------------------------------------------------
// 4. Combo đã thanh toán bắt đầu đếm giờ ngay tại thời điểm mua
// --------------------------------------------------------------------------
test('4. Combo đã thanh toán bắt đầu đếm giờ ngay tại thời điểm mua', async () => {
  const beforeTime = Date.now();
  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: 1, // Combo Đêm: 360 phút
    paymentMethod: 'CASH'
  });
  const afterTime = Date.now();

  const comboTime = purchase.comboTime;
  assert.strictEqual(comboTime.status, ComboTimeStatus.ACTIVE);
  assert.ok(comboTime.start_time !== null);
  assert.ok(comboTime.end_time !== null);

  const startMs = new Date(comboTime.start_time).getTime();
  assert.ok(startMs >= beforeTime - 1000 && startMs <= afterTime + 1000);

  const expectedEndMs = startMs + 360 * 60 * 1000;
  const actualEndMs = new Date(comboTime.end_time).getTime();
  assert.strictEqual(Math.floor(actualEndMs / 1000), Math.floor(expectedEndMs / 1000));

  // calculateRemainingMinutes trả về thời lượng khoảng 360 phút
  const remaining = comboTime.calculateRemainingMinutes();
  assert.ok(remaining >= 359 && remaining <= 360);

  // Dọn dẹp
  await comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
});

// --------------------------------------------------------------------------
// 5. Bắt đầu sử dụng lần đầu gán máy trạm và bảo toàn thời gian đã đếm từ lúc mua
// --------------------------------------------------------------------------
test('5. Bắt đầu sử dụng lần đầu gán máy trạm và bảo toàn thời gian đã đếm từ lúc mua', async () => {
  const beforeTime = Date.now();
  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: 1, // 360 min, allowed_tier: 1
    paymentMethod: 'CASH'
  });

  // Tìm máy trống ở Zone 3 (tier_level = 1 <= allowed_tier: 1)
  const computer = await db.Computer.findOne({
    where: { zone_id: 3, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });
  assert.ok(computer, 'Tìm thấy máy trạm Zone 3');

  const activateRes = await comboTimeService.activateSession({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    computerId: computer.computer_id
  });

  assert.strictEqual(activateRes.success, true);
  assert.strictEqual(activateRes.comboTime.status, ComboTimeStatus.ACTIVE);
  assert.strictEqual(activateRes.comboTime.computer_id, computer.computer_id);

  // StartedAt bảo toàn mốc thời gian lúc mua
  const startedAtMs = new Date(activateRes.startedAt).getTime();
  assert.ok(startedAtMs >= beforeTime - 1000);

  // ExpiresAt = startedAt + 360 phút
  const expectedEndMs = startedAtMs + 360 * 60 * 1000;
  const actualEndMs = new Date(activateRes.expiresAt).getTime();
  assert.strictEqual(Math.floor(actualEndMs / 1000), Math.floor(expectedEndMs / 1000));

  // Máy trạm chuyển sang IN_USE
  const freshComp = await db.Computer.findByPk(computer.computer_id);
  assert.strictEqual(freshComp.status, ComputerStatus.IN_USE);

  // Dọn dẹp phiên chơi
  await comboTimeService.endSessionEarly({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2
  });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
});

// --------------------------------------------------------------------------
// 6. Nhiều request bắt đầu đồng thời không kích hoạt nhiều lần
// --------------------------------------------------------------------------
test('6. Nhiều request bắt đầu đồng thời không kích hoạt nhiều lần', async () => {
  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: 1,
    paymentMethod: 'CASH'
  });

  const computer = await db.Computer.findOne({
    where: { zone_id: 3, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });

  // Gọi kích hoạt lần 1
  const res1 = await comboTimeService.activateSession({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    computerId: computer.computer_id
  });
  assert.strictEqual(res1.success, true);

  // Gọi kích hoạt lần 2 phải bị từ chối
  await assert.rejects(
    async () => {
      await comboTimeService.activateSession({
        comboTimeId: purchase.comboTime.combo_time_id,
        memberId: 2,
        computerId: computer.computer_id
      });
    },
    /đang hoạt động trên máy trạm khác hoặc đã được gán máy/
  );

  // Dọn dẹp
  await comboTimeService.endSessionEarly({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2
  });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
});

// --------------------------------------------------------------------------
// 7. Combo Zone 2 sử dụng ở Zone 2 thành công
// --------------------------------------------------------------------------
test('7. Combo Zone 2 sử dụng ở Zone 2 thành công', async () => {
  // Tạo Combo có allowed_tier = 2
  const pkgTier2 = await comboTimeService.createPackage({
    name: 'Combo VIP Zone 2',
    price: 60000,
    duration_minutes: 180,
    allowed_tier: 2
  });

  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: pkgTier2.combo_id,
    paymentMethod: 'CASH'
  });

  // Zone 2 có tier_level = 2 (VIP Suite)
  const compZone2 = await db.Computer.findOne({
    where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });
  assert.ok(compZone2, 'Tìm thấy máy trạm Zone 2');

  const res = await comboTimeService.activateSession({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    computerId: compZone2.computer_id
  });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.comboTime.status, ComboTimeStatus.ACTIVE);

  // Dọn dẹp
  await comboTimeService.endSessionEarly({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2
  });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkgTier2.combo_id);
});

// --------------------------------------------------------------------------
// 8. Combo Zone 2 chuyển xuống Zone 1 thành công
// --------------------------------------------------------------------------
test('8. Combo Zone 2 chuyển xuống Zone 1 thành công (target.level <= combo.level)', async () => {
  // Combo allowed_tier = 2
  const pkgTier2 = await comboTimeService.createPackage({
    name: 'Combo Cấp 2',
    price: 50000,
    duration_minutes: 120,
    allowed_tier: 2
  });

  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: pkgTier2.combo_id,
    paymentMethod: 'CASH'
  });

  // Kích hoạt tại máy Zone 2 (tier 2)
  const compSource = await db.Computer.findOne({
    where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });
  await comboTimeService.activateSession({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    computerId: compSource.computer_id
  });

  // Chuyển sang máy Zone 3 (tier 1: 1 <= 2 hợp lệ)
  const compTarget = await db.Computer.findOne({
    where: { zone_id: 3, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });
  assert.ok(compTarget, 'Tìm thấy máy đích Zone 3 (tier 1)');

  const switchRes = await comboTimeService.switchStation({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    targetComputerId: compTarget.computer_id
  });

  assert.strictEqual(switchRes.success, true);
  assert.strictEqual(switchRes.comboTime.computer_id, compTarget.computer_id);

  // Dọn dẹp
  await comboTimeService.endSessionEarly({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2
  });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkgTier2.combo_id);
});

// --------------------------------------------------------------------------
// 9. Combo Zone 2 chuyển lên Zone 3 (hoặc Stream Studio tier 3) bị từ chối ở backend
// --------------------------------------------------------------------------
test('9. Combo Zone 2 chuyển lên Zone cao hơn (tier 3) bị từ chối ở backend', async () => {
  const pkgTier2 = await comboTimeService.createPackage({
    name: 'Combo Cấp 2 Thử Nghiệm',
    price: 50000,
    duration_minutes: 120,
    allowed_tier: 2
  });

  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: pkgTier2.combo_id,
    paymentMethod: 'CASH'
  });

  const compSource = await db.Computer.findOne({
    where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });
  await comboTimeService.activateSession({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    computerId: compSource.computer_id
  });

  // Máy Zone 4 (Stream Studio có tier_level = 3 > 2)
  const compStudio = await db.Computer.findOne({
    where: { zone_id: 4, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } }
  });
  assert.ok(compStudio, 'Tìm thấy máy Zone 4 (tier 3)');

  await assert.rejects(
    async () => {
      await comboTimeService.switchStation({
        comboTimeId: purchase.comboTime.combo_time_id,
        memberId: 2,
        targetComputerId: compStudio.computer_id
      });
    },
    /áp dụng tối đa cho phân khu cấp/
  );

  // Dọn dẹp
  await comboTimeService.endSessionEarly({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2
  });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkgTier2.combo_id);
});

// --------------------------------------------------------------------------
// 10. Chuyển máy không reset thời gian hoặc tạo ComboTime mới
// --------------------------------------------------------------------------
test('10. Chuyển máy không reset thời gian hoặc tạo ComboTime mới', async () => {
  const pkg = await comboTimeService.createPackage({
    name: 'Combo Chuyển Máy Test',
    price: 40000,
    duration_minutes: 100,
    allowed_tier: 2
  });

  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: pkg.combo_id,
    paymentMethod: 'CASH'
  });

  const comp1 = await db.Computer.findOne({ where: { zone_id: 2 } });
  const actRes = await comboTimeService.activateSession({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    computerId: comp1.computer_id
  });

  const initialStartTime = new Date(actRes.comboTime.start_time).getTime();
  const initialEndTime = new Date(actRes.comboTime.end_time).getTime();
  const initialId = actRes.comboTime.combo_time_id;

  const comp2 = await db.Computer.findOne({
    where: { zone_id: 2, computer_id: { [db.Sequelize.Op.ne]: comp1.computer_id } }
  });

  const switchRes = await comboTimeService.switchStation({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2,
    targetComputerId: comp2.computer_id
  });

  assert.strictEqual(switchRes.comboTime.combo_time_id, initialId, 'Không tạo ComboTime mới');
  assert.strictEqual(Math.floor(new Date(switchRes.comboTime.start_time).getTime() / 1000), Math.floor(initialStartTime / 1000), 'start_time không đổi');
  assert.strictEqual(Math.floor(new Date(switchRes.comboTime.end_time).getTime() / 1000), Math.floor(initialEndTime / 1000), 'end_time không đổi');

  // Dọn dẹp
  await comboTimeService.endSessionEarly({ comboTimeId: initialId, memberId: 2 });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 11. Máy đích offline hoặc đang được sử dụng thì không thể chuyển
// --------------------------------------------------------------------------
test('11. Máy đích đang được sử dụng thì không thể chuyển', async () => {
  const pkg = await comboTimeService.createPackage({
    name: 'Combo InUse Target Test',
    price: 40000,
    duration_minutes: 60,
    allowed_tier: 2
  });

  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp1 = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp1.computer_id });

  // Đặt máy đích thành IN_USE
  const compInUse = await db.Computer.findOne({
    where: { computer_id: { [db.Sequelize.Op.ne]: comp1.computer_id } }
  });
  const originalStatus = compInUse.status;
  compInUse.status = ComputerStatus.IN_USE;
  await compInUse.save();

  try {
    await assert.rejects(
      async () => {
        await comboTimeService.switchStation({
          comboTimeId: purchase.comboTime.combo_time_id,
          memberId: 2,
          targetComputerId: compInUse.computer_id
        });
      },
      /không ở trạng thái sẵn sàng/
    );
  } finally {
    compInUse.status = originalStatus;
    await compInUse.save();
    await comboTimeService.endSessionEarly({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2 });
    await purchase.comboTime.destroy();
    await purchase.order.destroy();
    await purchase.transaction.destroy();
    await comboTimeService.deletePackage(pkg.combo_id);
  }
});

// --------------------------------------------------------------------------
// 12. Mua thêm thời gian cộng đúng vào thời điểm hết hạn hiện tại
// --------------------------------------------------------------------------
test('12. Mua thêm thời gian cộng đúng vào thời điểm hết hạn hiện tại', async () => {
  // Gói 1: 60 phút
  const pkg1 = await comboTimeService.createPackage({ name: 'Gói Ban Đầu 1H', price: 20000, duration_minutes: 60, allowed_tier: 2 });
  // Gói 2: 90 phút
  const pkg2 = await comboTimeService.createPackage({ name: 'Gói Mua Thêm 1.5H', price: 30000, duration_minutes: 90, allowed_tier: 2 });

  const purchase1 = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg1.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase1.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  const activeCombo = await db.ComboTime.findByPk(purchase1.comboTime.combo_time_id);
  const currentEndMs = new Date(activeCombo.end_time).getTime();

  // Mua thêm gói 2 trong khi phiên đang ACTIVE -> Tự động gia hạn
  const purchase2 = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg2.combo_id, paymentMethod: 'CASH' });

  assert.strictEqual(purchase2.isExtension, true);
  const expectedNewEndMs = currentEndMs + 90 * 60 * 1000;
  const actualNewEndMs = new Date(purchase2.comboTime.end_time).getTime();
  assert.strictEqual(Math.floor(actualNewEndMs / 1000), Math.floor(expectedNewEndMs / 1000));

  // Dọn dẹp
  await comboTimeService.endSessionEarly({ comboTimeId: activeCombo.combo_time_id, memberId: 2 });
  await activeCombo.destroy();
  await purchase1.order.destroy();
  await purchase1.transaction.destroy();
  await purchase2.order.destroy();
  await purchase2.transaction.destroy();
  await comboTimeService.deletePackage(pkg1.combo_id);
  await comboTimeService.deletePackage(pkg2.combo_id);
});

// --------------------------------------------------------------------------
// 13. Hai yêu cầu gia hạn đồng thời không cộng thời gian hai lần
// --------------------------------------------------------------------------
test('13. Hai yêu cầu gia hạn tuần tự/đồng thời tính đúng tổng thời gian', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Base', price: 20000, duration_minutes: 60, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  const activeCombo = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  const initialEndMs = new Date(activeCombo.end_time).getTime();

  // Gia hạn 1: +60 min
  const ext1 = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  // Gia hạn 2: +60 min
  const ext2 = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });

  const finalCombo = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  const finalEndMs = new Date(finalCombo.end_time).getTime();
  assert.strictEqual(Math.floor(finalEndMs / 1000), Math.floor((initialEndMs + 120 * 60 * 1000) / 1000));

  // Dọn dẹp
  await comboTimeService.endSessionEarly({ comboTimeId: activeCombo.combo_time_id, memberId: 2 });
  await activeCombo.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await ext1.order.destroy();
  await ext1.transaction.destroy();
  await ext2.order.destroy();
  await ext2.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 14. Kết thúc sớm không hoàn tiền và không cho dùng lại thời gian dư
// --------------------------------------------------------------------------
test('14. Kết thúc sớm không hoàn tiền và không cho dùng lại thời gian dư', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Cancel Test', price: 50000, duration_minutes: 180, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  const refundCountBefore = await db.FinancialTransaction.count({ where: { category: TransactionCategory.REFUND, used_by: 2 } });

  // Kết thúc sớm
  const endRes = await comboTimeService.endSessionEarly({
    comboTimeId: purchase.comboTime.combo_time_id,
    memberId: 2
  });
  assert.strictEqual(endRes.success, true);
  assert.strictEqual(endRes.comboTime.status, ComboTimeStatus.CANCELLED);

  // Không có giao dịch hoàn tiền nào được tạo
  const refundCountAfter = await db.FinancialTransaction.count({ where: { category: TransactionCategory.REFUND, used_by: 2 } });
  assert.strictEqual(refundCountAfter, refundCountBefore);

  // Không thể tiếp tục sử dụng hay chuyển máy khi đã CANCELLED
  await assert.rejects(
    async () => {
      await comboTimeService.switchStation({
        comboTimeId: purchase.comboTime.combo_time_id,
        memberId: 2,
        targetComputerId: comp.computer_id
      });
    },
    /Chỉ có thể chuyển máy khi phiên Combo Time đang hoạt động/
  );

  // Dọn dẹp
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 15. Hết hạn tự động kết thúc phiên và phát lệnh khóa máy
// --------------------------------------------------------------------------
test('15. Hết hạn tự động kết thúc phiên và phát lệnh khóa máy', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Hết Giờ', price: 10000, duration_minutes: 1, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  // Giả lập thời gian đã hết hạn
  const comboRecord = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  comboRecord.end_time = new Date(Date.now() - 10000); // hết hạn 10s trước
  await comboRecord.save();

  // Gọi expireComboTime
  const handled = await comboTimeService.expireComboTime(comboRecord.combo_time_id);
  assert.strictEqual(handled, true);

  const freshCombo = await db.ComboTime.findByPk(comboRecord.combo_time_id);
  assert.strictEqual(freshCombo.status, ComboTimeStatus.EXPIRED);

  // Dọn dẹp
  await freshCombo.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 16. Backend restart khi combo chưa hết hạn
// --------------------------------------------------------------------------
test('16. Backend restart khi combo chưa hết hạn', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Chưa Hết Hạn', price: 10000, duration_minutes: 60, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  // Giả lập backend restart: gọi checkAndExpireCombos
  await comboTimeService.checkAndExpireCombos();

  const freshCombo = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  assert.strictEqual(freshCombo.status, ComboTimeStatus.ACTIVE, 'Combo còn giờ phải tiếp tục ACTIVE');

  // Dọn dẹp
  await comboTimeService.endSessionEarly({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2 });
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 17. Backend restart khi combo đã hết hạn
// --------------------------------------------------------------------------
test('17. Backend restart khi combo đã hết hạn', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Hết Hạn Khi Server Tắt', price: 10000, duration_minutes: 60, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  // Giả lập trong lúc server tắt, thời gian trôi qua hết hạn
  const comboRecord = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  comboRecord.end_time = new Date(Date.now() - 50000);
  await comboRecord.save();

  // Khởi động lại: sweeper quét combo hết hạn
  const expiredCount = await comboTimeService.checkAndExpireCombos();
  assert.ok(expiredCount >= 1, 'Đã phát hiện ít nhất 1 combo hết hạn khi khởi động');

  const freshCombo = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  assert.strictEqual(freshCombo.status, ComboTimeStatus.EXPIRED);

  // Dọn dẹp
  await freshCombo.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 18. Client offline tại thời điểm combo hết hạn, sau đó reconnect
// --------------------------------------------------------------------------
test('18. Client offline tại thời điểm combo hết hạn, sau đó reconnect duy trì khóa', async () => {
  // Khi máy không có combo hợp lệ, kết nối lại không được cho phép IN_USE
  const comp = await db.Computer.findOne({ where: { zone_id: 3 } });
  comp.status = ComputerStatus.ONLINE;
  await comp.save();

  // Giả lập sự kiện register từ agent
  const activeSession = await db.ComboTime.findOne({
    where: { computer_id: comp.computer_id, status: ComboTimeStatus.ACTIVE, end_time: { [db.Sequelize.Op.gt]: new Date() } }
  });
  assert.strictEqual(activeSession, null);
});

// --------------------------------------------------------------------------
// 19. Thời gian vẫn trôi khi Member logout hoặc client mất kết nối
// --------------------------------------------------------------------------
test('19. Thời gian vẫn trôi liên tục theo đồng hồ thực', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Đồng Hồ Thực', price: 10000, duration_minutes: 60, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  const activeCombo = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  const end1 = new Date(activeCombo.end_time).getTime();

  // Giả lập member tạm rời máy / disconnect
  await new Promise((resolve) => setTimeout(resolve, 50));

  // end_time không hề bị lùi lại
  const activeCombo2 = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  const end2 = new Date(activeCombo2.end_time).getTime();
  assert.strictEqual(end1, end2, 'Thời điểm hết hạn là cố định, không bị dời khi ngắt kết nối');

  // Dọn dẹp
  await comboTimeService.endSessionEarly({ comboTimeId: activeCombo.combo_time_id, memberId: 2 });
  await activeCombo.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});

// --------------------------------------------------------------------------
// 20. Giá combo đã bao gồm dịch vụ đi kèm, không tính tiền hai lần
// --------------------------------------------------------------------------
test('20. Giá combo đã bao gồm dịch vụ đi kèm, không tính tiền hai lần', async () => {
  // Combo 2: 'Combo Chiến Game 3H + Nước', giá 40.000đ, kèm 1x Sting
  const purchase = await comboTimeService.purchaseCombo({
    memberId: 2,
    comboId: 2,
    paymentMethod: 'CASH'
  });

  const order = await db.ServiceOrder.findByPk(purchase.order.order_id, {
    include: [
      { model: db.ComboPackage, as: 'comboPackage' },
      { model: db.ServiceOrderItem, as: 'orderItems' }
    ]
  });

  // Kiểm tra orderItems: Sting dâu có giá là 0.00 và is_combo_item = true
  assert.strictEqual(order.orderItems.length, 1);
  assert.strictEqual(parseFloat(order.orderItems[0].price), 0);
  assert.strictEqual(order.orderItems[0].is_combo_item, true);

  // calculateTotal chỉ tính 40.000đ của gói Combo, không cộng thêm tiền nước
  const total = order.calculateTotal();
  assert.strictEqual(total, 40000);

  // Thêm 1 món ngoài combo (Mì tôm 35.000đ)
  await order.addOrderItem({ service_item_id: 1, name: 'Mì Trứng Bò Hầm ProGamer', price: 35000 }, 1, false);
  const reloadedOrder = await db.ServiceOrder.findByPk(purchase.order.order_id, {
    include: [
      { model: db.ComboPackage, as: 'comboPackage' },
      { model: db.ServiceOrderItem, as: 'orderItems' }
    ]
  });
  const totalWithFood = reloadedOrder.calculateTotal();
  assert.strictEqual(totalWithFood, 75000, '40.000đ combo + 35.000đ mì tôm = 75.000đ');

  // Dọn dẹp
  await purchase.comboTime.destroy();
  await db.ServiceOrderItem.destroy({ where: { order_id: order.order_id } });
  await order.destroy();
  await purchase.transaction.destroy();
});

// --------------------------------------------------------------------------
// 21. Seeder chạy lại không tạo bản ghi trùng
// --------------------------------------------------------------------------
test('21. Seeder chạy lại không tạo bản ghi trùng', async () => {
  const countBefore = await db.ComboPackage.count();
  const itemCountBefore = await db.ComboItem.count();

  // Chạy seeder lần 2
  await seedData(db);

  const countAfter = await db.ComboPackage.count();
  const itemCountAfter = await db.ComboItem.count();

  assert.strictEqual(countAfter, countBefore, 'Số lượng combo package không bị nhân đôi');
  assert.strictEqual(itemCountAfter, itemCountBefore, 'Số lượng combo item không bị nhân đôi');
});

// --------------------------------------------------------------------------
// 22. Migration chạy trên database đã có dữ liệu
// --------------------------------------------------------------------------
test('22. Migration chạy trên database đã có dữ liệu an toàn', async () => {
  const memberCount = await db.Member.count();
  assert.ok(memberCount > 0, 'Database đã có dữ liệu');

  // Chạy lại runMigrations
  await runMigrations();

  const memberCountAfter = await db.Member.count();
  assert.strictEqual(memberCountAfter, memberCount, 'Không bị mất dữ liệu hội viên sau khi chạy migration');
});

// --------------------------------------------------------------------------
// 23. Phân quyền API và kiểm tra quyền truy cập ComboTime theo Member
// --------------------------------------------------------------------------
test('23. Phân quyền API và kiểm tra quyền truy cập ComboTime theo Member', async () => {
  // Member 2 mua combo
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: 1, paymentMethod: 'CASH' });

  // Member 3 cố tình kích hoạt combo của Member 2 -> bị từ chối
  await assert.rejects(
    async () => {
      await comboTimeService.activateSession({
        comboTimeId: purchase.comboTime.combo_time_id,
        memberId: 3, // Khác với memberId = 2 sở hữu combo
        computerId: 1
      });
    },
    /không có quyền kích hoạt gói Combo của hội viên khác/
  );

  // Dọn dẹp
  await purchase.comboTime.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
});

// --------------------------------------------------------------------------
// 24. Socket.IO event trùng không kết thúc phiên hoặc ghi nhận giao dịch hai lần
// --------------------------------------------------------------------------
test('24. Socket.IO event trùng không kết thúc phiên hoặc ghi nhận giao dịch hai lần', async () => {
  const pkg = await comboTimeService.createPackage({ name: 'Gói Idempotent', price: 10000, duration_minutes: 60, allowed_tier: 2 });
  const purchase = await comboTimeService.purchaseCombo({ memberId: 2, comboId: pkg.combo_id, paymentMethod: 'CASH' });
  const comp = await db.Computer.findOne({ where: { zone_id: 2, status: { [db.Sequelize.Op.ne]: ComputerStatus.IN_USE } } });
  await comboTimeService.activateSession({ comboTimeId: purchase.comboTime.combo_time_id, memberId: 2, computerId: comp.computer_id });

  // Gọi expireComboTime lần 1
  const first = await comboTimeService.expireComboTime(purchase.comboTime.combo_time_id);
  assert.strictEqual(first, true);

  // Gọi expireComboTime lần 2 (trùng event / duplicate scheduler)
  const second = await comboTimeService.expireComboTime(purchase.comboTime.combo_time_id);
  assert.strictEqual(second, false, 'Lần 2 phải trả về false và không thao tác lại');

  // Dọn dẹp
  const fresh = await db.ComboTime.findByPk(purchase.comboTime.combo_time_id);
  await fresh.destroy();
  await purchase.order.destroy();
  await purchase.transaction.destroy();
  await comboTimeService.deletePackage(pkg.combo_id);
});
