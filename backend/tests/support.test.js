const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const { SupportService } = require('../src/services/supportService');
const { SupportRepository } = require('../src/repositories/supportRepository');
const { SupportRequestType, SupportRequestStatus, OrderStatus } = require('../src/constants/enums');

/**
 * Factory tạo bộ Mock độc lập cho SupportService (Zero DB Dependency)
 */
const createSupportTestEnv = (overrides = {}) => {
  let createdData = null;
  let updatedData = null;
  const socketEvents = {
    newRequests: [],
    updatedRequests: []
  };
  const refundCalls = [];

  const defaultTicket = {
    request_id: 101,
    member_id: 7,
    computer_id: 5,
    order_id: null,
    type: SupportRequestType.MACHINE_SUPPORT,
    title: '[VIP-05] Lỗi chuột',
    description: 'Chuột di chuyển chậm',
    rating: null,
    status: SupportRequestStatus.PENDING,
    resolved_by: null,
    resolution_note: null
  };

  const mockRepo = {
    findActiveRentalSession: async () => ({
      computer_id: 5,
      computer: { computer_name: 'VIP-05' }
    }),
    findActiveMachineSupport: async () => null,
    findOrderById: async () => ({
      order_id: 50,
      used_by: 7,
      status: OrderStatus.COMPLETED,
      total_amount: 50000
    }),
    findActiveDisputeByOrderId: async () => null,
    create: async (data) => {
      createdData = data;
      return { request_id: 101, ...data };
    },
    findById: async () => {
      if (createdData) {
        return { request_id: 101, ...createdData, ...(updatedData || {}) };
      }
      return { ...defaultTicket, ...(updatedData || {}) };
    },
    update: async (ticketInstance, data) => {
      updatedData = data;
      return { ...ticketInstance, ...data };
    },
    ...overrides.repo
  };

  const mockSocket = {
    notifyNewRequest: (ticket) => {
      socketEvents.newRequests.push(ticket);
    },
    notifyRequestUpdated: (ticket, memberId) => {
      socketEvents.updatedRequests.push({ ticket, memberId });
    },
    ...overrides.socket
  };

  const mockOrderService = {
    refundCompletedOrder: async (orderId, staffId, payload) => {
      refundCalls.push({ orderId, staffId, payload });
      return { order_id: orderId, refund_amount: payload.amount };
    },
    ...overrides.orderService
  };

  const service = new SupportService(mockRepo, mockSocket, mockOrderService);

  return {
    service,
    socketEvents,
    refundCalls,
    getCreatedData: () => createdData,
    getUpdatedData: () => updatedData
  };
};

// ==============================================================================
// 1. NHÓM MACHINE_SUPPORT (5 CASES)
// ==============================================================================

test('[Support-01] MACHINE_SUPPORT: Chặn tạo mới khi hội viên chưa có phiên chơi ACTIVE', async () => {
  const { service } = createSupportTestEnv({
    repo: { findActiveRentalSession: async () => null }
  });

  await assert.rejects(
    () => service.createRequest(7, { type: SupportRequestType.MACHINE_SUPPORT, title: 'Hỏng phím' }),
    (err) => err.statusCode === 400 && /phiên chơi đang hoạt động/.test(err.message)
  );
});

test('[Support-02] MACHINE_SUPPORT: Tạo thành công khi có phiên ACTIVE -> PENDING, gán computer_id và bắn socket KDS', async () => {
  const { service, socketEvents, getCreatedData } = createSupportTestEnv();

  const res = await service.createRequest(7, {
    type: SupportRequestType.MACHINE_SUPPORT,
    description: 'Chuột bị lag'
  });

  const saved = getCreatedData();
  assert.strictEqual(saved.status, SupportRequestStatus.PENDING);
  assert.strictEqual(saved.computer_id, 5);
  assert.strictEqual(res.status, SupportRequestStatus.PENDING);
  assert.strictEqual(socketEvents.newRequests.length, 1);
  assert.strictEqual(socketEvents.newRequests[0].computer_id, 5);
});

test('[Support-03] MACHINE_SUPPORT: Chống spam 409 ConflictError khi đang có ticket PENDING hoặc IN_PROGRESS', async () => {
  const { service, socketEvents } = createSupportTestEnv({
    repo: {
      findActiveMachineSupport: async () => ({
        request_id: 88,
        status: SupportRequestStatus.IN_PROGRESS
      })
    }
  });

  await assert.rejects(
    () => service.createRequest(7, { type: SupportRequestType.MACHINE_SUPPORT, title: 'Gọi lại' }),
    (err) => err.statusCode === 409 && /#88/.test(err.message)
  );
  assert.strictEqual(socketEvents.newRequests.length, 0);
});

test('[Support-04] MACHINE_SUPPORT: Chặn nhảy cóc từ PENDING sang RESOLVE và chặn REJECT khi IN_PROGRESS', async () => {
  const { service: pendingSvc } = createSupportTestEnv();

  await assert.rejects(
    () => pendingSvc.processRequest(101, 2, { action: 'RESOLVE' }),
    (err) => err.statusCode === 400 && /Tiếp nhận/.test(err.message)
  );

  const { service: inProgSvc } = createSupportTestEnv({
    repo: {
      findById: async () => ({
        request_id: 101,
        member_id: 7,
        type: SupportRequestType.MACHINE_SUPPORT,
        status: SupportRequestStatus.IN_PROGRESS,
        resolution_note: 'Nhân viên đang tới máy hỗ trợ'
      })
    }
  });

  await assert.rejects(
    () => inProgSvc.processRequest(101, 2, { action: 'REJECT', resolution_note: 'Không thích hỗ trợ' }),
    (err) => err.statusCode === 400 && /không hỗ trợ từ chối/.test(err.message)
  );
});

test('[Support-05] MACHINE_SUPPORT: Luồng 2 bước PENDING -> IN_PROGRESS -> RESOLVED gán đúng ghi chú mặc định sạch', async () => {
  let ticketState = {
    request_id: 101,
    member_id: 7,
    computer_id: 5,
    type: SupportRequestType.MACHINE_SUPPORT,
    status: SupportRequestStatus.PENDING,
    resolution_note: null
  };

  const { service, socketEvents } = createSupportTestEnv({
    repo: {
      findById: async () => ({ ...ticketState }),
      update: async (_t, data) => {
        ticketState = { ...ticketState, ...data };
        return ticketState;
      }
    }
  });

  // Bước 1: Tiếp nhận
  const step1 = await service.processRequest(101, 2, { action: 'IN_PROGRESS' });
  assert.strictEqual(step1.status, SupportRequestStatus.IN_PROGRESS);
  assert.strictEqual(step1.resolution_note, 'Nhân viên đang tới máy hỗ trợ');

  // Bước 2: Hoàn thành với ghi chú để trống -> phải thay bằng defaultNote hoàn tất, không kế thừa note cũ
  const step2 = await service.processRequest(101, 2, { action: 'RESOLVE', resolution_note: '' });
  assert.strictEqual(step2.status, SupportRequestStatus.RESOLVED);
  assert.strictEqual(step2.resolution_note, 'Nhân viên đã hỗ trợ xử lý hoàn tất tại máy');
  assert.strictEqual(socketEvents.updatedRequests.length, 2);
});

// ==============================================================================
// 2. NHÓM ORDER_DISPUTE (4 CASES)
// ==============================================================================

test('[Support-06] ORDER_DISPUTE: Chặn nhảy cóc trực tiếp từ PENDING sang REFUND, RESOLVE hoặc REJECT', async () => {
  const pendingDispute = {
    request_id: 201,
    member_id: 7,
    order_id: 50,
    type: SupportRequestType.ORDER_DISPUTE,
    status: SupportRequestStatus.PENDING
  };

  const { service } = createSupportTestEnv({
    repo: { findById: async () => ({ ...pendingDispute }) }
  });

  await assert.rejects(
    () => service.processRequest(201, 2, { action: 'REFUND', refund_amount: 20000 }),
    (err) => err.statusCode === 400 && /Tiếp nhận/.test(err.message)
  );
  await assert.rejects(
    () => service.processRequest(201, 2, { action: 'RESOLVE' }),
    (err) => err.statusCode === 400 && /Tiếp nhận/.test(err.message)
  );
  await assert.rejects(
    () => service.processRequest(201, 2, { action: 'REJECT', resolution_note: 'Sai sự thật' }),
    (err) => err.statusCode === 400 && /Tiếp nhận/.test(err.message)
  );
});

test('[Support-07] ORDER_DISPUTE: REJECT khi IN_PROGRESS bắt buộc nhập lý do mới (không kế thừa note IN_PROGRESS)', async () => {
  const inProgDispute = {
    request_id: 202,
    member_id: 7,
    order_id: 50,
    type: SupportRequestType.ORDER_DISPUTE,
    status: SupportRequestStatus.IN_PROGRESS,
    resolution_note: 'Thu ngân đã tiếp nhận và đang kiểm tra đơn hàng'
  };

  const { service } = createSupportTestEnv({
    repo: { findById: async () => ({ ...inProgDispute }) }
  });

  await assert.rejects(
    () => service.processRequest(202, 2, { action: 'REJECT', resolution_note: '   ' }),
    (err) => err.statusCode === 400 && /Vui lòng nhập lý do từ chối/.test(err.message)
  );
});

test('[Support-08] ORDER_DISPUTE: Duyệt hoàn tiền 1 phần gọi đúng orderService.refundCompletedOrder và chuyển RESOLVED', async () => {
  let disputeState = {
    request_id: 203,
    member_id: 7,
    order_id: 50,
    type: SupportRequestType.ORDER_DISPUTE,
    status: SupportRequestStatus.IN_PROGRESS,
    resolution_note: 'Thu ngân đã tiếp nhận và đang kiểm tra đơn hàng'
  };

  const { service, refundCalls } = createSupportTestEnv({
    repo: {
      findById: async () => ({ ...disputeState }),
      update: async (_t, data) => {
        disputeState = { ...disputeState, ...data };
        return disputeState;
      }
    }
  });

  const res = await service.processRequest(203, 9, {
    action: 'REFUND',
    refund_amount: 20000,
    resolution_note: 'Hoàn tiền 1 chai Sting thiếu'
  });

  assert.strictEqual(refundCalls.length, 1);
  assert.deepStrictEqual(refundCalls[0], {
    orderId: 50,
    staffId: 9,
    payload: {
      amount: 20000,
      reason: 'Hoàn tiền 1 chai Sting thiếu'
    }
  });
  assert.strictEqual(res.status, SupportRequestStatus.RESOLVED);
  assert.match(res.resolution_note, /ĐÃ HOÀN TIỀN/);
});

test('[Support-09] ORDER_DISPUTE: Rào chắn chống NaN khi refund_amount là null hoặc chuỗi rỗng "" (fallback 100% đơn)', async () => {
  for (const edgeVal of [null, '']) {
    let disputeState = {
      request_id: 204,
      member_id: 7,
      order_id: 50,
      type: SupportRequestType.ORDER_DISPUTE,
      status: SupportRequestStatus.IN_PROGRESS
    };

    const { service, refundCalls } = createSupportTestEnv({
      repo: {
        findById: async () => ({ ...disputeState }),
        update: async (_t, data) => {
          disputeState = { ...disputeState, ...data };
          return disputeState;
        }
      }
    });

    await service.processRequest(204, 9, {
      action: 'REFUND',
      refund_amount: edgeVal,
      resolution_note: 'Hoàn toàn bộ đơn sự cố'
    });

    assert.strictEqual(refundCalls.length, 1);
    assert.strictEqual(Number.isNaN(refundCalls[0].payload.amount), false);
    assert.strictEqual(refundCalls[0].payload.amount, 50000);
  }
});

// ==============================================================================
// 3. NHÓM FEEDBACK (1 CASE)
// ==============================================================================

test('[Support-10] FEEDBACK: Tự động gán status = RESOLVED ngay khi tạo và KHÔNG bắn socket KDS sang Staff', async () => {
  const { service, socketEvents, getCreatedData } = createSupportTestEnv({
    repo: { findActiveRentalSession: async () => null } // FEEDBACK không bắt buộc đang ngồi máy
  });

  const res = await service.createRequest(7, {
    type: SupportRequestType.FEEDBACK,
    rating: 5,
    description: 'Máy mượt, điều hòa mát'
  });

  const saved = getCreatedData();
  assert.strictEqual(saved.status, SupportRequestStatus.RESOLVED);
  assert.strictEqual(saved.resolution_note, 'Hệ thống đã ghi nhận đánh giá của bạn');
  assert.strictEqual(res.status, SupportRequestStatus.RESOLVED);
  assert.strictEqual(socketEvents.newRequests.length, 0);
});

// ==============================================================================
// 4. NHÓM SUPPORT REPOSITORY FINDALL (2 CASES)
// ==============================================================================

test('[Support-11] SupportRepository.findAll: Tách chuỗi dấu phẩy thành Op.in và giữ nguyên giá trị đơn', async () => {
  const capturedQueries = [];
  const mockModels = {
    SupportRequest: {
      findAndCountAll: async (query) => {
        capturedQueries.push(query);
        return { count: 0, rows: [] };
      }
    },
    Computer: {},
    Member: {},
    User: {},
    ServiceOrder: {},
    FinancialTransaction: {}
  };

  const repo = new SupportRepository(mockModels);

  // Trường hợp nhiều giá trị cách nhau bởi dấu phẩy
  await repo.findAll({
    status: 'PENDING, IN_PROGRESS',
    type: 'MACHINE_SUPPORT,ORDER_DISPUTE'
  });

  assert.deepStrictEqual(capturedQueries[0].where.status, {
    [Op.in]: ['PENDING', 'IN_PROGRESS']
  });
  assert.deepStrictEqual(capturedQueries[0].where.type, {
    [Op.in]: ['MACHINE_SUPPORT', 'ORDER_DISPUTE']
  });

  // Trường hợp giá trị đơn
  await repo.findAll({ status: 'RESOLVED', type: 'FEEDBACK' });
  assert.strictEqual(capturedQueries[1].where.status, 'RESOLVED');
  assert.strictEqual(capturedQueries[1].where.type, 'FEEDBACK');
});

test('[Support-12] SupportRepository.findAll: Ép kiểu parseInt an toàn cho limit/offset, có distinct và include REFUND transactions', async () => {
  let capturedQuery = null;
  const mockModels = {
    SupportRequest: {
      findAndCountAll: async (query) => {
        capturedQuery = query;
        return { count: 12, rows: [] };
      }
    },
    Computer: { name: 'Computer' },
    Member: { name: 'Member' },
    User: { name: 'User' },
    ServiceOrder: { name: 'ServiceOrder' },
    FinancialTransaction: { name: 'FinancialTransaction' }
  };

  const repo = new SupportRepository(mockModels);
  await repo.findAll({ limit: '10', offset: '20' });

  assert.strictEqual(typeof capturedQuery.limit, 'number');
  assert.strictEqual(typeof capturedQuery.offset, 'number');
  assert.strictEqual(capturedQuery.limit, 10);
  assert.strictEqual(capturedQuery.offset, 20);
  assert.strictEqual(capturedQuery.distinct, true);

  const orderInclude = capturedQuery.include.find((inc) => inc.as === 'order');
  assert.ok(orderInclude, 'Phải include quan hệ order');
  const txnInclude = orderInclude.include.find((inc) => inc.as === 'transactions');
  assert.ok(txnInclude, 'Order phải include quan hệ transactions hoàn tiền');
  assert.strictEqual(txnInclude.separate, true);
  assert.deepStrictEqual(txnInclude.where, { type: 'EXPENSE', category: 'REFUND' });
});
