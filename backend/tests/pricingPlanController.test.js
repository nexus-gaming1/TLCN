const test = require('node:test');
const assert = require('node:assert/strict');
const pricingPlanController = require('../src/controllers/pricingPlanController');
const pricingPlanService = require('../src/services/pricingPlanService');

/**
 * ==============================================================================
 * MA TRẬN TRUY VẾT ACCEPTANCE CRITERIA:
 * AC-09: Chuẩn hóa HTTP Response Format & Xử lý mã lỗi (Controller Layer)
 * - HTTP 200/201: Chuẩn ApiResponse { status: 'success', data, message }
 * - HTTP 404: Báo lỗi khi tài nguyên không tồn tại { status: 'error', message }
 * - Error propagation: Chuyển tiếp lỗi hệ thống sang next(error) cho Centralized Error Handler
 * ==============================================================================
 */

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

test('[AC-09] [Ca dương] pricingPlanController - getPricingPlans returns 200 and formatted response', async () => {
  const orig = pricingPlanService.getAllPricingPlans;
  pricingPlanService.getAllPricingPlans = async () => ({
    plans: [{ pricing_plan_id: 1, name: 'Standard' }],
    zones: [{ zone_id: 1, zone_name: 'VIP' }],
    metrics: { totalPlans: 1, activePlans: 1, happyHourPlans: 0, avgRate: 10000 }
  });

  try {
    const req = {};
    const res = createMockRes();
    let nextCalled = false;
    await pricingPlanController.getPricingPlans(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.zones.length, 1);
    assert.strictEqual(nextCalled, false);
  } finally {
    pricingPlanService.getAllPricingPlans = orig;
  }
});

test('[AC-09] [Ca âm] pricingPlanController - getPricingPlans forwards error to next()', async () => {
  const orig = pricingPlanService.getAllPricingPlans;
  pricingPlanService.getAllPricingPlans = async () => {
    throw new Error('Database Connection Lost');
  };

  try {
    const req = {};
    const res = createMockRes();
    let passedError = null;
    await pricingPlanController.getPricingPlans(req, res, (err) => { passedError = err; });

    assert.ok(passedError);
    assert.strictEqual(passedError.message, 'Database Connection Lost');
  } finally {
    pricingPlanService.getAllPricingPlans = orig;
  }
});

test('[AC-09] [Ca dương & Ca âm] pricingPlanController - getPricingPlanById success (200) and not found (404)', async () => {
  const orig = pricingPlanService.getPricingPlanById;

  try {
    // [Ca dương]: Tìm thấy
    pricingPlanService.getPricingPlanById = async (id) => ({
      pricing_plan_id: Number(id),
      name: 'Standard'
    });
    const req = { params: { id: '1' } };
    const res = createMockRes();
    await pricingPlanController.getPricingPlanById(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.pricing_plan_id, 1);

    // [Ca âm]: Không tìm thấy -> 404
    pricingPlanService.getPricingPlanById = async () => null;
    const res404 = createMockRes();
    await pricingPlanController.getPricingPlanById(req, res404, () => {});
    assert.strictEqual(res404.statusCode, 404);
    assert.strictEqual(res404.body.status, 'error');
  } finally {
    pricingPlanService.getPricingPlanById = orig;
  }
});

test('[AC-09] [Ca dương] pricingPlanController - createPricingPlan returns 201 Created', async () => {
  const orig = pricingPlanService.createPricingPlan;
  pricingPlanService.createPricingPlan = async (data) => ({
    pricing_plan_id: 10,
    ...data
  });

  try {
    const req = { body: { name: 'VIP Plan', price_per_hour: 20000 } };
    const res = createMockRes();
    await pricingPlanController.createPricingPlan(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.name, 'VIP Plan');
  } finally {
    pricingPlanService.createPricingPlan = orig;
  }
});

test('[AC-09] [Ca dương & Ca âm] pricingPlanController - updatePricingPlan success (200) and not found (404)', async () => {
  const orig = pricingPlanService.updatePricingPlan;

  try {
    // [Ca dương]: Cập nhật thành công
    pricingPlanService.updatePricingPlan = async (id, data) => ({
      pricing_plan_id: Number(id),
      ...data
    });
    const req = { params: { id: '5' }, body: { price_per_hour: 25000 } };
    const res = createMockRes();
    await pricingPlanController.updatePricingPlan(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.price_per_hour, 25000);

    // [Ca âm]: Không tìm thấy bảng giá -> 404
    pricingPlanService.updatePricingPlan = async () => null;
    const res404 = createMockRes();
    await pricingPlanController.updatePricingPlan(req, res404, () => {});
    assert.strictEqual(res404.statusCode, 404);
  } finally {
    pricingPlanService.updatePricingPlan = orig;
  }
});

test('[AC-09] [Ca dương & Ca âm] pricingPlanController - togglePricingPlanStatus success (200) and not found (404)', async () => {
  const orig = pricingPlanService.togglePricingPlanStatus;

  try {
    // [Ca dương]: Bật/tắt thành công
    pricingPlanService.togglePricingPlanStatus = async (id, isActive) => ({
      pricing_plan_id: Number(id),
      is_active: isActive
    });
    const req = { params: { id: '2' }, body: { is_active: true } };
    const res = createMockRes();
    await pricingPlanController.togglePricingPlanStatus(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.is_active, true);

    // [Ca âm]: Không tìm thấy -> 404
    pricingPlanService.togglePricingPlanStatus = async () => null;
    const res404 = createMockRes();
    await pricingPlanController.togglePricingPlanStatus(req, res404, () => {});
    assert.strictEqual(res404.statusCode, 404);
  } finally {
    pricingPlanService.togglePricingPlanStatus = orig;
  }
});

test('[AC-09] [Ca dương] pricingPlanController - deletePricingPlan returns 200 on success', async () => {
  const orig = pricingPlanService.deletePricingPlan;
  pricingPlanService.deletePricingPlan = async () => ({ success: true });

  try {
    const req = { params: { id: '3' } };
    const res = createMockRes();
    await pricingPlanController.deletePricingPlan(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
  } finally {
    pricingPlanService.deletePricingPlan = orig;
  }
});
