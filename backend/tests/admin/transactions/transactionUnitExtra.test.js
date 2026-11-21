const test = require('node:test');
const assert = require('node:assert/strict');
const { TransactionService } = require('../../../src/services/transactionService');
const TransactionRepository = require('../../../src/repositories/transactionRepository');
const transactionController = require('../../../src/controllers/transactionController');
const transactionService = require('../../../src/services/transactionService');
const db = require('../../../src/models');
const { TransactionCategory, TransactionStatusEnum } = require('../../../src/constants/enums');

function createMockRes() {
  return {
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
}

// ============================================================================
// 1. COUNTER TOPUP / WITHDRAW / REFUND EDGE-CASE VALIDATION (UNIT)
// ============================================================================

test('TransactionService Unit - createTopUpTransaction & createWithdrawTransaction edge validations', async () => {
  const svc = new TransactionService(
    {
      runInTransaction: async (cb) => cb({}),
      create: async (d) => ({ transaction_id: 201, ...d })
    },
    {
      findMemberWithLock: async () => ({ member_id: 1, real_balance: 50000, point: 10, userInfo: { full_name: 'Gamer' } }),
      findMemberByIdentifierWithLock: async () => ({ member_id: 1, real_balance: 50000, point: 10, userInfo: { full_name: 'Gamer' } }),
      saveMember: async () => {}
    }
  );

  // Reject non-object/array, Infinity, overflow > 100M, invalid payment_method, XSS description
  for (const badPayload of [
    null,
    [],
    { member_id: 1, amount: Infinity, processed_by: 1 },
    { member_id: 1, amount: 200_000_000, processed_by: 1 },
    { member_id: 1, amount: 50000, processed_by: 1, payment_method: 'CRYPTO' },
    { member_id: 1, amount: 50000, processed_by: 1, description: '<script>alert(1)</script>' }
  ]) {
    await assert.rejects(() => svc.createTopUpTransaction(badPayload), (err) => err.statusCode === 400);
  }

  // Withdraw validations: invalid amount, missing member, missing processed_by, insufficient balance
  await assert.rejects(() => svc.createWithdrawTransaction({ member_id: 1, amount: 0, processed_by: 1 }), (err) => err.statusCode === 400);
  await assert.rejects(() => svc.createWithdrawTransaction({ amount: 10000, processed_by: 1 }), (err) => err.statusCode === 400);
  await assert.rejects(() => svc.createWithdrawTransaction({ member_id: 1, amount: 10000 }), (err) => err.statusCode === 400);
  await assert.rejects(() => svc.createWithdrawTransaction({ member_id: 1, amount: 90000, processed_by: 1 }), (err) => err.statusCode === 400 && err.message.includes('không đủ'));

  // Happy path withdraw + customer_identifier topup
  const withdrawTxn = await svc.createWithdrawTransaction({ member_id: 1, amount: 20000, processed_by: 2 });
  assert.strictEqual(withdrawTxn.amount, 20000);
  assert.strictEqual(withdrawTxn.category, TransactionCategory.MEMBER_WITHDRAW);

  const identifierTopUp = await svc.createTopUpTransaction({
    customer_identifier: '0912345678',
    amount: 30000,
    payment_method: 'vietqr',
    category: 'Nạp Giờ Chơi',
    processed_by: 2
  });
  assert.strictEqual(identifierTopUp.payment_method, 'VIETQR');
  assert.strictEqual(identifierTopUp.category, TransactionCategory.MEMBER_TOPUP);
});

test('TransactionService Unit - refundTransaction & getAllTransactions boundary/error handling', async () => {
  const svc = new TransactionService(
    {
      findAndCountAllWithAssociations: async () => { throw new Error('DB Connection Lost'); },
      getTodayKpiMetrics: async () => ({ totalRevenue: 100000, totalTxnCount: 2, successCount: 2 }),
      getYesterdayRevenue: async () => ({ yesterdayRevenue: 50000 }),
      runInTransaction: async (cb) => cb({})
    },
    {}
  );

  await assert.rejects(() => svc.refundTransaction('invalid', 'reason'), (err) => err.statusCode === 400);
  await assert.rejects(() => svc.refundTransaction(0, 'reason'), (err) => err.statusCode === 400);
  await assert.rejects(() => svc.refundTransaction(1, '<script>xss</script>'), (err) => err.statusCode === 400);
  await assert.rejects(() => svc.getAllTransactions({ page: 1, limit: 10 }), { message: 'DB Connection Lost' });

  // KPI growth calculation when yesterdayRevenue > 0
  const kpi = await svc.calculateFinancialKPIs();
  assert.strictEqual(kpi.vsYesterdayPercent, 100);
  assert.strictEqual(kpi.successRate, 100);
});

// ============================================================================
// 2. TRANSACTION REPOSITORY & MODEL UNIT TESTS
// ============================================================================

test('TransactionRepository Unit - filter normalization and pagination clamping', async () => {
  let capturedQuery = null;
  const repo = new TransactionRepository({
    FinancialTransaction: {
      findAndCountAll: async (q) => {
        capturedQuery = q;
        return { count: 0, rows: [] };
      }
    },
    Member: {},
    User: {},
    MembershipRank: {},
    sequelize: db.sequelize
  });

  await repo.findAndCountAllWithAssociations(
    { category: 'member_topup', paymentMethod: 'cash', status: 'completed', search: 'SEPAY123' },
    { page: 'invalid', limit: 999 }
  );

  assert.strictEqual(capturedQuery.where.category, 'MEMBER_TOPUP');
  assert.strictEqual(capturedQuery.where.payment_method, 'CASH');
  assert.strictEqual(capturedQuery.where.status, 'COMPLETED');
  assert.strictEqual(capturedQuery.limit, 100);
  assert.strictEqual(capturedQuery.offset, 0);
});

test('FinancialTransaction Model Unit - record() and cancel() persist helpers', async () => {
  const txn = db.FinancialTransaction.build({
    type: 'INCOME',
    category: TransactionCategory.MEMBER_TOPUP,
    amount: 50000,
    used_by: 1,
    status: TransactionStatusEnum.COMPLETED
  });
  let saveCalls = 0;
  txn.save = async function () {
    saveCalls += 1;
    return this;
  };

  await txn.record();
  assert.strictEqual(saveCalls, 1);

  await txn.cancel();
  assert.strictEqual(txn.category, TransactionCategory.REFUND);
  assert.strictEqual(saveCalls, 2);
});

// ============================================================================
// 3. TRANSACTION CONTROLLER FULL COVERAGE (INCLUDING WITHDRAW & NEXT(ERR))
// ============================================================================

test('TransactionController Unit - createWithdraw & error propagation to next()', async () => {
  const originals = {
    getAllTransactions: transactionService.getAllTransactions,
    createTopUpTransaction: transactionService.createTopUpTransaction,
    createWithdrawTransaction: transactionService.createWithdrawTransaction,
    refundTransaction: transactionService.refundTransaction
  };

  try {
    transactionService.createWithdrawTransaction = async (payload) => {
      assert.strictEqual(payload.processed_by, 7);
      return { transaction_id: 88, amount: payload.amount };
    };
    const resWithdraw = createMockRes();
    await transactionController.createWithdraw(
      { body: { member_id: 1, amount: 25000 }, user: { user_id: 7 } },
      resWithdraw,
      () => {}
    );
    assert.strictEqual(resWithdraw.statusCode, 201);
    assert.strictEqual(resWithdraw.body.data.transaction_id, 88);

    // Error forwarding across all 4 controller methods
    for (const [ctrlMethod, svcMethod] of Object.entries({
      getTransactions: 'getAllTransactions',
      createTopUp: 'createTopUpTransaction',
      createWithdraw: 'createWithdrawTransaction',
      refundTransaction: 'refundTransaction'
    })) {
      transactionService[svcMethod] = async () => {
        const err = new Error(`Fail ${svcMethod}`);
        err.statusCode = 400;
        throw err;
      };
      let passedErr = null;
      await transactionController[ctrlMethod](
        { params: { id: '1' }, query: {} },
        createMockRes(),
        (e) => { passedErr = e; }
      );
      assert.ok(passedErr && passedErr.message === `Fail ${svcMethod}`);
    }
  } finally {
    Object.assign(transactionService, originals);
  }
});

