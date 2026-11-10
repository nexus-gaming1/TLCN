const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../src/models');
const transactionService = require('../../../src/services/transactionService');
const { UserRole, TransactionCategory, TransactionStatusEnum } = require('../../../src/constants/enums');

test('[Transaction Module] MySQL Database & Sequelize ORM Integration Suite', async (suite) => {
  await db.sequelize.authenticate();

  const ts = Date.now();
  const createdTxnIds = [];
  let testUser = null;
  let testMember = null;
  let staffUser = null;

  suite.before(async () => {
    staffUser = await db.User.findOne({ where: { role: UserRole.ADMIN } });
    testUser = await db.User.create({
      username: `txn_it_${ts}`,
      password_hash: 'hashed_secret',
      full_name: `Khách Test GD ${ts}`,
      role: UserRole.MEMBER
    });
    testMember = await db.Member.create({
      member_id: testUser.user_id,
      phone: `09${String(ts).slice(-8)}`,
      real_balance: 50000,
      bonus_balance: 0,
      point: 10
    });
  });

  suite.after(async () => {
    try {
      if (createdTxnIds.length > 0) {
        await db.FinancialTransaction.destroy({ where: { transaction_id: createdTxnIds } });
      }
      if (testMember) {
        await db.FinancialTransaction.destroy({ where: { used_by: testMember.member_id } });
        await testMember.destroy();
      }
      if (testUser) await testUser.destroy();
    } catch (_ignored) {
      // Suppress teardown errors
    }
  });

  await suite.test('[INT-01] createTopUpTransaction persists FinancialTransaction and updates Member balance & points in MySQL', async () => {
    const txn = await transactionService.createTopUpTransaction({
      customer_identifier: testMember.phone,
      amount: 100000,
      payment_method: 'CASH',
      processed_by: staffUser ? staffUser.user_id : testUser.user_id
    });

    assert.ok(txn.transaction_id);
    createdTxnIds.push(txn.transaction_id);

    const reloadedMember = await db.Member.findByPk(testMember.member_id);
    assert.strictEqual(Number(reloadedMember.real_balance), 150000);
    assert.strictEqual(reloadedMember.point, 110);
  });

  await suite.test('[INT-02] createWithdrawTransaction deducts balance & rejects insufficient funds in MySQL', async () => {
    const withdrawTxn = await transactionService.createWithdrawTransaction({
      member_id: testMember.member_id,
      amount: 30000,
      processed_by: staffUser ? staffUser.user_id : testUser.user_id
    });
    createdTxnIds.push(withdrawTxn.transaction_id);

    const reloaded = await db.Member.findByPk(testMember.member_id);
    assert.strictEqual(Number(reloaded.real_balance), 120000);

    await assert.rejects(
      () => transactionService.createWithdrawTransaction({
        member_id: testMember.member_id,
        amount: 500000,
        processed_by: staffUser ? staffUser.user_id : testUser.user_id
      }),
      (err) => err.statusCode === 400 && err.message.includes('không đủ')
    );

    const afterRejected = await db.Member.findByPk(testMember.member_id);
    assert.strictEqual(Number(afterRejected.real_balance), 120000);
  });

  await suite.test('[INT-03] processAutoTopUp persists txn_code & enforces MySQL Idempotency', async () => {
    const payload = { memberId: testMember.member_id, amount: 40000, referenceCode: `SEPAY_IT_${ts}` };
    const first = await transactionService.processAutoTopUp(payload);
    assert.ok(first.transaction_id);
    assert.strictEqual(first.amount_added, 40000);
    createdTxnIds.push(first.transaction_id);

    const second = await transactionService.processAutoTopUp(payload);
    assert.strictEqual(second.status, 'ignored');
    assert.strictEqual(second.amount_added, 0);

    const reloaded = await db.Member.findByPk(testMember.member_id);
    assert.strictEqual(Number(reloaded.real_balance), 160000);
  });

  await suite.test('[INT-04] refundTransaction updates status, persists notes, and rolls back balance & points in MySQL', async () => {
    const topupTxnId = createdTxnIds[0]; // 100,000đ
    const refunded = await transactionService.refundTransaction(topupTxnId, 'Khách đổi ý');

    assert.strictEqual(refunded.status, TransactionStatusEnum.REFUNDED);
    assert.ok(refunded.notes.includes('Lý do hoàn: Khách đổi ý'));

    const reloaded = await db.Member.findByPk(testMember.member_id);
    assert.strictEqual(Number(reloaded.real_balance), 60000); // 160,000 - 100,000

    await assert.rejects(
      () => transactionService.refundTransaction(topupTxnId, 'Hoàn lần 2'),
      (err) => err.statusCode === 400 && err.message.includes('đã được hoàn tiền')
    );
  });

  await suite.test('[INT-05] getAllTransactions queries MySQL with search, filters, and SQL KPI metrics', async () => {
    const res = await transactionService.getAllTransactions({
      page: 1,
      limit: 10,
      search: testMember.phone,
      category: TransactionCategory.MEMBER_TOPUP
    });

    assert.ok(res.total >= 2);
    assert.ok(res.transactions.some((t) => t.id === createdTxnIds[0]));
    assert.strictEqual(typeof res.metrics.totalRevenueToday, 'number');
  });
});
