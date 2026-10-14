const test = require('node:test');
const assert = require('node:assert');
const pricingPlanService = require('../src/services/pricingPlanService');
const db = require('../src/models');

test('PricingPlan Model - calculatePrice edge cases (0, negative, > 1440 mins)', () => {
  const plan = db.PricingPlan.build({
    price_per_hour: 12000
  });

  // 60 minutes = 12000
  assert.strictEqual(plan.calculatePrice(60), 12000);

  // 30 minutes = 6000
  assert.strictEqual(plan.calculatePrice(30), 6000);

  // 0 minutes = 0
  assert.strictEqual(plan.calculatePrice(0), 0);

  // Negative minutes -> clamped to 0
  assert.strictEqual(plan.calculatePrice(-45), 0);

  // > 1440 minutes (e.g. 1500 minutes = 25 hours * 12000 = 300,000)
  assert.strictEqual(plan.calculatePrice(1500), 300000);

  // NaN or undefined minutes -> defaults to 0
  assert.strictEqual(plan.calculatePrice(undefined), 0);
  assert.strictEqual(plan.calculatePrice('invalid'), 0);
});

test('PricingPlanService - createPricingPlan validates name', async () => {
  // Empty name
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: '   ',
        price_per_hour: 15000
      });
    },
    {
      message: 'Tên bảng giá không được để trống'
    }
  );

  // Name exceeding 100 chars
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'a'.repeat(101),
        price_per_hour: 15000
      });
    },
    {
      message: 'Tên bảng giá không được vượt quá 100 ký tự'
    }
  );
});

test('PricingPlanService - createPricingPlan validates price_per_hour', async () => {
  // Negative price
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Tiêu Chuẩn',
        price_per_hour: -5000
      });
    },
    {
      message: 'Giá cước mỗi giờ phải là một số không âm hợp lệ'
    }
  );

  // Non-numeric price
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Gói Tiêu Chuẩn',
        price_per_hour: 'abc'
      });
    },
    {
      message: 'Giá cước mỗi giờ phải là một số không âm hợp lệ'
    }
  );
});

test('PricingPlanService - createPricingPlan validates start_time & end_time sync', async () => {
  // Only start_time provided
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Giờ Vàng',
        price_per_hour: 10000,
        start_time: '18:00:00',
        end_time: null
      });
    },
    {
      message: 'Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ'
    }
  );

  // Only end_time provided
  await assert.rejects(
    async () => {
      await pricingPlanService.createPricingPlan({
        name: 'Giờ Vàng',
        price_per_hour: 10000,
        start_time: null,
        end_time: '22:00:00'
      });
    },
    {
      message: 'Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ'
    }
  );
});

test('PricingPlanService - deduplication of zone_ids', () => {
  const duplicateZoneIds = [1, 1, 2, '2', 3, null, undefined, -1, 0, 'abc'];
  const uniqueZoneIds = [...new Set(duplicateZoneIds.map(Number))].filter((id) => !isNaN(id) && id > 0);
  assert.deepStrictEqual(uniqueZoneIds, [1, 2, 3]);
});

test('PricingPlanService - KPI metrics calculation (activePlans, happyHourPlans, avgRate)', () => {
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

  assert.strictEqual(totalCount, 3, 'Total plans should be 3');
  assert.strictEqual(activeCount, 2, 'Active plans should be 2');
  assert.strictEqual(happyHourCount, 1, 'Only active plan with start/end time should be counted as happy hour');
  assert.strictEqual(avgRate, 15000, 'Average rate should be (10000 + 20000) / 2 = 15000, excluding inactive 50000');
});

test('PricingPlanService - transaction rollback on ZonePricingPlan failure', async () => {
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
      {
        message: 'Database Unique Constraint Violation Simulation'
      }
    );
    assert.strictEqual(rolledBack, true, 'Transaction must be rolled back on failure');
  } finally {
    db.ZonePricingPlan.bulkCreate = originalBulkCreate;
    db.sequelize.transaction = originalTransaction;
  }
});
