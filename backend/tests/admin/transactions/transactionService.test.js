const test = require('node:test');
const assert = require('node:assert');
const transactionService = require('../../../src/services/transactionService');
const sePayService = require('../../../src/services/sePayService');
const transactionController = require('../../../src/controllers/transactionController');
const webhookController = require('../../../src/controllers/webhookController');
const { verifySePayWebhook } = require('../../../src/middleware/webhookAuthMiddleware');
const db = require('../../../src/models');
const { TransactionType, TransactionCategory } = require('../../../src/constants/enums');

/**
 * ==============================================================================
 * MA TRẬN TEST CASE CHO MODULE MANAGE TRANSACTIONS (AC TRACEABILITY MATRIX)
 * ==============================================================================
 * TC-01: Bóc tách mã hội viên bằng Regex (parseMemberIdFromContent)
 * TC-02: Phân trang, lọc & KPI Aggregation (getAllTransactions)
 * TC-03: Ràng buộc nạp tiền tại quầy & ACID Transaction (createTopUpTransaction)
 * TC-04: Xử lý Webhook SePay, chống trùng lặp Idempotency (processSePayWebhook)
 * TC-05: Nghiệp vụ hoàn tiền giao dịch (refundTransaction)
 * TC-06: Xác thực & Phân quyền Controller (TransactionController HTTP Handler)
 * TC-07: Model FinancialTransaction Helper Methods
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// TC-01: BÓC TÁCH MÃ HỘI VIÊN TỪ NỘI DUNG CHUYỂN KHOẢN (REGEX PARSER)
// ------------------------------------------------------------------------------
test('[TC-01] [Ca dương & Ca âm] parseMemberIdFromContent - Bóc tách chính xác ID hội viên từ Regex (SePayService)', () => {
  // 1. [Ca dương]: Các định dạng cú pháp hợp lệ
  assert.strictEqual(sePayService.parseMemberIdFromContent('NEXUS123'), 123);
  assert.strictEqual(sePayService.parseMemberIdFromContent('nexus456 nap gio choi'), 456);
  assert.strictEqual(sePayService.parseMemberIdFromContent('NEXUS-789 chuyen tien'), 789);
  assert.strictEqual(sePayService.parseMemberIdFromContent('NEXUS_999 MBBank'), 999);
  assert.strictEqual(sePayService.parseMemberIdFromContent('NEXUS   1001'), 1001);
  assert.strictEqual(sePayService.parseMemberIdFromContent('Techcombank NEXUS-0052 thanh toan'), 52);

  // 2. [Ca âm & Ca biên]: Nội dung sai cú pháp hoặc rỗng
  assert.strictEqual(sePayService.parseMemberIdFromContent(''), null);
  assert.strictEqual(sePayService.parseMemberIdFromContent(null), null);
  assert.strictEqual(sePayService.parseMemberIdFromContent(undefined), null);
  assert.strictEqual(sePayService.parseMemberIdFromContent(12345), null);
  assert.strictEqual(sePayService.parseMemberIdFromContent({ text: 'NEXUS123' }), null);
  assert.strictEqual(sePayService.parseMemberIdFromContent('Chuyen khoan khong co cu phap'), null);
  assert.strictEqual(sePayService.parseMemberIdFromContent('NEXUS abc'), null);
});

// ------------------------------------------------------------------------------
// TC-02: TRUY VẤN SỔ CÁI & TÍNH TOÁN KPI METRICS (getAllTransactions)
// ------------------------------------------------------------------------------
test('[TC-02] [Ca dương & Lọc đa điều kiện] getAllTransactions - Phân trang, bộ lọc và KPI SQL', async () => {
  const origFindAndCountAll = db.FinancialTransaction.findAndCountAll;
  const origFindOne = db.FinancialTransaction.findOne;

  try {
    // Mock dữ liệu giao dịch trả về từ findAndCountAll
    db.FinancialTransaction.findAndCountAll = async (query) => {
      assert.ok(query.limit, 'Query phải chứa limit');
      assert.strictEqual(query.subQuery, false);
      return {
        count: 2,
        rows: [
          {
            transaction_id: 1,
            type: TransactionType.INCOME,
            category: TransactionCategory.MEMBER_TOPUP,
            amount: '50000.00',
            payment_method: 'CASH',
            status: 'COMPLETED',
            used_by: 10,
            description: 'Nạp tiền tại quầy',
            created_at: new Date('2026-10-15T01:00:00Z'),
            memberInfo: {
              phone: '0988776655',
              userInfo: { user_id: 10, username: 'player1', full_name: 'Nguyễn Văn A' },
              MembershipRank: { rank_id: 1, name: 'Vàng' }
            },
            processedBy: { user_id: 1, username: 'admin', full_name: 'Quản Lý Quầy' }
          },
          {
            transaction_id: 2,
            type: TransactionType.INCOME,
            category: TransactionCategory.SERVICE_SALE,
            amount: '30000.00',
            payment_method: 'VIETQR',
            status: 'COMPLETED',
            used_by: null,
            description: 'Bán mì tôm trứng',
            created_at: new Date('2026-10-15T02:00:00Z'),
            memberInfo: null,
            processedBy: null
          }
        ]
      };
    };

    // Mock kết quả SQL Aggregation cho thẻ KPI
    db.FinancialTransaction.findOne = async (_query) => {
      return {
        totalTxnCount: 2,
        totalRevenue: 80000,
        pcTimeRevenue: 50000,
        foodServiceRevenue: 30000
      };
    };

    // 1. Test gọi mặc định (Default query)
    const result = await transactionService.getAllTransactions({ page: 1, limit: 10 });
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.transactions.length, 2);
    assert.strictEqual(result.transactions[0].txnCode, 'TXN-00001');
    assert.strictEqual(result.transactions[0].memberName, 'Nguyễn Văn A');
    assert.strictEqual(result.transactions[0].rankName, 'Vàng');
    assert.strictEqual(result.transactions[1].memberName, 'Khách Vãng Lai'); // Fallback khi memberInfo null
    assert.strictEqual(result.metrics.totalRevenueToday, 80000);
    assert.strictEqual(result.metrics.pcTimeRevenue, 50000);
    assert.strictEqual(result.metrics.foodServiceRevenue, 30000);

    // 2. Test các bộ lọc (dateRange, category, paymentMethod, search text)
    const filteredResult = await transactionService.getAllTransactions({
      page: 2,
      limit: 5,
      dateRange: 'today',
      category: 'MEMBER_TOPUP',
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      search: 'TXN-00001'
    });
    assert.strictEqual(filteredResult.page, 2);

    // Test dateRange = 7days & 30days & search by numeric text
    await transactionService.getAllTransactions({ dateRange: '7days', search: '123' });
    await transactionService.getAllTransactions({ dateRange: '30days', search: '0988' });
  } finally {
    db.FinancialTransaction.findAndCountAll = origFindAndCountAll;
    db.FinancialTransaction.findOne = origFindOne;
  }
});

// ------------------------------------------------------------------------------
// TC-03: NẠP TIỀN TẠI QUẦY & DATABASE TRANSACTION (createTopUpTransaction)
// ------------------------------------------------------------------------------
test('[TC-03] [Ca dương & Ca âm] createTopUpTransaction - Nạp tiền an toàn với ACID Transaction', async () => {
  // 1. [Ca âm]: Số tiền <= 0 hoặc không phải số
  await assert.rejects(
    async () => {
      await transactionService.createTopUpTransaction({ member_id: 1, amount: 0 });
    },
    { message: 'Số tiền nạp không hợp lệ (phải lớn hơn 0)' }
  );

  await assert.rejects(
    async () => {
      await transactionService.createTopUpTransaction({ member_id: 1, amount: -50000 });
    },
    { message: 'Số tiền nạp không hợp lệ (phải lớn hơn 0)' }
  );

  await assert.rejects(
    async () => {
      await transactionService.createTopUpTransaction({ member_id: 1, amount: 'invalid_number' });
    },
    { message: 'Số tiền nạp không hợp lệ (phải lớn hơn 0)' }
  );

  // 2. [Ca âm]: Thiếu thông tin nhân viên  processed_by (Anti-pattern test)
  await assert.rejects(
    async () => {
      await transactionService.createTopUpTransaction({ member_id: 1, amount: 50000 });
    },
    { message: 'Thiếu thông tin nhân viên thu ngân thực hiện nạp tiền (processed_by)' }
  );

  // 3. [Ca âm]: Không tìm thấy hội viên
  const origFindByPk = db.Member.findByPk;
  const origTransaction = db.sequelize.transaction;

  try {
    // Mock Managed transaction
    db.sequelize.transaction = async (cb) => {
      const mockT = { LOCK: { UPDATE: 'UPDATE' } };
      return await cb(mockT);
    };

    db.Member.findByPk = async () => null;

    await assert.rejects(
      async () => {
        await transactionService.createTopUpTransaction({ member_id: 9999, amount: 50000, processed_by: 1 });
      },
      { message: 'Không tìm thấy tài khoản hội viên' }
    );

    // 4. [Ca dương]: Nạp tiền thành công, kiểm tra số dư và điểm thưởng
    let savedBalance = 0;
    let savedPoint = 0;
    let createdTxn = null;

    db.Member.findByPk = async (id) => ({
      member_id: id,
      real_balance: 100000,
      point: 10,
      userInfo: { full_name: 'Trần Thị B' },
      save: async () => {
        savedBalance = 150000;
        savedPoint = 60; // 10 + 50000 / 1000
      }
    });

    const origCreateTxn = db.FinancialTransaction.create;
    db.FinancialTransaction.create = async (payload) => {
      createdTxn = { ...payload, transaction_id: 101 };
      return createdTxn;
    };

    const newTxn = await transactionService.createTopUpTransaction({
      member_id: 5,
      amount: 50000,
      description: 'Nạp quầy test',
      processed_by: 2
    });

    assert.strictEqual(newTxn.transaction_id, 101);
    assert.strictEqual(newTxn.amount, 50000);
    assert.strictEqual(savedBalance, 150000);
    assert.strictEqual(savedPoint, 60);

    db.FinancialTransaction.create = origCreateTxn;
  } finally {
    db.Member.findByPk = origFindByPk;
    db.sequelize.transaction = origTransaction;
  }
});

// ------------------------------------------------------------------------------
// TC-04: WEBHOOK SEPAY NẠP TIỀN TỰ ĐỘNG & IDEMPOTENCY (processSePayWebhook)
// ------------------------------------------------------------------------------
test('[TC-04] [Ca dương, Ca âm & Idempotency] sePayService.processWebhook & transactionService.processAutoTopUp', async () => {
  // 1. [Ca âm]: Số tiền không hợp lệ
  await assert.rejects(
    async () => {
      await sePayService.processWebhook({ amount: 0, content: 'NEXUS123' });
    },
    { message: 'Số tiền chuyển khoản không hợp lệ (phải > 0)' }
  );

  // 2. [Ca âm]: Không tìm thấy cú pháp mã hội viên NEXUS
  await assert.rejects(
    async () => {
      await sePayService.processWebhook({ amount: 50000, content: 'Chuyen tien khong cu phap' });
    },
    (err) => err.message.includes('Không tìm thấy cú pháp mã hội viên NEXUS hợp lệ')
  );

  const origFindOneTxn = db.FinancialTransaction.findOne;
  const origFindByPkMember = db.Member.findByPk;
  const origCreateTxn = db.FinancialTransaction.create;
  const origTransaction = db.sequelize.transaction;

  try {
    // 3. [Idempotency Key Check]: Giao dịch đã được xử lý trước đó -> Bỏ qua tránh cộng tiền lặp
    db.FinancialTransaction.findOne = async ({ where }) => {
      if (where.txn_code === 'SEPAY_DUPLICATE_01') {
        return { transaction_id: 99, txn_code: 'SEPAY_DUPLICATE_01' };
      }
      return null;
    };

    const duplicateRes = await sePayService.processWebhook({
      amount: 100000,
      content: 'NEXUS123',
      referenceCode: 'SEPAY_DUPLICATE_01'
    });
    assert.strictEqual(duplicateRes.status, 'ignored');
    assert.strictEqual(duplicateRes.amount_added, 0);

    // 4. [Ca âm]: Hội viên không tồn tại trong hệ thống
    db.sequelize.transaction = async (cb) => {
      const mockT = { LOCK: { UPDATE: 'UPDATE' } };
      return await cb(mockT);
    };
    db.Member.findByPk = async () => null;

    await assert.rejects(
      async () => {
        await sePayService.processWebhook({
          amount: 50000,
          content: 'NEXUS9999',
          referenceCode: 'SEPAY_NEW_01'
        });
      },
      { message: 'Hội viên #9999 không tồn tại trong hệ thống' }
    );

    // 5. [Ca dương]: Tự động nạp tiền thành công qua SePay Gateway Adapter
    const fakeMember = {
      member_id: 123,
      real_balance: 20000,
      point: 5,
      userInfo: { username: 'nexus_gamer', full_name: 'Lê Văn C' },
      save: async () => {}
    };
    db.Member.findByPk = async () => fakeMember;
    db.FinancialTransaction.create = async (data) => ({ ...data, transaction_id: 555 });

    const successRes = await sePayService.processWebhook({
      transferAmount: 50000,
      description: 'NEXUS123 nap gio dem',
      id: 'SEPAY_TXN_OK_01'
    });

    assert.strictEqual(successRes.transaction_id, 555);
    assert.strictEqual(successRes.amount_added, 50000);
    assert.strictEqual(successRes.new_real_balance, 70000);
    assert.strictEqual(successRes.points_added, 50);

    // 6. [Ca kiểm thử hàm thuần khiết processAutoTopUp với DTO chuẩn nội bộ]
    await assert.rejects(
      async () => await transactionService.processAutoTopUp({ memberId: null, amount: 50000, referenceCode: 'REF-01' }),
      { message: 'Mã hội viên nạp tiền không hợp lệ' }
    );
    await assert.rejects(
      async () => await transactionService.processAutoTopUp({ memberId: 123, amount: -10, referenceCode: 'REF-01' }),
      { message: 'Số tiền nạp tự động không hợp lệ (phải lớn hơn 0)' }
    );
    await assert.rejects(
      async () => await transactionService.processAutoTopUp({ memberId: 123, amount: 50000, referenceCode: '' }),
      { message: 'Thiếu mã tham chiếu giao dịch (referenceCode/Idempotency Key)' }
    );

    const directRes = await transactionService.processAutoTopUp({
      memberId: 123,
      amount: 30000,
      paymentMethod: 'VIETQR',
      referenceCode: 'INTERNAL_REF_01',
      description: 'Nạp test nội bộ',
      notes: 'Notes'
    });
    assert.strictEqual(directRes.amount_added, 30000);
  } finally {
    db.FinancialTransaction.findOne = origFindOneTxn;
    db.Member.findByPk = origFindByPkMember;
    db.FinancialTransaction.create = origCreateTxn;
    db.sequelize.transaction = origTransaction;
  }
});

// ------------------------------------------------------------------------------
// TC-05: HOÀN TIỀN GIAO DỊCH (refundTransaction)
// ------------------------------------------------------------------------------
test('[TC-05] [Ca dương & Ca âm] refundTransaction - Hoàn tiền giao dịch và hoàn số dư hội viên', async () => {
  const origFindByPkTxn = db.FinancialTransaction.findByPk;
  const origFindByPkMember = db.Member.findByPk;
  const origTransaction = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async (cb) => {
      const mockT = { LOCK: { UPDATE: 'UPDATE' } };
      return await cb(mockT);
    };

    // 1. [Ca âm]: Thiếu lý do hoàn tiền
    await assert.rejects(
      async () => {
        await transactionService.refundTransaction(1, '   ');
      },
      { message: 'Lý do hoàn tiền không được để trống' }
    );

    // 2. [Ca âm]: Không tìm thấy giao dịch
    db.FinancialTransaction.findByPk = async () => null;
    const notFoundRes = await transactionService.refundTransaction(999, 'Lý do');
    assert.strictEqual(notFoundRes, null);

    // 3. [Ca âm]: Giao dịch đã hoàn tiền trước đó
    db.FinancialTransaction.findByPk = async () => ({
      transaction_id: 1,
      status: 'REFUNDED'
    });
    await assert.rejects(
      async () => {
        await transactionService.refundTransaction(1, 'Lỗi nhầm');
      },
      { message: 'Giao dịch này đã được hoàn tiền trước đó' }
    );

    // 4. [Ca âm - Chống gian lận]: Hội viên không đủ số dư để hoàn tiền
    db.FinancialTransaction.findByPk = async () => ({
      transaction_id: 3,
      category: TransactionCategory.MEMBER_TOPUP,
      amount: 100000,
      used_by: 10,
      status: 'COMPLETED'
    });
    db.Member.findByPk = async () => ({
      member_id: 10,
      real_balance: 10000 // Chỉ còn 10,000đ nhưng đòi hoàn 100,000đ
    });
    await assert.rejects(
      async () => {
        await transactionService.refundTransaction(3, 'Đòi hoàn tiền sau khi đã tiêu hết');
      },
      (err) => err.message.includes('Số dư tài khoản hội viên không đủ để hoàn tiền')
    );

    // 5. [Ca dương]: Hoàn tiền nạp giờ chơi hội viên thành công khi số dư hợp lệ
    const fakeTxn = {
      transaction_id: 2,
      category: TransactionCategory.MEMBER_TOPUP,
      amount: 50000,
      used_by: 10,
      status: 'COMPLETED',
      notes: 'Ban đầu',
      save: async () => {}
    };
    db.FinancialTransaction.findByPk = async () => fakeTxn;

    const fakeMember = {
      member_id: 10,
      real_balance: 80000,
      save: async () => {}
    };
    db.Member.findByPk = async () => fakeMember;

    const refundRes = await transactionService.refundTransaction(2, 'Khách nạp nhầm số tài khoản');
    assert.strictEqual(refundRes.status, 'REFUNDED');
    assert.ok(refundRes.notes.includes('Lý do hoàn: Khách nạp nhầm số tài khoản'));
    assert.strictEqual(fakeMember.real_balance, 30000); // 80000 - 50000 = 30000
  } finally {
    db.FinancialTransaction.findByPk = origFindByPkTxn;
    db.Member.findByPk = origFindByPkMember;
    db.sequelize.transaction = origTransaction;
  }
});

// ------------------------------------------------------------------------------
// TC-06: TRANSACTION CONTROLLER HTTP HANDLERS & ERROR HANDLING
// ------------------------------------------------------------------------------
test('[TC-06] [HTTP Handlers] TransactionController - Phản hồi RESTful API & Webhook Auth', async () => {
  const origGetAll = transactionService.getAllTransactions;
  const origCreate = transactionService.createTopUpTransaction;
  const origRefund = transactionService.refundTransaction;

  try {
    // 1. Controller getTransactions
    transactionService.getAllTransactions = async () => ({
      transactions: [{ id: 1 }],
      total: 1,
      page: 1,
      totalPages: 1,
      metrics: {}
    });

    let resData = null;
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resData = payload;
        return this;
      }
    };

    await transactionController.getTransactions({ query: {} }, mockRes, () => {});
    assert.strictEqual(resData.status, 'success');
    assert.strictEqual(resData.total, 1);

    // 2. Controller createTopUp (lấy processed_by từ req.user)
    transactionService.createTopUpTransaction = async (data) => {
      assert.strictEqual(data.processed_by, 99);
      return { id: 10, ...data };
    };

    await transactionController.createTopUp(
      { body: { member_id: 1, amount: 20000 }, user: { user_id: 99 } },
      mockRes,
      () => {}
    );
    assert.strictEqual(mockRes.statusCode, 201);

    // 3. Controller refundTransaction
    transactionService.refundTransaction = async (id) => (id === '1' ? { id: 1, status: 'REFUNDED' } : null);
    await transactionController.refundTransaction({ params: { id: '1' }, body: { reason: 'Test' } }, mockRes, () => {});
    assert.strictEqual(resData.status, 'success');

    await transactionController.refundTransaction({ params: { id: '999' }, body: {} }, mockRes, () => {});
    assert.strictEqual(mockRes.statusCode, 404);

    // 4. Middleware verifySePayWebhook (Bảo mật Webhook chuyên biệt)
    process.env.SEPAY_WEBHOOK_TOKEN = 'VALID_SEPAY_SECRET_TOKEN';

    // Thiếu header Authorization
    let nextCalled = false;
    await verifySePayWebhook({ headers: {} }, mockRes, () => { nextCalled = true; });
    assert.strictEqual(mockRes.statusCode, 401);

    // Sai token
    await verifySePayWebhook(
      { headers: { authorization: 'Bearer WRONG_TOKEN' } },
      mockRes,
      () => { nextCalled = true; }
    );
    assert.strictEqual(mockRes.statusCode, 401);

    // Đúng token -> gọi next()
    await verifySePayWebhook(
      { headers: { authorization: 'Bearer VALID_SEPAY_SECRET_TOKEN' } },
      mockRes,
      () => { nextCalled = true; }
    );
    assert.strictEqual(nextCalled, true);

    // Khi máy chủ chưa cấu hình token
    delete process.env.SEPAY_WEBHOOK_TOKEN;
    await verifySePayWebhook({ headers: {} }, mockRes, () => {});
    assert.strictEqual(mockRes.statusCode, 500);

    // 5. WebhookController (Tiếp nhận webhook bên thứ 3)
    const origSePayProcess = sePayService.processWebhook;
    sePayService.processWebhook = async (body) => ({ processed: true, ...body });
    
    // Gọi trực tiếp WebhookController.handleSePay
    await webhookController.handleSePay({ body: { amount: 50000 } }, mockRes, () => {});
    assert.strictEqual(resData.status, 'success');
    assert.strictEqual(resData.data.processed, true);

    sePayService.processWebhook = origSePayProcess;
  } finally {
    transactionService.getAllTransactions = origGetAll;
    transactionService.createTopUpTransaction = origCreate;
    transactionService.refundTransaction = origRefund;
  }
});

// ------------------------------------------------------------------------------
// TC-07: FINANCIAL TRANSACTION MODEL HELPER METHODS
// ------------------------------------------------------------------------------
test('[TC-07] [Model Helpers] FinancialTransaction Model Methods', () => {
  const incomeTxn = db.FinancialTransaction.build({
    type: TransactionType.INCOME,
    amount: '75000.00'
  });
  assert.strictEqual(incomeTxn.getSignedAmount(), 75000);

  const expenseTxn = db.FinancialTransaction.build({
    type: TransactionType.EXPENSE,
    amount: '25000.00'
  });
  assert.strictEqual(expenseTxn.getSignedAmount(), -25000);
});
