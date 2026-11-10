const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const computerRoutes = require('../../../src/routes/computerRoutes');
const errorHandler = require('../../../src/middleware/errorHandler');
const computerService = require('../../../src/services/computerService');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole } = require('../../../src/constants/enums');
const db = require('../../../src/models');

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

test('Hardware Config Integration - getHardwareSpecs visibility & 409 rename conflict in MySQL', async () => {
  const ts = Date.now();
  const zone = await db.ComputerZone.findOne();
  assert.ok(zone, 'Database must have at least one ComputerZone');

  let p1Id = null;
  let p2Id = null;

  try {
    const p1 = await computerService.createHardwareSpec({
      profileName: `IT_Spec_A_${ts}`,
      zoneId: zone.zone_id,
      cpu: 'Core i5-14600K',
      gpu: 'RTX 4060 Ti'
    });
    const p2 = await computerService.createHardwareSpec({
      profileName: `IT_Spec_B_${ts}`,
      zoneId: zone.zone_id,
      cpu: 'Core i7-14700K',
      gpu: 'RTX 4070 Super'
    });
    p1Id = p1.profile.profile_id;
    p2Id = p2.profile.profile_id;

    // Verify both appear in getHardwareSpecs()
    const listRes = await computerService.getHardwareSpecs();
    assert.ok(listRes.specs.some((s) => s.profile_id === p1Id));
    assert.ok(listRes.specs.some((s) => s.profile_id === p2Id));

    // Rename p2 to p1's name -> 409 Conflict
    await assert.rejects(
      () => computerService.updateHardwareSpec(p2Id, { profileName: `IT_Spec_A_${ts}` }),
      (err) => err.statusCode === 409 && err.message.includes('đã tồn tại')
    );

    // Update p2 zone & description without losing cpu_model
    const updated = await computerService.updateHardwareSpec(p2Id, {
      zoneId: zone.zone_id,
      description: 'Updated description in MySQL'
    });
    assert.strictEqual(updated.profile.cpu_model, 'Core i7-14700K');
    assert.strictEqual(updated.profile.description, 'Updated description in MySQL');
  } finally {
    if (p1Id) await db.HardwareProfile.destroy({ where: { profile_id: p1Id } });
    if (p2Id) await db.HardwareProfile.destroy({ where: { profile_id: p2Id } });
  }
});

test('Hardware Config API - Complete RBAC matrix & HTTP edge cases across all /specs endpoints', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/computers', computerRoutes);
  app.use(errorHandler);

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/computers/specs`;

  const adminToken = generateToken({ user_id: 1, role: UserRole.ADMIN || 'ADMIN' });
  const employeeToken = generateToken({ user_id: 2, role: UserRole.EMPLOYEE || 'EMPLOYEE' });
  const memberToken = generateToken({ user_id: 3, role: UserRole.MEMBER || 'MEMBER' });
  const zone = await db.ComputerZone.findOne();
  let createdId = null;

  try {
    // 1. Invalid JWT -> 403 INVALID_TOKEN
    const invalidJwt = await requestJson(baseUrl, {
      headers: { Authorization: 'Bearer invalid.jwt.token' }
    });
    assert.strictEqual(invalidJwt.status, 403);
    assert.strictEqual(invalidJwt.json.error?.code, 'INVALID_TOKEN');

    // 2. Unauthenticated 401 across all write endpoints
    for (const [method, path] of [
      ['POST', baseUrl],
      ['PUT', `${baseUrl}/1`],
      ['PATCH', `${baseUrl}/1/toggle`],
      ['DELETE', `${baseUrl}/1`]
    ]) {
      const res = await requestJson(path, { method });
      assert.strictEqual(res.status, 401, `${method} ${path} must return 401 without token`);
    }

    // 3. Create profile as ADMIN -> 201
    const uniqueName = `API_Matrix_${Date.now()}`;
    const createOk = await requestJson(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        profileName: uniqueName,
        zoneId: zone.zone_id,
        cpu: 'Ryzen 9 7950X3D',
        gpu: 'RTX 4090'
      })
    });
    assert.strictEqual(createOk.status, 201);
    createdId = createOk.json.data.profile.profile_id;

    // 4. Duplicate profileName -> 409 Conflict
    const dupRes = await requestJson(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profileName: uniqueName, zoneId: zone.zone_id })
    });
    assert.strictEqual(dupRes.status, 409);

    // 5. XSS payload rejected with 400
    const xssRes = await requestJson(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ profileName: '<script>alert(1)</script>', zoneId: zone.zone_id })
    });
    assert.strictEqual(xssRes.status, 400);

    // 6. EMPLOYEE & MEMBER blocked (403) on PUT, PATCH /toggle, DELETE
    for (const token of [employeeToken, memberToken]) {
      for (const [method, path] of [
        ['PUT', `${baseUrl}/${createdId}`],
        ['PATCH', `${baseUrl}/${createdId}/toggle`],
        ['DELETE', `${baseUrl}/${createdId}`]
      ]) {
        const res = await requestJson(path, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: method === 'DELETE' ? undefined : JSON.stringify({})
        });
        assert.strictEqual(res.status, 403, `Non-admin must receive 403 on ${method} ${path}`);
      }
    }

    // 7. PATCH /:id/toggle without JSON body flips is_active -> 200 OK
    const toggleNoBody = await requestJson(`${baseUrl}/${createdId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(toggleNoBody.status, 200);
    assert.strictEqual(toggleNoBody.json.data.is_active, false);

    // 8. PUT /:id missing -> 404; DELETE /:id -> 200; repeat DELETE -> 404
    const putMissing = await requestJson(`${baseUrl}/999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ cpu: 'i9' })
    });
    assert.strictEqual(putMissing.status, 404);

    const delOk = await requestJson(`${baseUrl}/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delOk.status, 200);

    const delAgain = await requestJson(`${baseUrl}/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delAgain.status, 404);

    await db.HardwareProfile.destroy({ where: { profile_id: createdId } });
    createdId = null;
  } finally {
    if (createdId) {
      await db.HardwareProfile.destroy({ where: { profile_id: createdId } });
    }
    server.close();
  }
});

