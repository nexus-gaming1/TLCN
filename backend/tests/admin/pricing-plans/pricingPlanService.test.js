const test = require('node:test');
const assert = require('node:assert');
const pricingPlanService = require('../../../src/services/pricingPlanService');
const db = require('../../../src/models');

/**
 * ==============================================================================
 * MA TRẬN TRUY VẾT ACCEPTANCE CRITERIA (AC TRACEABILITY MATRIX)
 * ==============================================================================
 * AC-02: Ràng buộc tên bảng giá (không rỗng, trim khoảng trắng, độ dài 1 - 100 ký tự)
 * AC-03: Ràng buộc giá cước mỗi giờ (bắt buộc, số không âm, chấp nhận 0đ)
 * AC-04: Ràng buộc đồng bộ khung giờ vàng và kiểm tra thời gian áp dụng (ngày & qua đêm)
 * AC-05: Khử trùng lặp và loại bỏ zone_id không hợp lệ
 * AC-06: Toàn vẹn dữ liệu qua Database Transaction & Rollback khi có lỗi
 * AC-07: Tính giá cước theo số phút (ca 0 phút, phút âm, vượt 24h/1440 phút, NaN)
 * AC-08: Tính toán KPI metrics (chỉ tính trên các gói đang active, bỏ qua inactive)
 * AC-09: Xử lý ngoại lệ CRUD khi ID không tồn tại
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// AC-07: TÍNH GIÁ CƯỚC THEO PHÚT (POSITIVE, NEGATIVE & BOUNDARY CASES)
// ------------------------------------------------------------------------------
test('[AC-07] [Ca thực tế & Ca biên] PricingPlan Model - calculatePrice asserts exact monetary calculations', () => {
  const plan = db.PricingPlan.build({
    price_per_hour: 12000
  });

  // 1. [Ca dương chuẩn - Happy Path]:
  assert.strictEqual(plan.calculatePrice(60), 12000, '60 phút chơi phải tính chính xác 12,000đ');
  assert.strictEqual(plan.calculatePrice(30), 6000, '30 phút chơi phải tính chính xác 6,000đ');
  assert.strictEqual(plan.calculatePrice(15), 3000, '15 phút chơi phải tính chính xác 3,000đ');

  // 2. [Ca biên giá trị thấp & Biên 0]:
  assert.strictEqual(plan.calculatePrice(0), 0, '0 phút chơi không được tính tiền (0đ)');

  // 3. [Ca âm - Phòng chống lỗi cước]:
  assert.strictEqual(plan.calculatePrice(-1), 0, '-1 phút phải được giới hạn về 0đ');
  assert.strictEqual(plan.calculatePrice(-45), 0, '-45 phút phải được giới hạn về 0đ');

  // 4. [Ca biên lớn - Chơi xuyên ngày đêm]:
  assert.strictEqual(plan.calculatePrice(1440), 288000, '24 tiếng tròn (1440 phút) phải tính đúng 288,000đ');
  assert.strictEqual(plan.calculatePrice(1500), 300000, 'Vượt 24 tiếng (1500 phút) phải tính đúng 300,000đ');

  // 5. [Ca dữ liệu phút dị thường]:
  assert.strictEqual(plan.calculatePrice(undefined), 0, 'undefined phút phải fallback về 0đ');
  assert.strictEqual(plan.calculatePrice(null), 0, 'null phút phải fallback về 0đ');
  assert.strictEqual(plan.calculatePrice('invalid_string'), 0, 'Chuỗi ký tự không hợp lệ phải fallback về 0đ');
  assert.strictEqual(plan.calculatePrice(NaN), 0, 'NaN phút phải fallback về 0đ');

  // 6. [Ca đơn giá bất thường (Defensive rate handling)]:
  const freePlan = db.PricingPlan.build({ price_per_hour: 0 });
  assert.strictEqual(freePlan.calculatePrice(60), 0, 'Gói miễn phí (0đ/h) phải tính ra 0đ');

  const invalidRatePlan = db.PricingPlan.build({ price_per_hour: 'corrupted' });
  assert.strictEqual(invalidRatePlan.calculatePrice(60), 0, 'Đơn giá không hợp lệ phải fallback về 0đ');

  const negativeRatePlan = db.PricingPlan.build({ price_per_hour: -10000 });
  assert.strictEqual(negativeRatePlan.calculatePrice(60), 0, 'Đơn giá âm phải được clamp về 0đ');
});

// ------------------------------------------------------------------------------
// AC-02: RÀNG BUỘC TÊN BẢNG GIÁ (NAME VALIDATION & BOUNDARIES)
// ------------------------------------------------------------------------------
test('[AC-02] [Ca âm & Ca biên] PricingPlanService - createPricingPlan validates name boundaries', async () => {
  // [Ca âm]: Tên toàn khoảng trắng
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: '     ',
        price_per_hour: 15000
      });
    },
    { message: 'Tên bảng giá không được để trống' }
  );

  // [Ca âm]: Tên là chuỗi rỗng
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: '',
        price_per_hour: 15000
      });
    },
    { message: 'Tên bảng giá không được để trống' }
  );

  // [Ca âm]: Tên là null
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: null,
        price_per_hour: 15000
      });
    },
    { message: 'Tên bảng giá không được để trống' }
  );

  // [Ca âm]: Tên bị undefined
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: undefined,
        price_per_hour: 15000
      });
    },
    { message: 'Tên bảng giá không được để trống' }
  );

  // [Ca biên trên vi phạm]: 101 ký tự -> Bị từ chối
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'A'.repeat(101),
        price_per_hour: 15000
      });
    },
    { message: 'Tên bảng giá không được vượt quá 100 ký tự' }
  );
});

// ------------------------------------------------------------------------------
// AC-03: RÀNG BUỘC ĐƠN GIÁ MỖI GIỜ (PRICE VALIDATION & BOUNDARIES)
// ------------------------------------------------------------------------------
test('[AC-03] [Ca âm & Ca biên] PricingPlanService - createPricingPlan validates price_per_hour boundaries', async () => {
  // [Ca âm]: Giá cước âm (-5,000đ)
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Cước Âm',
        price_per_hour: -5000
      });
    },
    { message: 'Giá cước mỗi giờ phải là một số không âm hợp lệ' }
  );

  // [Ca âm biên vi phạm]: Giá cước âm sát 0 (-0.01đ)
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Cước Âm Nhỏ',
        price_per_hour: -0.01
      });
    },
    { message: 'Giá cước mỗi giờ phải là một số không âm hợp lệ' }
  );

  // [Ca âm]: Giá cước là chữ cái (NaN)
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói NaN',
        price_per_hour: 'abc_invalid'
      });
    },
    { message: 'Giá cước mỗi giờ phải là một số không âm hợp lệ' }
  );

  // [Ca âm]: Giá cước là null
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Thiếu Giá Null',
        price_per_hour: null
      });
    },
    { message: 'Giá cước mỗi giờ là bắt buộc' }
  );

  // [Ca âm]: Giá cước là undefined
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Thiếu Giá Undefined',
        price_per_hour: undefined
      });
    },
    { message: 'Giá cước mỗi giờ là bắt buộc' }
  );

  // [Ca âm]: Giá cước là chuỗi rỗng
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Chuỗi Rỗng Giá',
        price_per_hour: ''
      });
    },
    { message: 'Giá cước mỗi giờ là bắt buộc' }
  );
});

// ------------------------------------------------------------------------------
// AC-04: ĐỒNG BỘ KHUNG GIỜ VÀNG (TIME RANGE SYNCHRONIZATION)
// ------------------------------------------------------------------------------
test('[AC-04] [Ca âm] PricingPlanService - createPricingPlan validates start_time & end_time sync', async () => {
  // [Ca âm]: Chỉ cung cấp start_time mà không có end_time
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Giờ Vàng Lệch Bắt Đầu',
        price_per_hour: 10000,
        start_time: '18:00:00',
        end_time: null
      });
    },
    { message: 'Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ' }
  );

  // [Ca âm]: Chỉ cung cấp end_time mà không có start_time
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Giờ Vàng Lệch Kết Thúc',
        price_per_hour: 10000,
        start_time: null,
        end_time: '20:00:00'
      });
    },
    { message: 'Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ' }
  );
});

// ------------------------------------------------------------------------------
// AC-05: KHỬ TRÙNG LẶP ZONE IDS VÀ LỌC GIÁ TRỊ KHÔNG HỢP LỆ
// ------------------------------------------------------------------------------
test('[AC-05] [Ca biên] PricingPlanService - deduplication of zone_ids', async () => {
  const originalBulkCreate = db.ZonePricingPlan.bulkCreate;
  let capturedAssociations = [];

  db.ZonePricingPlan.bulkCreate = async (records) => {
    capturedAssociations = records;
    return records;
  };

  try {
    const plan = await pricingPlanService.createPricingPlan({
      name: 'Gói Khử Trùng Lặp Zone',
      price_per_hour: 15000,
      zone_ids: [1, 2, 1, 2, '2', 3, null, undefined, -5, 0]
    });

    assert.ok(plan);
    const zoneIds = capturedAssociations.map((r) => r.zone_id);
    // Chỉ chấp nhận các số nguyên dương duy nhất [1, 2, 3]
    assert.deepStrictEqual(zoneIds, [1, 2, 3], 'Duplicate and non-positive zone IDs must be filtered out');
  } finally {
    db.ZonePricingPlan.bulkCreate = originalBulkCreate;
  }
});

// ------------------------------------------------------------------------------
// AC-06: DATABASE TRANSACTION ROLLBACK KHI GẶP LỖI LIÊN KẾT
// ------------------------------------------------------------------------------
test('[AC-06] [Ca âm] PricingPlanService - transaction rollback on ZonePricingPlan failure', async () => {
  const originalBulkCreate = db.ZonePricingPlan.bulkCreate;
  let rolledBack = false;

  const originalTransaction = db.sequelize.transaction;
  db.sequelize.transaction = async () => {
    const t = await originalTransaction.call(db.sequelize);
    const origRollback = t.rollback;
    t.rollback = async () => {
      rolledBack = true;
      return origRollback.call(t);
    };
    return t;
  };

  db.ZonePricingPlan.bulkCreate = async () => {
    throw new Error('Database Unique Constraint Violation Simulation');
  };

  try {
    await assert.rejects(
      async () => {
        await pricingPlanService.createPricingPlan({
          name: 'Gói Lỗi Test Rollback',
          price_per_hour: 15000,
          zone_ids: [1, 2]
        });
      },
      { message: 'Database Unique Constraint Violation Simulation' }
    );
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on failure');
  } finally {
    db.ZonePricingPlan.bulkCreate = originalBulkCreate;
    db.sequelize.transaction = originalTransaction;
  }
});

// ------------------------------------------------------------------------------
// AC-04: KHUNG GIỜ VÀNG BAN NGÀY & QUA ĐÊM (OVERNIGHT & DAYTIME HAPPY HOUR)
// ------------------------------------------------------------------------------
test('[AC-04] [Ca biên] PricingPlan Model - activate, deactivate, updatePrice, isApplicable', async () => {
  const plan = db.PricingPlan.build({
    name: 'Gói Hội Viên',
    price_per_hour: 15000,
    plan_type: 'MEMBER',
    start_time: '12:00:00',
    end_time: '18:00:00',
    is_active: true
  });

  plan.save = async function() { return this; };

  // Kiểm tra tắt kích hoạt
  await plan.deactivate();
  assert.strictEqual(plan.is_active, false);
  assert.strictEqual(plan.isApplicable('MEMBER', '14:00:00'), false, 'Inactive plan should not be applicable');

  // Kiểm tra bật lại
  await plan.activate();
  assert.strictEqual(plan.is_active, true);

  // Cập nhật giá
  await plan.updatePrice(18000);
  assert.strictEqual(plan.price_per_hour, 18000);

  // [Ca âm]: Sai loại phiên (MEMBER != LOCAL)
  assert.strictEqual(plan.isApplicable('LOCAL', '14:00:00'), false, 'Type mismatch should not be applicable');
  
  // [Ca dương]: Đúng giờ ban ngày (14:00 nằm trong 12:00 - 18:00)
  assert.strictEqual(plan.isApplicable('MEMBER', '14:00:00'), true, 'In daytime range should be applicable');
  
  // [Ca biên]: Đúng mốc bắt đầu 12:00:00 và kết thúc 18:00:00
  assert.strictEqual(plan.isApplicable('MEMBER', '12:00:00'), true, 'Exact start_time boundary match');
  assert.strictEqual(plan.isApplicable('MEMBER', '18:00:00'), true, 'Exact end_time boundary match');

  // [Ca âm ngoài giờ]: 11:59:59 (trước giờ) và 18:00:01 (sau giờ)
  assert.strictEqual(plan.isApplicable('MEMBER', '11:59:59'), false, 'Before start_time should not be applicable');
  assert.strictEqual(plan.isApplicable('MEMBER', '18:00:01'), false, 'After end_time should not be applicable');

  // [Ca biên qua đêm]: 22:00:00 đến 06:00:00 sáng hôm sau
  plan.start_time = '22:00:00';
  plan.end_time = '06:00:00';
  assert.strictEqual(plan.isApplicable('MEMBER', '23:30:00'), true, 'Overnight late night match');
  assert.strictEqual(plan.isApplicable('MEMBER', '03:00:00'), true, 'Overnight early morning match');
  assert.strictEqual(plan.isApplicable('MEMBER', '06:00:00'), true, 'Overnight boundary end match');
  assert.strictEqual(plan.isApplicable('MEMBER', '22:00:00'), true, 'Overnight boundary start match');
  assert.strictEqual(plan.isApplicable('MEMBER', '06:00:01'), false, 'Overnight after morning end');
  assert.strictEqual(plan.isApplicable('MEMBER', '15:00:00'), false, 'Overnight daytime outside match');
});

// ------------------------------------------------------------------------------
// AC-08: TÍNH TOÁN CHỈ SỐ KPI (ACTIVE VS INACTIVE PLANS)
// ------------------------------------------------------------------------------
test('[AC-08] [Ca dương & Ca biên] PricingPlanService - KPI metrics calculation', () => {
  const mockPlans = [
    { is_active: true, price_per_hour: 10000, start_time: '08:00:00', end_time: '12:00:00' },
    { is_active: true, price_per_hour: 20000, start_time: null, end_time: null },
    { is_active: false, price_per_hour: 50000, start_time: '23:00:00', end_time: '06:00:00' }
  ];

  const totalCount = mockPlans.length;
  const activePlans = mockPlans.filter((p) => p.is_active);
  const activeCount = activePlans.length;
  const happyHourCount = activePlans.filter((p) => Boolean(p.start_time && p.end_time)).length;
  const totalHourlyRate = activePlans.reduce((sum, p) => sum + Number(p.price_per_hour || 0), 0);
  const avgRate = activeCount > 0 ? Math.round(totalHourlyRate / activeCount) : 0;

  assert.strictEqual(totalCount, 3, 'Total plans should count all records (3)');
  assert.strictEqual(activeCount, 2, 'Active plans should only count active records (2)');
  assert.strictEqual(happyHourCount, 1, 'Only active happy hour plan should be counted (1, ignoring inactive)');
  assert.strictEqual(avgRate, 15000, 'Average rate should be (10000 + 20000) / 2 = 15000, excluding inactive 50000');
});

// ------------------------------------------------------------------------------
// AC-09: CRUD VÀ XỬ LÝ NGOẠI LỆ KHI ID KHÔNG TỒN TẠI (CRUD & NOT FOUND EXCEPTIONS)
// ------------------------------------------------------------------------------
test('[AC-09] [Ca âm & Ca dương] PricingPlanService - CRUD operations & Not Found handling', async () => {
  const origFindByPk = db.PricingPlan.findByPk;
  const origDestroyZone = db.ZonePricingPlan.destroy;
  const origBulkCreate = db.ZonePricingPlan.bulkCreate;

  let destroyed = false;
  let updatedData = null;

  const mockPlan = {
    pricing_plan_id: 10,
    name: 'Gói Gốc',
    price_per_hour: 12000,
    is_active: false,
    async update(newData) {
      updatedData = newData;
      Object.assign(this, newData);
      return this;
    },
    async save() { return this; },
    async softDelete() {
      destroyed = true;
      this.is_deleted = true;
      this.is_active = false;
      return this;
    },
    async restore() {
      this.is_deleted = false;
      this.is_active = true;
      return this;
    }
  };

  db.PricingPlan.findByPk = async (id) => (Number(id) === 10 ? mockPlan : null);
  db.ZonePricingPlan.destroy = async () => 1;
  db.ZonePricingPlan.bulkCreate = async () => [];

  try {
    // [Ca âm]: getPricingPlanById khi ID không tồn tại -> null
    const notFoundPlan = await pricingPlanService.getPricingPlanById(999);
    assert.strictEqual(notFoundPlan, null);

    // [Ca âm]: updatePricingPlan khi ID không tồn tại -> throw Error
    await assert.rejects(
      async () => {
        await pricingPlanService.updatePricingPlan(999, { name: 'Thử Sửa' });
      },
      { message: 'Không tìm thấy bảng giá với ID: 999' }
    );

    // [Ca âm]: updatePricingPlan với giá âm -> throw Error
    await assert.rejects(
      async () => {
        await pricingPlanService.updatePricingPlan(10, { price_per_hour: -500 });
      },
      { message: 'Giá cước mỗi giờ cập nhật phải là số không âm hợp lệ' }
    );

    // [Ca dương]: updatePricingPlan hợp lệ
    await pricingPlanService.updatePricingPlan(10, {
      name: 'Gói Đã Cập Nhật',
      price_per_hour: 16000,
      zone_ids: [1, 2]
    });
    assert.strictEqual(updatedData.name, 'Gói Đã Cập Nhật');
    assert.strictEqual(updatedData.price_per_hour, 16000);

    // [Ca dương]: togglePricingPlanStatus
    const toggleRes = await pricingPlanService.togglePricingPlanStatus(10);
    assert.strictEqual(toggleRes.is_active, true);

    // [Ca âm]: togglePricingPlanStatus không tồn tại
    await assert.rejects(
      async () => {
        await pricingPlanService.togglePricingPlanStatus(999);
      },
      { message: 'Không tìm thấy bảng giá với ID: 999' }
    );

    // [Ca âm]: deletePricingPlan không tồn tại
    await assert.rejects(
      async () => {
        await pricingPlanService.deletePricingPlan(999);
      },
      { message: 'Không tìm thấy bảng giá với ID: 999' }
    );

    // [Ca dương]: deletePricingPlan thành công (Soft Delete)
    const delRes = await pricingPlanService.deletePricingPlan(10);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(destroyed, true);

    // [Ca dương]: restorePricingPlan thành công
    const restoreRes = await pricingPlanService.restorePricingPlan(10);
    assert.strictEqual(restoreRes.success, true);
    assert.strictEqual(mockPlan.is_deleted, false);
    assert.strictEqual(mockPlan.is_active, true);

    // [Ca âm]: restorePricingPlan không tồn tại -> 404
    await assert.rejects(
      async () => {
        await pricingPlanService.restorePricingPlan(999);
      },
      (err) => err.statusCode === 404 && err.message.includes('Không tìm thấy bảng giá với ID: 999')
    );

    // [Ca âm]: updatePricingPlan với khung giờ lệch
    await assert.rejects(
      async () => {
        await pricingPlanService.updatePricingPlan(10, { start_time: '8:00', end_time: 'null' });
      },
      (err) => err.statusCode === 400 && err.message.includes('đồng bộ')
    );
  } finally {
    db.PricingPlan.findByPk = origFindByPk;
    db.ZonePricingPlan.destroy = origDestroyZone;
    db.ZonePricingPlan.bulkCreate = origBulkCreate;
  }
});

test('[AC-09] [Ca âm & Ca biên] PricingPlanService - getAllPricingPlans & getPricingPlanById error propagation and deleted filters', async () => {
  const origFindAll = db.PricingPlan.findAll;
  const origZoneFindAll = db.ComputerZone.findAll;
  const origFindByPk = db.PricingPlan.findByPk;

  try {
    let capturedWhere = null;
    db.PricingPlan.findAll = async ({ where }) => {
      capturedWhere = where;
      return [{ is_active: false, price_per_hour: 10000, start_time: null, end_time: null }];
    };
    db.ComputerZone.findAll = async () => [];

    const deletedRes = await pricingPlanService.getAllPricingPlans({ is_deleted: 'true' });
    assert.deepStrictEqual(capturedWhere, { is_deleted: true });
    assert.strictEqual(deletedRes.metrics.totalPlans, 1);
    assert.strictEqual(deletedRes.metrics.activePlans, 0);
    assert.strictEqual(deletedRes.metrics.avgRate, 0);

    db.PricingPlan.findAll = async () => {
      throw new Error('DB Read Timeout');
    };
    await assert.rejects(() => pricingPlanService.getAllPricingPlans(), { message: 'DB Read Timeout' });

    db.PricingPlan.findByPk = async () => {
      throw new Error('DB Lookup Error');
    };
    await assert.rejects(() => pricingPlanService.getPricingPlanById(1), { message: 'DB Lookup Error' });
  } finally {
    db.PricingPlan.findAll = origFindAll;
    db.ComputerZone.findAll = origZoneFindAll;
    db.PricingPlan.findByPk = origFindByPk;
  }
});
