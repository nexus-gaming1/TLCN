const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../src/models');
const { ComputerService } = require('../../../src/services/computerService');
const { ComputerStatus, SessionType } = require('../../../src/constants/enums');

/**
 * ==============================================================================
 * MA TRẬN TEST CASE CHO MODULE QUẢN LÝ DANH SÁCH MÁY TRẠM (MACHINE FLEET UNIT TESTS)
 * Đạt chuẩn:
 * 1. Test Model domain logic (Computer model methods)
 * 2. Test ComputerService CRUD, auto ID/IP/MAC allocation
 * 3. Test Validation & Edge cases (IPv4, MAC, duplicate names, non-existent zones)
 * 4. Test Concurrency protection & ComputerStatusLog recording
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. MODEL COMPUTER - DOMAIN METHODS & STATE TRANSITIONS
// ------------------------------------------------------------------------------
test('[Unit TC-01] [Model] Computer Model - Kiểm tra các phương thức nghiệp vụ domain & trạng thái', async () => {
  const computer = db.Computer.build({
    computer_id: 999,
    computer_name: 'PC-TEST-999',
    ip_address: '192.168.1.99',
    mac_address: 'AA:BB:CC:DD:EE:FF',
    status: ComputerStatus.OFFLINE,
    zone_id: 1,
    is_remote_enabled: false
  });

  computer.save = async function () { return this; };

  // Lock
  await computer.lock();
  assert.strictEqual(computer.status, ComputerStatus.LOCKED, 'Trạng thái phải chuyển thành LOCKED');

  // Unlock
  await computer.unlock();
  assert.strictEqual(computer.status, ComputerStatus.OFFLINE, 'Trạng thái mở khóa phải về OFFLINE');

  // Maintenance
  await computer.setMaintenance();
  assert.strictEqual(computer.status, ComputerStatus.MAINTENANCE, 'Trạng thái bảo trì phải là MAINTENANCE');

  // Remove maintenance
  await computer.removeMaintenance();
  assert.strictEqual(computer.status, ComputerStatus.OFFLINE, 'Hết bảo trì phải về OFFLINE');

  // Pause & Resume
  await computer.pause();
  assert.strictEqual(computer.status, ComputerStatus.PAUSE, 'Tạm dừng phải là PAUSE');
  await computer.resume();
  assert.strictEqual(computer.status, ComputerStatus.IN_USE, 'Tiếp tục phải là IN_USE');

  // isAvailable check
  assert.strictEqual(computer.isAvailable(), false, 'Đang IN_USE thì không khả dụng');
  computer.status = ComputerStatus.OFFLINE;
  assert.strictEqual(computer.isAvailable(), true, 'OFFLINE thì khả dụng');
});

// ------------------------------------------------------------------------------
// 2. COMPUTERSERVICE - AUTO PROVISIONING & ALLOCATION LOGIC
// ------------------------------------------------------------------------------
test('[Unit TC-02] [Service] createComputer - Tự động cấp phát Mã máy, IP mạng và MAC khi để trống', async () => {
  let createdPayload = null;
  const mockModels = {
    Computer: {
      findOne: async () => null,
      create: async (data) => {
        createdPayload = { ...data, computer_id: 42, save: async () => {} };
        return createdPayload;
      }
    },
    ComputerZone: {
      findByPk: async () => ({ zone_id: 1, zone_name: 'Zone Standard' })
    },
    sequelize: {
      transaction: async (cb) => cb({})
    }
  };

  const service = new ComputerService(mockModels);
  const result = await service.createComputer({
    zone_id: 1,
    status: ComputerStatus.OFFLINE,
    is_remote_enabled: false
  });

  assert.ok(result, 'Phải tạo thành công máy trạm');
  assert.strictEqual(result.computer_name, 'PC-042', 'Tự động cấp phát tên PC-042');
  assert.strictEqual(result.ip_address, '192.168.1.43', 'Tự động cấp phát IP 192.168.1.43');
  assert.ok(result.mac_address.startsWith('F4:D4:88:5A:'), 'Tự động sinh MAC chuẩn PXE');
});

// ------------------------------------------------------------------------------
// 3. COMPUTERSERVICE - VALIDATION & ERROR HANDLING
// ------------------------------------------------------------------------------
test('[Unit TC-03] [Validation] createComputer - Kiểm tra định dạng IPv4 không hợp lệ', async () => {
  const service = new ComputerService(db);
  await assert.rejects(
    async () => {
      await service.createComputer({
        computer_name: 'PC-ERR-01',
        ip_address: '999.888.777.666',
        zone_id: 1
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /IPv4/);
      return true;
    }
  );
});

test('[Unit TC-04] [Validation] createComputer - Kiểm tra định dạng MAC không hợp lệ', async () => {
  const service = new ComputerService(db);
  await assert.rejects(
    async () => {
      await service.createComputer({
        computer_name: 'PC-ERR-02',
        ip_address: '192.168.1.50',
        mac_address: 'INVALID-MAC-FORMAT',
        zone_id: 1
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /MAC/);
      return true;
    }
  );
});

test('[Unit TC-05] [Validation] createComputer - Trùng tên máy trạm đã có', async () => {
  const mockModels = {
    Computer: {
      findOne: async ({ where }) => {
        if (where.computer_name === 'PC-EXISTING') {
          return { computer_id: 1, computer_name: 'PC-EXISTING' };
        }
        return null;
      }
    },
    ComputerZone: {
      findByPk: async () => ({ zone_id: 1 })
    }
  };

  const service = new ComputerService(mockModels);
  await assert.rejects(
    async () => {
      await service.createComputer({
        computer_name: 'PC-EXISTING',
        zone_id: 1
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Tên máy trạm.*đã tồn tại/);
      return true;
    }
  );
});

test('[Unit TC-06] [Validation] createComputer - Trùng địa chỉ IP đã gán cho máy khác', async () => {
  const mockModels = {
    Computer: {
      findOne: async ({ where }) => {
        if (where.ip_address === '192.168.1.100') {
          return { computer_id: 2, ip_address: '192.168.1.100' };
        }
        return null;
      }
    },
    ComputerZone: {
      findByPk: async () => ({ zone_id: 1 })
    }
  };

  const service = new ComputerService(mockModels);
  await assert.rejects(
    async () => {
      await service.createComputer({
        computer_name: 'PC-NEW-IP',
        ip_address: '192.168.1.100',
        zone_id: 1
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Địa chỉ IP.*đã được gán/);
      return true;
    }
  );
});

test('[Unit TC-07] [Validation] createComputer - Phân khu không tồn tại', async () => {
  const mockModels = {
    Computer: {
      findOne: async () => null
    },
    ComputerZone: {
      findByPk: async () => null // Không tìm thấy phân khu
    }
  };

  const service = new ComputerService(mockModels);
  await assert.rejects(
    async () => {
      await service.createComputer({
        computer_name: 'PC-BAD-ZONE',
        zone_id: 99999
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Phân khu máy trạm không tồn tại/);
      return true;
    }
  );
});

// ------------------------------------------------------------------------------
// 4. COMPUTERSERVICE - UPDATE & COMPUTER STATUS LOG RECORDING
// ------------------------------------------------------------------------------
test('[Unit TC-08] [Service] updateComputer - Cập nhật trạng thái và ghi ComputerStatusLog', async () => {
  let loggedStatus = null;
  const mockComputer = {
    computer_id: 10,
    computer_name: 'PC-010',
    status: ComputerStatus.OFFLINE,
    save: async () => {}
  };

  const mockModels = {
    Computer: {
      findByPk: async () => mockComputer,
      findOne: async () => null
    },
    ComputerZone: {
      findByPk: async () => ({ zone_id: 1 })
    },
    ComputerStatusLog: {
      create: async (data) => {
        loggedStatus = data;
        return data;
      }
    },
    sequelize: {
      transaction: async () => ({
        commit: async () => {},
        rollback: async () => {}
      })
    }
  };

  const service = new ComputerService(mockModels);
  const result = await service.updateComputer(10, { status: ComputerStatus.ONLINE });

  assert.strictEqual(result.status, ComputerStatus.ONLINE, 'Trạng thái máy phải đổi sang ONLINE');
  assert.ok(loggedStatus, 'Phải có bản ghi ComputerStatusLog được tạo');
  assert.strictEqual(loggedStatus.computer_id, 10);
  assert.strictEqual(loggedStatus.status, ComputerStatus.ONLINE);
  assert.strictEqual(loggedStatus.session_type, SessionType.SYSTEM);
});

// ------------------------------------------------------------------------------
// 5. COMPUTERSERVICE - DELETE INTEGRITY & GUARD
// ------------------------------------------------------------------------------
test('[Unit TC-09] [Service] deleteComputer - Chặn xóa máy trạm đang có phiên chơi IN_USE', async () => {
  const mockModels = {
    Computer: {
      findByPk: async () => ({
        computer_id: 5,
        status: ComputerStatus.IN_USE
      })
    }
  };

  const service = new ComputerService(mockModels);
  await assert.rejects(
    async () => {
      await service.deleteComputer(5);
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /Không thể xóa máy trạm đang có phiên sử dụng/);
      return true;
    }
  );
});

test('[Unit TC-10] [Service] deleteComputer - Xóa thành công máy trạm OFFLINE kèm dọn dẹp status logs', async () => {
  let destroyedLogComputerId = null;
  let computerDestroyed = false;

  const mockModels = {
    Computer: {
      findByPk: async () => ({
        computer_id: 8,
        status: ComputerStatus.OFFLINE,
        destroy: async () => { computerDestroyed = true; }
      })
    },
    ComputerStatusLog: {
      destroy: async ({ where }) => {
        destroyedLogComputerId = where.computer_id;
      }
    }
  };

  const service = new ComputerService(mockModels);
  const success = await service.deleteComputer(8);

  assert.strictEqual(success, true);
  assert.strictEqual(computerDestroyed, true, 'Máy trạm phải được destroy');
  assert.strictEqual(destroyedLogComputerId, 8, 'Phải xóa sạch status logs của máy 8');
});
