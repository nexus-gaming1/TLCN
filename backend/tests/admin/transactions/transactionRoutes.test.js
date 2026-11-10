const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const router = require('../../../src/routes/transactionRoutes');
const errorHandler = require('../../../src/middleware/errorHandler');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole } = require('../../../src/constants/enums');
const db = require('../../../src/models');

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

test('transactionRoutes - RBAC middleware stack verification', () => {
  const routes = router.stack
    .filter((l) => l.route)
    .map((l) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods),
      stackNames: l.route.stack.map((s) => s.name),
      stackLength: l.route.stack.length
    }));

  for (const def of [
    { path: '/', method: 'get' },
    { path: '/topup', method: 'post' },
    { path: '/withdraw', method: 'post' },
    { path: '/:id/refund', method: 'post' }
  ]) {
    const route = routes.find((r) => r.path === def.path && r.methods.includes(def.method));
    assert.ok(route, `Route ${def.method.toUpperCase()} ${def.path} must exist`);
    assert.strictEqual(route.stackLength, 3);
    assert.ok(route.stackNames.includes('authenticateToken'));
  }

  const webhook = routes.find((r) => r.path === '/webhook/sepay' && r.methods.includes('post'));
  assert.ok(webhook);
  assert.ok(webhook.stackNames.includes('verifySePayWebhook'));
});

test('transactionRoutes - API E2E HTTP RBAC, Validation, TopUp, Withdraw, Refund & Webhook', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/transactions', router);
  app.use(errorHandler);

  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/transactions`;

  const ts = Date.now();
  let testUser = null;
  let testMember = null;
  const createdTxnIds = [];
  const origWebhookToken = process.env.SEPAY_WEBHOOK_TOKEN;
  process.env.SEPAY_WEBHOOK_TOKEN = 'TEST_SEPAY_SECRET_123';

  try {
    const adminUser = await db.User.findOne({ where: { role: UserRole.ADMIN } });
    testUser = await db.User.create({
      username: `txn_api_${ts}`,
      password_hash: 'hashed',
      full_name: `Khách API ${ts}`,
      role: UserRole.MEMBER
    });
    testMember = await db.Member.create({
      member_id: testUser.user_id,
      phone: `08${String(ts).slice(-8)}`,
      real_balance: 20000,
      point: 0
    });

    const adminToken = generateToken({ user_id: adminUser ? adminUser.user_id : 1, role: UserRole.ADMIN });
    const employeeToken = generateToken({ user_id: adminUser ? adminUser.user_id : 2, role: UserRole.EMPLOYEE });
    const memberToken = generateToken({ user_id: testUser.user_id, role: UserRole.MEMBER });

    // 1. Unauthenticated 401, Invalid JWT 403, & MEMBER 403 across all protected endpoints
    const protectedEndpoints = [
      ['GET', baseUrl],
      ['POST', `${baseUrl}/topup`],
      ['POST', `${baseUrl}/withdraw`],
      ['POST', `${baseUrl}/1/refund`]
    ];
    for (const [method, path] of protectedEndpoints) {
      const noAuth = await requestJson(path, { method });
      assert.strictEqual(noAuth.status, 401);

      const memberRes = await requestJson(path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
        body: method === 'GET' ? undefined : JSON.stringify({})
      });
      assert.strictEqual(memberRes.status, 403);
    }

    const badJwt = await requestJson(baseUrl, { headers: { Authorization: 'Bearer bad.token' } });
    assert.strictEqual(badJwt.status, 403);

    // 3. EMPLOYEE allowed on GET /, POST /topup, POST /withdraw
    const empGet = await requestJson(`${baseUrl}?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(empGet.status, 200);
    assert.strictEqual(empGet.json.status, 'success');

    const empTopUp = await requestJson(`${baseUrl}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({ member_id: testMember.member_id, amount: 50000, payment_method: 'CASH' })
    });
    assert.strictEqual(empTopUp.status, 201);
    createdTxnIds.push(empTopUp.json.data.transaction_id);

    const empWithdraw = await requestJson(`${baseUrl}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({ member_id: testMember.member_id, amount: 10000 })
    });
    assert.strictEqual(empWithdraw.status, 201);
    createdTxnIds.push(empWithdraw.json.data.transaction_id);

    // 4. EMPLOYEE blocked (403) on refund; ADMIN allowed (200) + 400 + 404
    const empRefund = await requestJson(`${baseUrl}/${createdTxnIds[0]}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({ reason: 'Unauthorized attempt' })
    });
    assert.strictEqual(empRefund.status, 403);

    const badTopUp = await requestJson(`${baseUrl}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ member_id: testMember.member_id, amount: -500 })
    });
    assert.strictEqual(badTopUp.status, 400);

    const missingRefund = await requestJson(`${baseUrl}/99999999/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Not found' })
    });
    assert.strictEqual(missingRefund.status, 404);

    const adminRefund = await requestJson(`${baseUrl}/${createdTxnIds[0]}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Hoàn tiền kiểm thử API' })
    });
    assert.strictEqual(adminRefund.status, 200);
    assert.strictEqual(adminRefund.json.data.status, 'REFUNDED');

    // 5. Webhook SePay route 401 & 200
    const badWebhook = await requestJson(`${baseUrl}/webhook/sepay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer WRONG' },
      body: JSON.stringify({ amount: 25000, content: `NEXUS${testMember.member_id}` })
    });
    assert.strictEqual(badWebhook.status, 401);

    const okWebhook = await requestJson(`${baseUrl}/webhook/sepay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer TEST_SEPAY_SECRET_123' },
      body: JSON.stringify({
        amount: 25000,
        content: `NEXUS${testMember.member_id}`,
        referenceCode: `SEPAY_API_${ts}`
      })
    });
    assert.strictEqual(okWebhook.status, 200);
    createdTxnIds.push(okWebhook.json.data.transaction_id);
  } finally {
    if (origWebhookToken === undefined) delete process.env.SEPAY_WEBHOOK_TOKEN;
    else process.env.SEPAY_WEBHOOK_TOKEN = origWebhookToken;

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
      // Ignore cleanup errors
    }
    server.close();
  }
});
