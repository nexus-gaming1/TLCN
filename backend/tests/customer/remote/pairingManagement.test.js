const test = require('node:test');
const assert = require('node:assert');
const pairingManagementService = require('../../../src/services/pairingManagementService');
const computerSocketService = require('../../../src/services/computerSocketService');
const machineStore = require('../../../src/stores/machineStore');
const db = require('../../../src/models');
const { RemotePairingStatus, ComputerStatus } = require('../../../src/constants/enums');

/**
 * MOCK DATABASE & STORES FOR ISOLATED UNIT, CONCURRENCY & SECURITY TESTING
 */
function createMockEnvironment() {
  const store = {
    computers: new Map(),
    members: new Map(),
    sessions: new Map(),
    intents: new Map(),
  };

  // Seed default test fixtures
  store.computers.set(101, {
    computer_id: 101,
    computer_name: 'PC-101',
    ip_address: '192.168.1.101',
    mac_address: 'AA:BB:CC:DD:EE:01',
    is_remote_enabled: true,
    status: ComputerStatus.ONLINE,
    ComputerZone: { tier_level: 1 },
    save: async function () { return this; }
  });

  store.computers.set(102, {
    computer_id: 102,
    computer_name: 'PC-102',
    ip_address: '192.168.1.102',
    mac_address: 'AA:BB:CC:DD:EE:02',
    is_remote_enabled: false, // NOT REMOTE ENABLED
    status: ComputerStatus.ONLINE,
    ComputerZone: { tier_level: 1 },
    save: async function () { return this; }
  });

  store.members.set(1, {
    member_id: 1,
    user_id: 10,
    real_balance: 50000,
    bonus_balance: 0,
    userInfo: { username: 'customer_a' }
  });

  store.members.set(2, {
    member_id: 2,
    user_id: 20,
    real_balance: 50000,
    bonus_balance: 0,
    userInfo: { username: 'customer_b' }
  });

  // Active session for member 1 on computer 101
  store.sessions.set(1001, {
    rental_session_id: 1001,
    computer_id: 101,
    member_id: 1,
    status: 'ACTIVE',
    started_at: new Date(),
    last_billed_at: new Date()
  });

  return store;
}

// ==============================================================================
// A. UNIT TESTS - PAIRING MANAGEMENT
// ==============================================================================

test('[TC-PM-01] Tạo pairing intent thành công khi phiên thuê đang ACTIVE', async () => {
  const env = createMockEnvironment();

  // Stub models
  const origCompFindByPk = db.Computer.findByPk;
  const origMemberFindByPk = db.Member.findByPk;
  const origSessionFindOne = db.RentalSession.findOne;
  const origPairingFindAll = db.RemotePairing.findAll;
  const origPairingCreate = db.RemotePairing.create;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' },
      finished: false
    });

    db.Computer.findByPk = async (id) => env.computers.get(id) || null;
    db.Member.findByPk = async (id) => env.members.get(id) || null;
    db.RentalSession.findOne = async () => env.sessions.get(1001);
    db.RemotePairing.findAll = async () => [];
    db.RemotePairing.create = async (data) => {
      const intent = { id: 'intent-uuid-001', ...data, created_at: new Date(), save: async () => intent };
      env.intents.set(intent.id, intent);
      return intent;
    };

    const result = await pairingManagementService.createPairingIntent({
      memberId: 1,
      computerId: 101,
      timeoutSeconds: 300
    });

    assert.ok(result.intent);
    assert.strictEqual(result.intent.id, 'intent-uuid-001');
    assert.strictEqual(result.intent.computerId, 101);
    assert.strictEqual(result.intent.status, RemotePairingStatus.PENDING);
    assert.strictEqual(result.session.rentalSessionId, 1001);
  } finally {
    db.Computer.findByPk = origCompFindByPk;
    db.Member.findByPk = origMemberFindByPk;
    db.RentalSession.findOne = origSessionFindOne;
    db.RemotePairing.findAll = origPairingFindAll;
    db.RemotePairing.create = origPairingCreate;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-PM-02] Không tạo intent khi máy tính không hỗ trợ thuê từ xa (is_remote_enabled = false)', async () => {
  const env = createMockEnvironment();

  const origCompFindByPk = db.Computer.findByPk;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.Computer.findByPk = async (id) => env.computers.get(id) || null;

    await assert.rejects(
      async () => {
        await pairingManagementService.createPairingIntent({
          memberId: 1,
          computerId: 102 // not remote enabled
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /thuê từ xa/i);
        return true;
      }
    );
  } finally {
    db.Computer.findByPk = origCompFindByPk;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-PM-03] Không tạo intent khi máy trạm không tồn tại', async () => {
  const origCompFindByPk = db.Computer.findByPk;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.Computer.findByPk = async () => null;

    await assert.rejects(
      async () => {
        await pairingManagementService.createPairingIntent({
          memberId: 1,
          computerId: 9999
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  } finally {
    db.Computer.findByPk = origCompFindByPk;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-PM-04] Xử lý intent cũ của cùng phiên: hủy intent cũ và tạo intent mới sạch sẽ', async () => {
  const env = createMockEnvironment();
  const oldIntent = {
    id: 'old-intent-001',
    rental_session_id: 1001,
    computer_id: 101,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 200000),
    save: async function () { return this; }
  };

  const origCompFindByPk = db.Computer.findByPk;
  const origMemberFindByPk = db.Member.findByPk;
  const origSessionFindOne = db.RentalSession.findOne;
  const origPairingFindAll = db.RemotePairing.findAll;
  const origPairingCreate = db.RemotePairing.create;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.Computer.findByPk = async (id) => env.computers.get(id);
    db.Member.findByPk = async (id) => env.members.get(id);
    db.RentalSession.findOne = async () => env.sessions.get(1001);
    db.RemotePairing.findAll = async () => [oldIntent];
    db.RemotePairing.create = async (d) => ({ id: 'new-intent-002', ...d, save: async () => {} });

    const result = await pairingManagementService.createPairingIntent({
      memberId: 1,
      computerId: 101
    });

    assert.strictEqual(oldIntent.status, RemotePairingStatus.CANCELLED);
    assert.strictEqual(result.intent.id, 'new-intent-002');
  } finally {
    db.Computer.findByPk = origCompFindByPk;
    db.Member.findByPk = origMemberFindByPk;
    db.RentalSession.findOne = origSessionFindOne;
    db.RemotePairing.findAll = origPairingFindAll;
    db.RemotePairing.create = origPairingCreate;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-PM-05] Correlation an toàn: Phát hiện pending pairing và gán chính xác khi có duy nhất 1 intent', async () => {
  const pendingIntent = {
    id: 'intent-uuid-match',
    computer_id: 101,
    rental_session_id: 1001,
    pairing_id: null,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 100000),
    save: async function () { return this; }
  };

  const origPairingFindAll = db.RemotePairing.findAll;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.RemotePairing.findAll = async () => [pendingIntent];

    const matched = await pairingManagementService.handlePairingDetected({
      computerId: 101,
      pairingId: 'sunshine-pin-req-999',
      deviceName: 'iPad Pro Moonlight',
      deviceAddress: '192.168.1.77'
    });

    assert.ok(matched);
    assert.strictEqual(matched.id, 'intent-uuid-match');
    assert.strictEqual(matched.pairing_id, 'sunshine-pin-req-999');
    assert.strictEqual(matched.device_name, 'iPad Pro Moonlight');
    assert.strictEqual(matched.device_address, '192.168.1.77');
  } finally {
    db.RemotePairing.findAll = origPairingFindAll;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-PM-06] Correlation an toàn: KHÔNG tự động gán nếu có nhiều hơn 1 pending intent (chống ghép nhầm)', async () => {
  const intent1 = {
    id: 'intent-1',
    computer_id: 101,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 100000),
    save: async function () {}
  };
  const intent2 = {
    id: 'intent-2',
    computer_id: 101,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 100000),
    save: async function () {}
  };

  const origPairingFindAll = db.RemotePairing.findAll;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    // Trả về 2 intent cùng PENDING
    db.RemotePairing.findAll = async () => [intent1, intent2];

    const matched = await pairingManagementService.handlePairingDetected({
      computerId: 101,
      pairingId: 'sunshine-req-conflict'
    });

    assert.strictEqual(matched, null, 'Phải trả về null, không được ghép nhầm khi có nhiều request không phân biệt');
    assert.strictEqual(intent1.pairing_id, undefined);
    assert.strictEqual(intent2.pairing_id, undefined);
  } finally {
    db.RemotePairing.findAll = origPairingFindAll;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-PM-07] Tự động hết hạn pairing intent (Auto-expire)', async () => {
  const expiredIntent = {
    id: 'intent-expired-01',
    rental_session_id: 1001,
    computer_id: 101,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() - 5000), // đã hết hạn 5s trước
    rentalSession: { member_id: 1 },
    save: async function () { return this; }
  };

  const origFindByPk = db.RemotePairing.findByPk;
  try {
    db.RemotePairing.findByPk = async () => expiredIntent;

    const status = await pairingManagementService.getPairingStatus({
      intentId: 'intent-expired-01',
      memberId: 1,
      role: 'MEMBER'
    });

    assert.strictEqual(status.status, RemotePairingStatus.EXPIRED);
    assert.strictEqual(expiredIntent.status, RemotePairingStatus.EXPIRED);
  } finally {
    db.RemotePairing.findByPk = origFindByPk;
  }
});

test('[TC-PM-08] Hủy pairing intent (cancelPairingIntent)', async () => {
  const activeIntent = {
    id: 'intent-to-cancel',
    rental_session_id: 1001,
    computer_id: 101,
    status: RemotePairingStatus.PENDING,
    rentalSession: { member_id: 1 },
    save: async function () { return this; }
  };

  const origFindByPk = db.RemotePairing.findByPk;
  try {
    db.RemotePairing.findByPk = async () => activeIntent;

    const res = await pairingManagementService.cancelPairingIntent({
      intentId: 'intent-to-cancel',
      memberId: 1,
      role: 'MEMBER'
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(activeIntent.status, RemotePairingStatus.CANCELLED);
    assert.strictEqual(activeIntent.failure_reason, 'Người dùng đã hủy');
  } finally {
    db.RemotePairing.findByPk = origFindByPk;
  }
});

test('[TC-PM-09] Chặn xác nhận pairing khi PIN không hợp lệ (không phải 4 chữ số)', async () => {
  const invalidPins = ['', '12', '123', '12345', 'abcd', '12a4'];
  for (const pin of invalidPins) {
    await assert.rejects(
      async () => {
        await pairingManagementService.confirmPairing({
          intentId: 'any-id',
          memberId: 1,
          pin
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /4 chữ số/i);
        return true;
      }
    );
  }
});

test('[TC-PM-10] Chặn xác nhận pairing khi intent đã PAIRED trước đó', async () => {
  const pairedIntent = {
    id: 'intent-already-paired',
    status: RemotePairingStatus.PAIRED,
    rentalSession: { member_id: 1, status: 'ACTIVE' },
    save: async function () {}
  };

  const origFindByPk = db.RemotePairing.findByPk;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.RemotePairing.findByPk = async () => pairedIntent;

    await assert.rejects(
      async () => {
        await pairingManagementService.confirmPairing({
          intentId: 'intent-already-paired',
          memberId: 1,
          pin: '1234'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /hoàn thành trước đó/i);
        return true;
      }
    );
  } finally {
    db.RemotePairing.findByPk = origFindByPk;
    db.sequelize.transaction = origTx;
  }
});

// ==============================================================================
// B. CONCURRENCY & RACE CONDITION TESTS
// ==============================================================================

test('[TC-CONCURRENCY-01] Hai khách cùng yêu cầu pairing một máy: Khách thứ hai bị từ chối 409 Conflict', async () => {
  const env = createMockEnvironment();
  // Máy 101 đang có active intent của khách 1
  const existingActiveIntent = {
    id: 'intent-client-1',
    rental_session_id: 1001, // của member 1
    computer_id: 101,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 180000),
    save: async function () {}
  };

  const origCompFindByPk = db.Computer.findByPk;
  const origMemberFindByPk = db.Member.findByPk;
  const origSessionFindOne = db.RentalSession.findOne;
  const origPairingFindAll = db.RemotePairing.findAll;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.Computer.findByPk = async (id) => env.computers.get(id);
    db.Member.findByPk = async (id) => env.members.get(id);
    // Khi member 2 query session: máy 101 đã thuộc session của member 1
    db.RentalSession.findOne = async () => env.sessions.get(1001);

    await assert.rejects(
      async () => {
        await pairingManagementService.createPairingIntent({
          memberId: 2, // Khách B cố tình pairing máy của Khách A
          computerId: 101
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /người dùng khác/i);
        return true;
      }
    );
  } finally {
    db.Computer.findByPk = origCompFindByPk;
    db.Member.findByPk = origMemberFindByPk;
    db.RentalSession.findOne = origSessionFindOne;
    db.RemotePairing.findAll = origPairingFindAll;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-CONCURRENCY-02] Chặn xác nhận đồng thời khi intent đang ở trạng thái CONFIRMING (409 Conflict)', async () => {
  const confirmingIntent = {
    id: 'intent-confirming',
    status: RemotePairingStatus.CONFIRMING,
    pairing_id: 'pair-99',
    expires_at: new Date(Date.now() + 60000),
    rentalSession: { member_id: 1, status: 'ACTIVE' },
    save: async function () {}
  };

  const origFindByPk = db.RemotePairing.findByPk;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.RemotePairing.findByPk = async () => confirmingIntent;

    await assert.rejects(
      async () => {
        await pairingManagementService.confirmPairing({
          intentId: 'intent-confirming',
          memberId: 1,
          pin: '8888'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /đang được xác nhận/i);
        return true;
      }
    );
  } finally {
    db.RemotePairing.findByPk = origFindByPk;
    db.sequelize.transaction = origTx;
  }
});

// ==============================================================================
// C. SECURITY & AUTHORIZATION TESTS
// ==============================================================================

test('[TC-SEC-01] Cross-tenant security: Khách A không được phép xác nhận pairing của Khách B (403 Forbidden)', async () => {
  const intentOfCustomerB = {
    id: 'intent-belong-to-b',
    pairing_id: 'pair-777',
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 100000),
    rentalSession: { member_id: 2, status: 'ACTIVE' }, // Thuộc member 2
    save: async function () {}
  };

  const origFindByPk = db.RemotePairing.findByPk;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.RemotePairing.findByPk = async () => intentOfCustomerB;

    await assert.rejects(
      async () => {
        await pairingManagementService.confirmPairing({
          intentId: 'intent-belong-to-b',
          memberId: 1, // Khách 1 gọi xác nhận intent của khách 2
          pin: '1234',
          role: 'MEMBER'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /không có quyền/i);
        return true;
      }
    );
  } finally {
    db.RemotePairing.findByPk = origFindByPk;
    db.sequelize.transaction = origTx;
  }
});

test('[TC-SEC-02] Không chấp nhận xác nhận pairing khi RentalSession đã kết thúc/LOGGED_OUT', async () => {
  const endedSessionIntent = {
    id: 'intent-session-ended',
    pairing_id: 'pair-111',
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 100000),
    rentalSession: { member_id: 1, status: 'LOGGED_OUT' }, // Session đã kết thúc
    save: async function () {}
  };

  const origFindByPk = db.RemotePairing.findByPk;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.RemotePairing.findByPk = async () => endedSessionIntent;

    await assert.rejects(
      async () => {
        await pairingManagementService.confirmPairing({
          intentId: 'intent-session-ended',
          memberId: 1,
          pin: '1234'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /không còn ở trạng thái hoạt động/i);
        return true;
      }
    );
  } finally {
    db.RemotePairing.findByPk = origFindByPk;
    db.sequelize.transaction = origTx;
  }
});

// ==============================================================================
// D. INTEGRATION TESTS (FULL END-TO-END FLOW)
// ==============================================================================

test('[TC-INTEGRATION-01] Toàn bộ quy trình End-to-End từ Intent -> Sunshine Confirm -> PAIRED', async () => {
  const env = createMockEnvironment();

  // Socket broadcast spy
  const socketEvents = [];
  const origBroadcast = computerSocketService.broadcastPairingEvent;
  const origConfirmNetClient = computerSocketService.confirmSunshinePairing;
  computerSocketService.broadcastPairingEvent = (name, data) => socketEvents.push({ name, data });

  // Mock NetClient Sunshine confirmation succeeds
  computerSocketService.confirmSunshinePairing = async (machineId, data) => {
    assert.strictEqual(data.pin, '5678');
    assert.strictEqual(data.pairingId, 'sunshine-live-pair-01');
    return { success: true };
  };

  const liveIntent = {
    id: 'intent-e2e-01',
    computer_id: 101,
    rental_session_id: 1001,
    pairing_id: null,
    status: RemotePairingStatus.PENDING,
    expires_at: new Date(Date.now() + 250000),
    computer: env.computers.get(101),
    rentalSession: env.sessions.get(1001),
    update: async function (fields) {
      Object.assign(this, fields);
      return this;
    },
    save: async function () { return this; }
  };

  const origFindByPk = db.RemotePairing.findByPk;
  const origFindAll = db.RemotePairing.findAll;
  const origTx = db.sequelize.transaction;

  try {
    db.sequelize.transaction = async () => ({
      commit: async () => {},
      rollback: async () => {},
      LOCK: { UPDATE: 'UPDATE' }
    });
    db.RemotePairing.findByPk = async () => liveIntent;
    db.RemotePairing.findAll = async () => [liveIntent];

    // Mock connected machine in machineStore
    machineStore.register('mock-socket-01', {
      machineId: 'PC-101',
      localIp: '192.168.1.101',
      macAddress: 'AA:BB:CC:DD:EE:01',
      status: 'ONLINE'
    });

    // 1. Sunshine xuất hiện pending pairing -> NetClient phát hiện
    const detected = await pairingManagementService.handlePairingDetected({
      computerId: 101,
      pairingId: 'sunshine-live-pair-01',
      deviceName: 'Gamer Laptop',
      deviceAddress: '192.168.1.50'
    });

    assert.ok(detected);
    assert.strictEqual(liveIntent.pairing_id, 'sunshine-live-pair-01');

    // 2. Khách gửi PIN 5678 -> Backend confirm
    const confirmResult = await pairingManagementService.confirmPairing({
      intentId: 'intent-e2e-01',
      memberId: 1,
      pin: '5678',
      role: 'MEMBER'
    });

    assert.strictEqual(confirmResult.success, true);
    assert.strictEqual(liveIntent.status, RemotePairingStatus.PAIRED);
    assert.ok(liveIntent.completed_at);

    // 3. Kiểm tra socket events đã phát
    const eventNames = socketEvents.map(e => e.name);
    assert.ok(eventNames.includes('remote:pairing:detected'), 'Phải phát socket event detected');
    assert.ok(eventNames.includes('remote:pairing:confirming'), 'Phải phát socket event confirming');
    assert.ok(eventNames.includes('remote:pairing:completed'), 'Phải phát socket event completed');
  } finally {
    computerSocketService.broadcastPairingEvent = origBroadcast;
    computerSocketService.confirmSunshinePairing = origConfirmNetClient;
    db.RemotePairing.findByPk = origFindByPk;
    db.RemotePairing.findAll = origFindAll;
    db.sequelize.transaction = origTx;
    machineStore.handleDisconnect('mock-socket-01');
  }
});
