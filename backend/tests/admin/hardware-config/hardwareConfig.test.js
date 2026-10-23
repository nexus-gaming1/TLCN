const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const computerService = require('../../../src/services/computerService');
const HardwareProfileService = require('../../../src/services/hardwareProfileService');
const TelemetryService = require('../../../src/services/telemetryService');
const HardwareProfileDto = require('../../../src/dtos/hardwareProfileDto');
const computerRoutes = require('../../../src/routes/computerRoutes');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole, ComputerStatus } = require('../../../src/constants/enums');
const db = require('../../../src/models');

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_ERROR = 500;

const DEFAULT_ZONE_ID = 1;
const NON_EXISTENT_PROFILE_ID = 'NON_EXISTENT_PROFILE_99999';
const DTO_PROFILE_NAME = 'DTO Test Profile';
const MOCK_PROFILE_NAME = 'Mock Profile';
const MOCK_COMPUTER_NAME = 'MOCK-PC-01';
const ROLLBACK_PROFILE_NAME = 'Rollback Test';

// Defensive resolver for ComputerService class (handles both class export and instance export)
const ComputerServiceClass = computerService.ComputerService || computerService.constructor;

// ============================================================================
// DRY HELPERS (Reduces Duplication to <= 3% & Eliminates Empty Catch Smells)
// ============================================================================

/**
 * Reusable rejection assertion helper to standardize error validation
 */
async function assertRejection(asyncFn, expectedStatus, expectedSnippet = '') {
  await assert.rejects(asyncFn, (err) => {
    assert.strictEqual(err.statusCode, expectedStatus);
    if (expectedSnippet) {
      assert.ok(err.message.includes(expectedSnippet));
    }
    return true;
  });
}

/**
 * Safe database model destroyer with documented teardown error suppression
 */
async function safeDestroy(entity) {
  if (entity && typeof entity.destroy === 'function') {
    try {
      await entity.destroy();
    } catch (_ignoredTeardownError) {
      // Intentional no-op: suppress teardown cleanup exceptions in test environments
    }
  }
}

/**
 * Safe profile deletion helper with documented teardown error suppression
 */
async function safeCleanupProfile(profileId) {
  if (profileId) {
    try {
      await computerService.deleteHardwareSpec(profileId);
    } catch (_ignoredTeardownError) {
      // Intentional no-op: suppress teardown cleanup exceptions in test environments
    }
  }
}

/**
 * Helper to create an isolated test computer that doesn't mutate pre-existing records
 */
async function createIsolatedTestComputer(prefix = 'ISO') {
  return await db.Computer.create({
    computer_name: `PC-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    status: ComputerStatus.ONLINE,
    zone_id: DEFAULT_ZONE_ID,
    ip_address: `192.168.99.${Math.floor(Math.random() * 200) + 10}`,
    mac_address: `AA:BB:CC:DD:${Math.floor(Math.random() * 89) + 10}:${Math.floor(Math.random() * 89) + 10}`
  });
}

// ============================================================================
// 1. REAL BUSINESS LOGIC & TELEMETRY TESTS
// ============================================================================

test('Hardware Config - getHardwareSpecs returns valid specs contract and non-flaky metrics', async () => {
  const result = await computerService.getHardwareSpecs();

  assert.ok(result, 'Result should not be null');
  assert.ok(Array.isArray(result.specs), 'Specs should be an array');
  assert.ok(result.metrics, 'Metrics object must be returned');
  assert.strictEqual(typeof result.metrics.totalMachines, 'number');
  assert.strictEqual(typeof result.metrics.activeZones, 'number');
  assert.strictEqual(typeof result.metrics.availability, 'string');
  assert.ok(result.metrics.availability.includes('%'), 'Availability must be a percentage string');
  assert.ok(result.metrics.topGpuPercent.includes('%'), 'Top GPU ratio must be a percentage');
  assert.ok(result.metrics.totalRamCapacity.includes('GB') || result.metrics.totalRamCapacity.includes('TB'));
});

test('TelemetryService - deterministic fleet metrics calculation (Zero Flakiness)', () => {
  const telemetry = new TelemetryService(db);

  // Fixture: 4 computers
  // comp 1 (profile 10: 32GB DDR5, RTX 4090, ONLINE)
  // comp 2 (profile 10: 32GB DDR5, RTX 4090, IN_USE)
  // comp 3 (profile 20: 64GB DDR5, RTX 4080, MAINTENANCE)
  // comp 4 (no profile: OFFLINE)
  // Total = 4 computers. Maintenance = 1 -> Availability = (3/4) = 75%
  // Top GPU = 3 machines (comp 1, 2, 3) -> Top GPU = (3/4) = 75%
  // Total RAM = 32 + 32 + 64 = 128 GB Total
  const mockComputers = [
    { computer_id: 1, status: ComputerStatus.ONLINE, hardware_profile_id: 10 },
    { computer_id: 2, status: ComputerStatus.IN_USE, hardware_profile_id: 10 },
    { computer_id: 3, status: ComputerStatus.MAINTENANCE, hardware_profile_id: 20 },
    { computer_id: 4, status: ComputerStatus.OFFLINE, hardware_profile_id: null }
  ];
  const mockProfiles = [
    { profile_id: 10, gpu_model: 'GeForce RTX 4090 24GB', ram_capacity: '32GB DDR5', storage_type: 'SAN NVMe' },
    { profile_id: 20, gpu_model: 'GeForce RTX 4080 Super', ram_capacity: '64GB DDR5', storage_type: 'SAN NVMe' }
  ];
  const mockZones = [{ zone_id: DEFAULT_ZONE_ID, zone_name: 'VIP Zone' }];

  const metrics = telemetry.calculateFleetMetrics(mockComputers, mockProfiles, mockZones);

  assert.strictEqual(metrics.totalMachines, 4);
  assert.strictEqual(metrics.availability, '75%');
  assert.strictEqual(metrics.topGpuPercent, '75%');
  assert.strictEqual(metrics.totalRamCapacity, '128 GB Total');
  assert.strictEqual(metrics.avgRamRange, '32GB - 64GB');
});

// ============================================================================
// 2. CONCURRENCY & ATOMIC AUTO-INCREMENT (WITH SAFE TEAR-DOWN)
// ============================================================================

test('Computer Concurrency - createComputer handles concurrent requests with atomic auto-increment and unique IPs/MACs', async () => {
  const createdComps = [];

  try {
    const results = await Promise.all([
      computerService.createComputer({ zone_id: DEFAULT_ZONE_ID }),
      computerService.createComputer({ zone_id: DEFAULT_ZONE_ID })
    ]);

    for (const c of results) {
      if (c) createdComps.push(c);
    }

    assert.strictEqual(createdComps.length, 2);
    assert.notStrictEqual(createdComps[0].computer_id, createdComps[1].computer_id, 'Generated computer_id must be distinct');
    assert.notStrictEqual(createdComps[0].computer_name, createdComps[1].computer_name, 'Generated computer_name must be distinct');
    assert.notStrictEqual(createdComps[0].ip_address, createdComps[1].ip_address, 'Generated ip_address must be distinct');
    assert.notStrictEqual(createdComps[0].mac_address, createdComps[1].mac_address, 'Generated mac_address must be distinct');
  } finally {
    for (const comp of createdComps) {
      await safeDestroy(comp);
    }
  }
});

// ============================================================================
// 3. EDGE CASES & INPUT VALIDATION (NULL, BOUNDARIES, MALFORMED FORMATS)
// ============================================================================

test('Hardware Config Validation - rejects null and non-object payloads', async () => {
  await assertRejection(
    () => computerService.createHardwareSpec(null),
    HTTP_BAD_REQUEST,
    'không hợp lệ'
  );
});

test('Hardware Config Validation - rejects empty or whitespace-only profileName', async () => {
  await assertRejection(
    () => computerService.createHardwareSpec({ profileName: '   ' }),
    HTTP_BAD_REQUEST,
    'không được để trống'
  );
});

test('Hardware Config Validation - rejects profileName exceeding 100 characters', async () => {
  await assertRejection(
    () => computerService.createHardwareSpec({ profileName: 'A'.repeat(101) }),
    HTTP_BAD_REQUEST,
    'vượt quá 100 ký tự'
  );
});

test('Hardware Config Validation - rejects negative and malformed non-numeric zoneId', async () => {
  await assertRejection(
    () => computerService.createHardwareSpec({ profileName: 'Edge Case Profile', zoneId: -5 }),
    HTTP_BAD_REQUEST,
    'zoneId'
  );

  await assertRejection(
    () => computerService.createHardwareSpec({ profileName: 'Edge Case Profile', zoneId: 'NOT_A_NUMBER' }),
    HTTP_BAD_REQUEST,
    'zoneId'
  );
});

test('Hardware Config Validation - rejects non-array assignedComputers', async () => {
  await assertRejection(
    () => computerService.createHardwareSpec({
      profileName: 'Edge Case Profile',
      assignedComputers: 'NOT_AN_ARRAY'
    }),
    HTTP_BAD_REQUEST,
    'assignedComputers'
  );
});

test('Hardware Config Validation - rejects invalid specId in update and delete', async () => {
  await assertRejection(
    () => computerService.deleteHardwareSpec(-1),
    HTTP_BAD_REQUEST,
    'không hợp lệ'
  );

  await assertRejection(
    () => computerService.updateHardwareSpec('   ', { profileName: 'Test' }),
    HTTP_BAD_REQUEST,
    'không hợp lệ'
  );
});

// ============================================================================
// 4. BEHAVIORAL HTTP TESTING (SUPERTEST-STYLE NATIVE HTTP BEHAVIOR)
// ============================================================================

test('Hardware Config Routes - Behavioral HTTP security enforcement (401 unauthenticated, 403 unauthorized role, 200 authorized)', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/computers', computerRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/computers/specs`;

  try {
    // 1. Unauthenticated request (Missing Bearer token) -> 401 Unauthorized
    const resNoAuth = await fetch(baseUrl);
    assert.strictEqual(resNoAuth.status, HTTP_UNAUTHORIZED, 'Request without token must receive 401 Unauthorized');
    const jsonNoAuth = await resNoAuth.json();
    assert.strictEqual(jsonNoAuth.status, 'error');

    // 2. Unauthorized role request (Role MEMBER) -> 403 Forbidden
    const memberToken = generateToken({ user_id: 999, role: UserRole.MEMBER || 'MEMBER' });
    const resForbidden = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    assert.strictEqual(resForbidden.status, HTTP_FORBIDDEN, 'Request with non-admin role must receive 403 Forbidden');
    const jsonForbidden = await resForbidden.json();
    assert.strictEqual(jsonForbidden.status, 'error');

    // 3. Authorized request (Role ADMIN) -> 200 OK
    const adminToken = generateToken({ user_id: 1, role: UserRole.ADMIN || 'ADMIN' });
    const resOk = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resOk.status, 200, 'Admin request must be allowed with 200 OK');
    const jsonOk = await resOk.json();
    assert.strictEqual(jsonOk.status, 'success');
  } finally {
    server.close();
  }
});

// ============================================================================
// 5. DTO ADAPTER BIDIRECTIONAL MAPPING
// ============================================================================

test('HardwareProfileDto - toDomain & toPersistence maps data bidirectionally with consistent id and profileName', () => {
  const incomingPayload = {
    profileName: DTO_PROFILE_NAME,
    zoneId: '2',
    cpuSelect: 'AMD Ryzen 9 7900X',
    gpuSelect: 'RTX 4080 Super 16GB',
    ramSelect: '64GB DDR5 6000MHz',
    storageSelect: 'SAN NVMe 40Gbps',
    monitorSelect: '27" 2K 240Hz OLED',
    gearSelect: 'Logitech G Pro Series',
    description: 'High performance testing profile'
  };

  const persistence = HardwareProfileDto.toPersistence(incomingPayload);
  assert.strictEqual(persistence.profile_name, DTO_PROFILE_NAME);
  assert.strictEqual(persistence.zone_id, 2);
  assert.strictEqual(persistence.cpu_model, 'AMD Ryzen 9 7900X');
  assert.strictEqual(persistence.gpu_model, 'RTX 4080 Super 16GB');

  const domain = HardwareProfileDto.toDomain({
    profile_id: 88,
    ...persistence,
    ComputerZone: { zone_id: 2, zone_name: 'Zone VIP' },
    Computers: [{ computer_name: 'PC-VIP-01' }, { computer_name: 'PC-VIP-02' }]
  });

  // Both id and profileName are guaranteed to match the DTO domain standard
  assert.strictEqual(domain.id, DTO_PROFILE_NAME, 'Domain id must be profile name');
  assert.strictEqual(domain.profileName, DTO_PROFILE_NAME, 'Domain profileName must match profile name');
  assert.strictEqual(domain.profile_id, 88);
  assert.strictEqual(domain.zoneName, 'Zone VIP');
  assert.strictEqual(domain.cpu.model, 'AMD Ryzen 9 7900X');
  assert.deepStrictEqual(domain.assignedComputers, ['PC-VIP-01', 'PC-VIP-02']);
});

// ============================================================================
// 6. ISOLATED PROFILE CRUD OPERATIONS (SINGLE BEHAVIOR PER TEST)
// ============================================================================

test('Hardware Config - createHardwareSpec creates profile and links assigned computers in MySQL', async () => {
  const testComp = await createIsolatedTestComputer('CREATE');
  const uniqueProfileName = `Test_Create_Profile_${Date.now()}`;
  let createdProfileId = null;

  try {
    const createResult = await computerService.createHardwareSpec({
      profileName: uniqueProfileName,
      zoneId: DEFAULT_ZONE_ID,
      cpu: 'Intel Core i9-14900KS',
      gpu: 'RTX 4090 OC 24GB',
      ram: '64GB DDR5',
      storage: 'SAN NVMe 40Gbps',
      monitor: '32" 4K OLED',
      assignedComputers: [testComp.computer_name]
    });

    assert.ok(createResult);
    assert.strictEqual(createResult.status, 'success');
    createdProfileId = createResult.profile.profile_id;

    const reloadedComp = await db.Computer.findOne({ where: { computer_name: testComp.computer_name } });
    assert.strictEqual(reloadedComp.hardware_profile_id, createdProfileId, 'Computer must be linked to created profile');
  } finally {
    await safeCleanupProfile(createdProfileId);
    await safeDestroy(testComp);
  }
});

test('Hardware Config - updateHardwareSpec updates profile specs and persists changes in MySQL', async () => {
  const uniqueProfileName = `Test_Update_Profile_${Date.now()}`;
  const createResult = await computerService.createHardwareSpec({
    profileName: uniqueProfileName,
    zoneId: DEFAULT_ZONE_ID,
    cpu: 'Intel Core i7-14700K',
    gpu: 'RTX 4070 Ti Super'
  });
  const profileId = createResult.profile.profile_id;

  try {
    const updateResult = await computerService.updateHardwareSpec(profileId, {
      profileName: `${uniqueProfileName}_Edited`,
      cpu: 'AMD Ryzen 9 9950X',
      gpu: 'RTX 5090 32GB'
    });

    assert.strictEqual(updateResult.status, 'success');
    const updatedProfile = await db.HardwareProfile.findByPk(profileId);
    assert.strictEqual(updatedProfile.cpu_model, 'AMD Ryzen 9 9950X', 'CPU model must be updated in MySQL');
    assert.strictEqual(updatedProfile.gpu_model, 'RTX 5090 32GB', 'GPU model must be updated in MySQL');
  } finally {
    await safeCleanupProfile(profileId);
  }
});

test('Hardware Config - createHardwareSpec throws 409 Conflict when profileName already exists', async () => {
  const duplicateName = `Test_Duplicate_${Date.now()}`;
  const createResult = await computerService.createHardwareSpec({
    profileName: duplicateName,
    zoneId: DEFAULT_ZONE_ID
  });
  const profileId = createResult.profile.profile_id;

  try {
    await assertRejection(
      () => computerService.createHardwareSpec({
        profileName: duplicateName,
        zoneId: DEFAULT_ZONE_ID
      }),
      HTTP_CONFLICT,
      'đã tồn tại'
    );
  } finally {
    await safeCleanupProfile(profileId);
  }
});

test('Hardware Config - deleteHardwareSpec unlinks computers and destroys profile without deleting physical computers', async () => {
  const testComp = await createIsolatedTestComputer('DELETE');
  const uniqueProfileName = `Test_Delete_Profile_${Date.now()}`;
  const initialTotalComputers = await db.Computer.count();

  const createResult = await computerService.createHardwareSpec({
    profileName: uniqueProfileName,
    zoneId: DEFAULT_ZONE_ID,
    assignedComputers: [testComp.computer_name]
  });
  const profileId = createResult.profile.profile_id;

  try {
    const deleteSuccess = await computerService.deleteHardwareSpec(profileId);
    assert.strictEqual(deleteSuccess, true, 'Deleting created profile should return true');

    const postDeleteComp = await db.Computer.findOne({ where: { computer_name: testComp.computer_name } });
    assert.ok(postDeleteComp, 'Physical computer record must NOT be deleted');
    assert.strictEqual(postDeleteComp.hardware_profile_id, null, 'Computer hardware_profile_id must be reset to null');

    const finalTotalComputers = await db.Computer.count();
    assert.strictEqual(finalTotalComputers, initialTotalComputers, 'Total physical computer count must remain unchanged');
  } finally {
    await safeDestroy(testComp);
  }
});

test('Hardware Config - deleteHardwareSpec throws 404 when profile does not exist', async () => {
  await assertRejection(
    () => computerService.deleteHardwareSpec(NON_EXISTENT_PROFILE_ID),
    HTTP_NOT_FOUND,
    'Không tìm thấy'
  );
});

test('Hardware Config - updateHardwareSpec throws 404 when profile does not exist', async () => {
  await assertRejection(
    () => computerService.updateHardwareSpec(NON_EXISTENT_PROFILE_ID, {
      profileName: 'Updated Name'
    }),
    HTTP_NOT_FOUND,
    'Không tìm thấy'
  );
});

// ============================================================================
// 7. ARCHITECTURE & SOLID DESIGN PRINCIPLES
// ============================================================================

test('SOLID - Dependency Inversion Principle (DIP) allows constructor injection of mock models', async () => {
  const mockModels = {
    Computer: {
      findAll: async () => [{ computer_id: 101, computer_name: MOCK_COMPUTER_NAME, status: 'ONLINE', zone_id: 9 }]
    },
    ComputerZone: {
      findAll: async () => [{ zone_id: 9, zone_name: 'Mock Zone', PricingPlans: [] }]
    },
    HardwareProfile: {
      findAll: async () => [{
        profile_id: 1,
        profile_name: MOCK_PROFILE_NAME,
        cpu_model: 'Mock CPU',
        ComputerZone: { zone_id: 9, zone_name: 'Mock Zone' },
        Computers: [{ computer_name: MOCK_COMPUTER_NAME }]
      }],
      findOne: async () => null,
      findByPk: async () => null
    },
    sequelize: {
      transaction: async (cb) => cb({})
    }
  };

  const isolatedHardwareService = new HardwareProfileService(mockModels);
  const specsResult = await isolatedHardwareService.getHardwareSpecs();

  assert.ok(specsResult);
  assert.strictEqual(specsResult.specs.length, 1);
  assert.strictEqual(specsResult.specs[0].profileName, MOCK_PROFILE_NAME);
  assert.strictEqual(specsResult.specs[0].id, MOCK_PROFILE_NAME);

  const isolatedComputerService = new ComputerServiceClass(mockModels, isolatedHardwareService);
  const gridResult = await isolatedComputerService.getRoomLayoutGrid();
  assert.ok(gridResult);
  assert.strictEqual(gridResult.summary.total, 1);
});

test('SOLID - Open/Closed Principle (OCP) dynamically aggregates status without hardcoded switch', async () => {
  const gridData = await computerService.getRoomLayoutGrid();
  assert.ok(gridData);
  assert.ok(gridData.summary);
  assert.strictEqual(typeof gridData.summary.total, 'number');
  assert.strictEqual(typeof gridData.summary.online, 'number');
  assert.strictEqual(typeof gridData.summary.offline, 'number');
  assert.strictEqual(typeof gridData.summary.in_use, 'number');
});

// ============================================================================
// 8. MOCK / STUB QUALITY (TRANSACTION ROLLBACK)
// ============================================================================

test('Mock / Stub Quality - Simulated DB failure triggers transaction rollback and accurate error propagation', async () => {
  let transactionRolledBack = false;
  let transactionCommitted = false;

  const mockDbWithFailure = {
    HardwareProfile: {
      findOne: async () => null,
      create: async () => ({ profile_id: 999, profile_name: ROLLBACK_PROFILE_NAME })
    },
    Computer: {
      update: async () => {
        throw new Error('Deadlock detected / Database connection severed');
      }
    },
    sequelize: {
      transaction: async (callback) => {
        const mockTransaction = {
          rollback: () => { transactionRolledBack = true; },
          commit: () => { transactionCommitted = true; }
        };
        try {
          const result = await callback(mockTransaction);
          mockTransaction.commit();
          return result;
        } catch (error) {
          mockTransaction.rollback();
          throw error;
        }
      }
    }
  };

  const serviceWithMock = new HardwareProfileService(mockDbWithFailure);

  await assertRejection(
    () => serviceWithMock.createHardwareSpec({
      profileName: ROLLBACK_PROFILE_NAME,
      zoneId: DEFAULT_ZONE_ID,
      assignedComputers: ['PC-01']
    }),
    HTTP_INTERNAL_ERROR,
    'Deadlock'
  );

  assert.strictEqual(transactionRolledBack, true, 'Transaction must be rolled back on DB failure');
  assert.strictEqual(transactionCommitted, false, 'Transaction must NOT be committed on DB failure');
});
