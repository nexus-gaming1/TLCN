const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../src/models');
const pricingPlanService = require('../../../src/services/pricingPlanService');
const { SessionType } = require('../../../src/constants/enums');

/**
 * ==============================================================================
 * BỘ KIỂM THỬ TÍCH HỢP HỆ THỐNG VỚI CƠ SỞ DỮ LIỆU MYSQL & SEQUELIZE ORM
 * (PRICING PLAN MODULE REAL DATABASE INTEGRATION TESTS)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. [INT-01] Ghi nhận thực tế vào MySQL (Tạo PricingPlan + ZonePricingPlan trong 1 transaction)
 * 2. [INT-02] Eager loading & Liên kết bảng ComputerZone trong CSDL thật
 * 3. [INT-03] ACID Transaction & Rollback: Hoàn tác 100% khi liên kết Zone gặp sự cố
 * 4. [INT-04] Cập nhật biểu phí, Giờ vàng (start_time, end_time) & Đổi trạng thái is_active
 * 5. [INT-05] Xóa an toàn và dọn dẹp liên kết ZonePricingPlan trong MySQL
 * ==============================================================================
 */

// Helper xóa an toàn dữ liệu test
async function cleanupPricingPlan(planId) {
  if (!planId) return;
  try {
    if (db.ZonePricingPlan) {
      await db.ZonePricingPlan.destroy({ where: { pricing_plan_id: planId } });
    }
    await db.PricingPlan.destroy({ where: { pricing_plan_id: planId } });
  } catch (_ignored) {
    // Ignore teardown errors
  }
}

test('[Pricing Plan Module] MySQL Database & Sequelize ORM Integration Suite', async (suite) => {
  // Đảm bảo kết nối DB sẵn sàng
  await db.sequelize.authenticate();

  const timestamp = Date.now();
  const testPlanName = `Bảng Giá Test IT ${timestamp}`;
  let createdPlanId = null;

  suite.after(async () => {
    if (createdPlanId) {
      await cleanupPricingPlan(createdPlanId);
    }
  });

  // ----------------------------------------------------------------------------
  // [INT-01] Ghi nhận thực tế vào bảng pricing_plans và zone_pricing_plans
  // ----------------------------------------------------------------------------
  await suite.test('[INT-01] [MySQL Persistence] Tạo mới bảng giá lưu vào MySQL kèm liên kết phân khu', async () => {
    const zone = await db.ComputerZone.findOne();
    assert.ok(zone, 'Database phải có ít nhất 1 ComputerZone để test');

    const newPlan = await pricingPlanService.createPricingPlan({
      name: testPlanName,
      price_per_hour: 15000,
      plan_type: SessionType.LOCAL,
      priority: 10,
      start_time: '08:00:00',
      end_time: '12:00:00',
      is_active: true,
      zone_ids: [zone.zone_id]
    });

    assert.ok(newPlan.pricing_plan_id, 'Phải sinh pricing_plan_id trong MySQL');
    createdPlanId = newPlan.pricing_plan_id;

    // Kiểm tra trực tiếp từ DB
    const persisted = await db.PricingPlan.findByPk(createdPlanId);
    assert.ok(persisted, 'Bản ghi phải tồn tại trong bảng pricing_plans');
    assert.strictEqual(persisted.name, testPlanName);
    assert.strictEqual(Number(persisted.price_per_hour), 15000);
    assert.strictEqual(persisted.is_active, true);
    assert.strictEqual(persisted.start_time, '08:00:00');
    assert.strictEqual(persisted.end_time, '12:00:00');
  });

  // ----------------------------------------------------------------------------
  // [INT-02] Eager loading & Liên kết ComputerZone trong MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-02] [Eager Loading] Lấy chi tiết bảng giá kèm danh sách phân khu ComputerZones', async () => {
    const fetched = await pricingPlanService.getPricingPlanById(createdPlanId);
    assert.ok(fetched, 'Phải tìm thấy bảng giá vừa tạo');
    assert.ok(Array.isArray(fetched.ComputerZones), 'Phải liên kết eager loading với ComputerZones');
    assert.ok(fetched.ComputerZones.length > 0, 'Phải có ít nhất 1 phân khu được gán');
  });

  // ----------------------------------------------------------------------------
  // [INT-03] ACID Transaction: Rollback khi có lỗi xảy ra
  // ----------------------------------------------------------------------------
  await suite.test('[INT-03] [ACID Rollback] Hoàn tác 100% nếu gán phân khu không tồn tại', async () => {
    const invalidPlanName = `Bảng Giá Lỗi Rollback ${Date.now()}`;

    await assert.rejects(
      async () => {
        await pricingPlanService.createPricingPlan({
          name: invalidPlanName,
          price_per_hour: 20000,
          zone_ids: [999999] // Zone ID không tồn tại gây vi phạm khóa ngoại
        });
      },
      /lỗi|foreign key|không tồn tại/i
    );

    // Xác minh bảng giá KHÔNG bị lưu dở dang (Atomic Guarantee)
    const checkOrphan = await db.PricingPlan.findOne({ where: { name: invalidPlanName } });
    assert.strictEqual(checkOrphan, null, 'Không được tạo bản ghi orphan khi transaction rollback');
  });

  // ----------------------------------------------------------------------------
  // [INT-04] Cập nhật thông số bảng giá, Giờ vàng & Toggle trạng thái
  // ----------------------------------------------------------------------------
  await suite.test('[INT-04] [MySQL Update & Toggle] Cập nhật mức giá, khung giờ vàng & bật tắt kích hoạt', async () => {
    // 1. Cập nhật biểu phí & giờ vàng
    const updated = await pricingPlanService.updatePricingPlan(createdPlanId, {
      price_per_hour: 18000,
      start_time: '13:00:00',
      end_time: '17:00:00'
    });
    assert.strictEqual(Number(updated.price_per_hour), 18000);
    assert.strictEqual(updated.start_time, '13:00:00');
    assert.strictEqual(updated.end_time, '17:00:00');

    // 2. Toggle trạng thái is_active
    const toggled = await pricingPlanService.togglePricingPlanStatus(createdPlanId, false);
    assert.strictEqual(toggled.is_active, false);

    const reloaded = await db.PricingPlan.findByPk(createdPlanId);
    assert.strictEqual(reloaded.is_active, false);
    assert.strictEqual(Number(reloaded.price_per_hour), 18000);
  });

  // ----------------------------------------------------------------------------
  // [INT-05] Xóa mềm bảng giá (Soft Delete) và Khôi phục (Restore) trong MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-05] [Soft Delete & Restore] Xóa mềm bảng giá và khôi phục an toàn toàn vẹn', async () => {
    // 1. Xóa mềm
    const deleted = await pricingPlanService.deletePricingPlan(createdPlanId);
    assert.strictEqual(deleted.success, true);

    // Xác minh bản ghi vẫn còn trong MySQL nhưng có cờ is_deleted = true và is_active = false
    const checkPlan = await db.PricingPlan.findByPk(createdPlanId);
    assert.ok(checkPlan, 'Bản ghi phải được bảo toàn trong MySQL (Soft Delete)');
    assert.strictEqual(checkPlan.is_deleted, true, 'is_deleted phải là true');
    assert.strictEqual(checkPlan.is_active, false, 'is_active phải tự động chuyển false');
    assert.ok(checkPlan.deleted_at, 'deleted_at phải ghi nhận mốc thời gian');

    // Xác minh getAllPricingPlans mặc định không trả về bản ghi đã xóa mềm
    const allActive = await pricingPlanService.getAllPricingPlans();
    const foundInActive = allActive.plans.some((p) => p.pricing_plan_id === createdPlanId);
    assert.strictEqual(foundInActive, false, 'Bảng giá đã xóa mềm không được hiển thị trong danh sách hoạt động');

    // 2. Khôi phục bảng giá (Restore)
    const restored = await pricingPlanService.restorePricingPlan(createdPlanId);
    assert.strictEqual(restored.success, true);

    const reloaded = await db.PricingPlan.findByPk(createdPlanId);
    assert.strictEqual(reloaded.is_deleted, false, 'is_deleted phải trở lại false');
    assert.strictEqual(reloaded.is_active, true, 'is_active phải trở lại true');
    assert.strictEqual(reloaded.deleted_at, null, 'deleted_at phải trở lại null');
  });
});
