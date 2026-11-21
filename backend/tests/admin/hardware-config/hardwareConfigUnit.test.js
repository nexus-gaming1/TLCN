const test = require('node:test');
const assert = require('node:assert/strict');
const validator = require('../../../src/validators/hardwareSpecValidator');
const HardwareProfileDto = require('../../../src/dtos/hardwareProfileDto');
const TelemetryService = require('../../../src/services/telemetryService');
const HardwareProfileService = require('../../../src/services/hardwareProfileService');
const computerController = require('../../../src/controllers/computerController');
const computerService = require('../../../src/services/computerService');
const { ComputerStatus } = require('../../../src/constants/enums');

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
// 1. VALIDATOR EDGE CASES (XSS, LENGTHS, TYPES, RELATIONAL ZONE CHECK)
// ============================================================================

test('HardwareSpecValidator Unit - rejects array payloads, unsafe XSS, and invalid types', async () => {
  const badCases = [
    { payload: [], isCreate: true, expected: 'không hợp lệ' },
    { payload: { profileName: '<script>alert(1)</script>' }, isCreate: true, expected: 'không an toàn' },
    { payload: { profileName: '   ' }, isCreate: false, expected: 'không được để trống' },
    { payload: { profileName: 'Valid', zoneId: true }, isCreate: true, expected: 'zoneId' },
    { payload: { profileName: 'Valid', cpu: ['<script>'] }, isCreate: true, expected: 'chuỗi ký tự' },
    { payload: { profileName: 'Valid', cpu: { model: 'A'.repeat(151) } }, isCreate: true, expected: '150 ký tự' },
    { payload: { profileName: 'Valid', gear: 'G'.repeat(256) }, isCreate: true, expected: '255 ký tự' },
    { payload: { profileName: 'Valid', gpu: 'javascript:alert(1)' }, isCreate: true, expected: 'không an toàn' },
    { payload: { profileName: 'Valid', description: 12345 }, isCreate: true, expected: 'chuỗi ký tự' },
    { payload: { profileName: 'Valid', description: 'D'.repeat(501) }, isCreate: true, expected: '500 ký tự' },
    { payload: { profileName: 'Valid', description: '<script>bad</script>' }, isCreate: true, expected: 'không an toàn' },
    { payload: { profileName: 'Valid', assignedComputers: ['<script>'] }, isCreate: true, expected: 'không hợp lệ' }
  ];

  for (const c of badCases) {
    await assert.rejects(
      () => validator.validateHardwareSpecInput(c.payload, c.isCreate),
      (err) => err.statusCode === 400 && err.message.includes(c.expected)
    );
  }
});

test('HardwareSpecValidator Unit - validates zone existence via injected models and specId XSS', async () => {
  assert.strictEqual(validator.isValidSpecId('<script>alert(1)</script>'), false);
  assert.strictEqual(validator.isValidSpecId(0), true);
  assert.strictEqual(validator.isValidSpecId('VIP-SPEC'), true);

  const mockModels = {
    ComputerZone: {
      findByPk: async () => null
    }
  };

  await assert.rejects(
    () => validator.validateHardwareSpecInput({ profileName: 'Zone Missing', zoneId: 999 }, true, mockModels),
    (err) => err.statusCode === 400 && err.message.includes('không tồn tại')
  );
});

// ============================================================================
// 2. DTO EDGE CASES
// ============================================================================

test('HardwareProfileDto Unit - handles null inputs and fallback defaults cleanly', () => {
  assert.strictEqual(HardwareProfileDto.toDomain(null), null);
  assert.deepStrictEqual(HardwareProfileDto.toPersistence(null), {});

  const domain = HardwareProfileDto.toDomain({ profile_id: 0, profile_name: 'Minimal' });
  assert.strictEqual(domain.cpu.model, 'Chưa thiết lập');
  assert.strictEqual(domain.cpu.specs, 'N/A');
  assert.strictEqual(domain.telemetry.cpuTemp, 0);
  assert.deepStrictEqual(domain.assignedComputers, []);

  const persistence = HardwareProfileDto.toPersistence({ id: '  ID_FALLBACK  ', cpuSelect: '  Ryzen 7  ' });
  assert.strictEqual(persistence.profile_name, 'ID_FALLBACK');
  assert.strictEqual(persistence.cpu_model, 'Ryzen 7');
  assert.strictEqual(persistence.zone_id, null);
});

// ============================================================================
// 3. TELEMETRY SERVICE UNIT TESTS (EMPTY, TB RAM, DIAGNOSTICS, PRESETS)
// ============================================================================

test('TelemetryService Unit - handles empty fleet, TB RAM totals, diagnostics & preset deduplication', () => {
  const telemetry = new TelemetryService();

  const emptyMetrics = telemetry.calculateFleetMetrics([], [], []);
  assert.strictEqual(emptyMetrics.totalMachines, 0);
  assert.strictEqual(emptyMetrics.availability, '0%');
  assert.strictEqual(emptyMetrics.totalRamCapacity, '0 GB Total');

  const tbComputers = Array.from({ length: 32 }, (_, idx) => ({
    computer_id: idx + 1,
    computer_name: `PC-${idx + 1}`,
    status: idx === 0 ? ComputerStatus.MAINTENANCE : ComputerStatus.IN_USE,
    hardware_profile_id: 1
  }));
  const tbProfiles = [
    { profile_id: 1, gpu_model: 'RTX 4090', ram_capacity: '32GB DDR4', storage_type: 'NVMe (PCIe 4.0)', cpu_model: 'i9-14900K' }
  ];
  const zones = [{ zone_id: 1, zone_name: 'Esports' }];

  const tbMetrics = telemetry.calculateFleetMetrics(tbComputers, tbProfiles, zones);
  assert.ok(tbMetrics.totalRamCapacity.includes('1.0 TB Total'));
  assert.ok(tbMetrics.ramSpeed.includes('DDR4'));
  assert.strictEqual(tbMetrics.ioErrors, 1);

  const diagWithAlert = telemetry.calculateDiagnostics(tbComputers, zones);
  assert.strictEqual(diagWithAlert.alert.machineId, 'PC-1');
  assert.ok(diagWithAlert.sanThroughput.current.includes('Gbps'));

  const diagStable = telemetry.calculateDiagnostics([], []);
  assert.strictEqual(diagStable.alert.machineId, null);
  assert.strictEqual(diagStable.sanThroughput.current, '0 Gbps');

  const presets = telemetry.extractHardwarePresets(
    tbProfiles,
    [{ category: 'cpu', name: 'i9-14900K' }, { category: 'cpu', name: 'Ryzen 9 7950X' }]
  );
  assert.deepStrictEqual(presets.cpus, ['i9-14900K', 'Ryzen 9 7950X']);
});

// ============================================================================
// 4. HARDWARE PROFILE SERVICE UNIT TESTS (FALLBACKS, DEADLOCK, CONFLICTS, ERRORS)
// ============================================================================

test('HardwareProfileService Unit - computer fallback when profiles empty & error propagation', async () => {
  const mockDb = {
    HardwareProfile: { findAll: async () => [] },
    Computer: {
      findAll: async () => [
        { computer_id: 5, computer_name: 'PC-05', status: ComputerStatus.ONLINE, zone_id: 1, ComputerZone: { zone_id: 1, zone_name: 'VIP' } }
      ]
    },
    ComputerZone: { findAll: async () => [{ zone_id: 1, zone_name: 'VIP' }] }
  };

  const svc = new HardwareProfileService(mockDb);
  const res = await svc.getHardwareSpecs();
  assert.strictEqual(res.specs.length, 1);
  assert.strictEqual(res.specs[0].id, 'PC-05');
  assert.strictEqual(res.specs[0].cpu.model, 'Chưa thiết lập');

  const failingSvc = new HardwareProfileService({
    Computer: { findAll: async () => { throw new Error('DB Timeout'); } }
  });
  await assert.rejects(() => failingSvc.getHardwareSpecs(), (err) => err.statusCode === 500 && err.message === 'DB Timeout');
});

test('HardwareProfileService Unit - retries ER_LOCK_DEADLOCK, maps SequelizeUniqueConstraintError to 409, and handles update conflicts', async () => {
  let attempts = 0;
  const deadlockRetryDb = {
    HardwareProfile: {
      findOne: async () => null,
      create: async (data) => ({ profile_id: 77, ...data })
    },
    Computer: { update: async () => [1] },
    sequelize: {
      transaction: async (cb) => {
        attempts += 1;
        if (attempts === 1) {
          const deadlockErr = new Error('Deadlock');
          deadlockErr.parent = { code: 'ER_LOCK_DEADLOCK' };
          throw deadlockErr;
        }
        return cb({});
      }
    }
  };

  const svcRetry = new HardwareProfileService(deadlockRetryDb);
  const created = await svcRetry.createHardwareSpec({ profileName: 'Retry Profile' });
  assert.strictEqual(attempts, 2);
  assert.strictEqual(created.profile.profile_id, 77);

  // SequelizeUniqueConstraintError -> 409 Conflict
  const uniqueErrDb = {
    HardwareProfile: {
      findOne: async () => null,
      create: async () => {
        const err = new Error('Duplicate entry');
        err.name = 'SequelizeUniqueConstraintError';
        throw err;
      }
    },
    Computer: { update: async () => [0] },
    sequelize: { transaction: async (cb) => cb({}) }
  };
  const svcUnique = new HardwareProfileService(uniqueErrDb);
  await assert.rejects(
    () => svcUnique.createHardwareSpec({ profileName: 'Race Profile' }),
    (err) => err.statusCode === 409
  );

  // updateHardwareSpec rename conflict -> 409 & fallback softDelete
  const savedProfile = {
    profile_id: 10,
    profile_name: 'Old Name',
    is_active: true,
    save: async () => savedProfile
  };
  const conflictDb = {
    HardwareProfile: {
      findByPk: async () => savedProfile,
      findOne: async () => ({ profile_id: 11, profile_name: 'Taken Name' })
    },
    Computer: { update: async () => [0] },
    sequelize: { transaction: async (cb) => cb({}) }
  };
  const svcConflict = new HardwareProfileService(conflictDb);
  await assert.rejects(
    () => svcConflict.updateHardwareSpec(10, { profileName: 'Taken Name' }),
    (err) => err.statusCode === 409
  );

  // toggle without explicit boolean & fallback delete without softDelete method
  const toggled = await svcConflict.toggleHardwareSpec(10);
  assert.strictEqual(toggled.is_active, false);

  const deleted = await svcConflict.deleteHardwareSpec(10);
  assert.strictEqual(deleted, true);
  assert.strictEqual(savedProfile.is_deleted, true);
});

// ============================================================================
// 5. COMPUTER CONTROLLER HARDWARE UNIT TESTS
// ============================================================================

test('ComputerController Unit - hardware spec handlers return expected HTTP responses and forward errors', async () => {
  const originals = {
    getHardwareSpecs: computerService.getHardwareSpecs,
    createHardwareSpec: computerService.createHardwareSpec,
    updateHardwareSpec: computerService.updateHardwareSpec,
    toggleHardwareSpec: computerService.toggleHardwareSpec,
    deleteHardwareSpec: computerService.deleteHardwareSpec
  };

  try {
    computerService.getHardwareSpecs = async () => ({ specs: [] });
    const resGet = createMockRes();
    await computerController.getHardwareSpecs({}, resGet, () => {});
    assert.strictEqual(resGet.statusCode, 200);
    assert.strictEqual(resGet.body.status, 'success');

    computerService.createHardwareSpec = async (d) => ({ status: 'success', profile: d });
    const resPost = createMockRes();
    await computerController.createHardwareSpec({ body: { profileName: 'P1' } }, resPost, () => {});
    assert.strictEqual(resPost.statusCode, 201);

    computerService.updateHardwareSpec = async (id, d) => ({ status: 'success', profile: { id, ...d } });
    const resPut = createMockRes();
    await computerController.updateHardwareSpec({ params: { id: '1' }, body: { cpu: 'i9' } }, resPut, () => {});
    assert.strictEqual(resPut.statusCode, 200);

    // Toggle with undefined req.body must not throw TypeError
    computerService.toggleHardwareSpec = async (id, isActive) => ({ profile_id: Number(id), is_active: isActive ?? false });
    const resToggle = createMockRes();
    await computerController.toggleHardwareSpec({ params: { id: '1' } }, resToggle, () => {});
    assert.strictEqual(resToggle.statusCode, 200);

    // Delete returns 404 when service returns false
    computerService.deleteHardwareSpec = async () => false;
    const resDel404 = createMockRes();
    await computerController.deleteHardwareSpec({ params: { id: '999' } }, resDel404, () => {});
    assert.strictEqual(resDel404.statusCode, 404);

    // Error propagation to next()
    for (const [ctrlMethod, svcMethod] of Object.entries({
      getHardwareSpecs: 'getHardwareSpecs',
      createHardwareSpec: 'createHardwareSpec',
      updateHardwareSpec: 'updateHardwareSpec',
      toggleHardwareSpec: 'toggleHardwareSpec',
      deleteHardwareSpec: 'deleteHardwareSpec'
    })) {
      computerService[svcMethod] = async () => {
        const err = new Error(`Fail ${svcMethod}`);
        err.statusCode = 500;
        throw err;
      };
      let nextErr = null;
      await computerController[ctrlMethod]({ params: { id: '1' }, body: {} }, createMockRes(), (e) => { nextErr = e; });
      assert.ok(nextErr && nextErr.message === `Fail ${svcMethod}`);
    }
  } finally {
    Object.assign(computerService, originals);
  }
});
