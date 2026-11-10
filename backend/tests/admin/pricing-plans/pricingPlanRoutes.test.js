const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const router = require('../../../src/routes/pricingPlanRoutes');
const errorHandler = require('../../../src/middleware/errorHandler');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole } = require('../../../src/constants/enums');
const db = require('../../../src/models');

/**
 * ==============================================================================
 * MA TRẬN TRUY VẾT ACCEPTANCE CRITERIA:
 * AC-01: Phân quyền & Bảo mật API (Role-Based Access Control)
 * - Tuyến đọc dữ liệu (GET): Công khai (Public)
 * - Tuyến ghi dữ liệu tiền tệ (POST, PUT, PATCH, DELETE): Bắt buộc xác thực Bearer Token
 *   và phân quyền nghiêm ngặt chỉ cấp phép Quản trị viên (ADMIN).
 * ==============================================================================
 */

test('[AC-01] [Ca dương & Ca âm] pricingPlanRoutes - Security & Role Authorization verification', () => {
  // Map toàn bộ route layers được đăng ký trong router
  const routes = router.stack
    .filter(layer => layer.route)
    .map(layer => {
      const methods = Object.keys(layer.route.methods);
      const path = layer.route.path;
      const stackNames = layer.route.stack.map(s => s.name);
      return { path, methods, stackNames, stackLength: layer.route.stack.length };
    });

  // [Ca dương - Public Access]: GET / và GET /:id không yêu cầu token
  const getList = routes.find(r => r.path === '/' && r.methods.includes('get'));
  assert.ok(getList, 'Route GET / phải tồn tại');
  assert.strictEqual(getList.stackLength, 1, 'Route GET / phải mở công khai (không chặn middleware auth)');

  const getDetail = routes.find(r => r.path === '/:id' && r.methods.includes('get'));
  assert.ok(getDetail, 'Route GET /:id phải tồn tại');
  assert.strictEqual(getDetail.stackLength, 1, 'Route GET /:id phải mở công khai');

  // [Ca âm & Ca biên - Protected Admin Operations]: POST, PUT, PATCH, DELETE
  const protectedDefs = [
    { path: '/', method: 'post', desc: 'Tạo bảng giá mới' },
    { path: '/:id', method: 'put', desc: 'Cập nhật bảng giá' },
    { path: '/:id/toggle', method: 'patch', desc: 'Bật/tắt kích hoạt' },
    { path: '/:id/restore', method: 'patch', desc: 'Khôi phục bảng giá' },
    { path: '/:id', method: 'delete', desc: 'Xóa bảng giá' },
  ];

  for (const def of protectedDefs) {
    const route = routes.find(r => r.path === def.path && r.methods.includes(def.method));
    assert.ok(route, `Route ${def.method.toUpperCase()} ${def.path} (${def.desc}) phải tồn tại`);

    // Bắt buộc phải có đủ 3 middleware trong chuỗi thực thi:
    // 1. authenticateToken (Xác thực Bearer JWT)
    // 2. authorizeRoles (Phân quyền Admin)
    // 3. Controller handler
    assert.strictEqual(
      route.stackLength,
      3,
      `Route ${def.method.toUpperCase()} ${def.path} phải có đúng 3 middleware (authenticateToken, authorizeRoles, controller)`
    );

    assert.ok(
      route.stackNames.includes('authenticateToken'),
      `Route ${def.method.toUpperCase()} ${def.path} bắt buộc phải có authenticateToken middleware`
    );
  }
});

test('[AC-02] [API E2E] pricingPlanRoutes - Happy Hour & CRUD HTTP End-to-End with RBAC', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/pricing-plans', router);
  app.use(errorHandler);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/pricing-plans`;

  const adminToken = generateToken({ user_id: 1, role: UserRole.ADMIN || 'ADMIN' });
  const employeeToken = generateToken({ user_id: 2, role: UserRole.EMPLOYEE || 'EMPLOYEE' });
  let createdPlanId = null;

  try {
    // 1. Public GET /api/pricing-plans -> 200 OK
    const publicGet = await fetch(baseUrl);
    assert.strictEqual(publicGet.status, 200);
    const getJson = await publicGet.json();
    assert.strictEqual(getJson.status, 'success');

    // 2. Unauthenticated POST /api/pricing-plans -> 401 Unauthorized
    const noAuthPost = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test NoAuth', price_per_hour: 10000 })
    });
    assert.strictEqual(noAuthPost.status, 401);

    // 3. Unauthorized EMPLOYEE POST /api/pricing-plans -> 403 Forbidden
    const empPost = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({ name: 'Test Emp', price_per_hour: 10000 })
    });
    assert.strictEqual(empPost.status, 403);

    // 4. ADMIN POST with mismatched Happy Hour window (missing end_time) -> 400 Bad Request
    const badHappyHour = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Bad_HH_${Date.now()}`,
        price_per_hour: 12000,
        start_time: '08:00:00'
      })
    });
    assert.strictEqual(badHappyHour.status, 400);

    // 5. ADMIN POST valid Happy Hour Plan -> 201 Created
    const hhRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `API_HappyHour_${Date.now()}`,
        price_per_hour: 12000,
        plan_type: 'LOCAL',
        start_time: '08:00:00',
        end_time: '12:00:00',
        is_active: true
      })
    });
    assert.strictEqual(hhRes.status, 201);
    const hhJson = await hhRes.json();
    assert.strictEqual(hhJson.status, 'success');
    createdPlanId = hhJson.data.pricing_plan_id;

    // 6. GET /:id (200 & 404)
    const getDetailOk = await fetch(`${baseUrl}/${createdPlanId}`);
    assert.strictEqual(getDetailOk.status, 200);
    const getDetailMissing = await fetch(`${baseUrl}/999999`);
    assert.strictEqual(getDetailMissing.status, 404);

    // 7. ADMIN PUT /:id -> 200 OK & 400 Bad Request & 404 Not Found
    const putOk = await fetch(`${baseUrl}/${createdPlanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price_per_hour: 14000, start_time: '09:00', end_time: '11:00' })
    });
    assert.strictEqual(putOk.status, 200);
    const putJson = await putOk.json();
    assert.strictEqual(Number(putJson.data.price_per_hour), 14000);

    const putBad = await fetch(`${baseUrl}/${createdPlanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price_per_hour: -100 })
    });
    assert.strictEqual(putBad.status, 400);

    const putMissing = await fetch(`${baseUrl}/999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price_per_hour: 15000 })
    });
    assert.strictEqual(putMissing.status, 404);

    // 8. ADMIN PATCH /:id/toggle -> 200 OK & 404 Not Found
    const toggleRes = await fetch(`${baseUrl}/${createdPlanId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(toggleRes.status, 200);
    const toggleJson = await toggleRes.json();
    assert.strictEqual(toggleJson.data.is_active, false);

    const toggleMissing = await fetch(`${baseUrl}/999999/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(toggleMissing.status, 404);

    // 9. MEMBER role blocked on DELETE /:id -> 403 Forbidden
    const memberToken = generateToken({ user_id: 99, role: UserRole.MEMBER || 'MEMBER' });
    const memberDel = await fetch(`${baseUrl}/${createdPlanId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    assert.strictEqual(memberDel.status, 403);

    // 10. ADMIN DELETE /:id (Soft Delete) -> 200 OK & 404 Not Found
    const delRes = await fetch(`${baseUrl}/${createdPlanId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);

    const delMissing = await fetch(`${baseUrl}/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delMissing.status, 404);

    const dbDeleted = await db.PricingPlan.findByPk(createdPlanId);
    assert.ok(dbDeleted, 'Soft-deleted pricing plan must still exist in DB');
    assert.strictEqual(dbDeleted.is_deleted, true);

    // 11. EMPLOYEE blocked on PATCH /:id/restore -> 403; ADMIN restores -> 200 OK; Missing -> 404
    const empRestore = await fetch(`${baseUrl}/${createdPlanId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(empRestore.status, 403);

    const adminRestore = await fetch(`${baseUrl}/${createdPlanId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminRestore.status, 200);
    const restoreJson = await adminRestore.json();
    assert.strictEqual(restoreJson.data.is_deleted, false);

    const restoreMissing = await fetch(`${baseUrl}/999999/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(restoreMissing.status, 404);

    await dbDeleted.destroy(); // cleanup test artifact
    createdPlanId = null;
  } finally {
    if (createdPlanId) {
      await db.PricingPlan.destroy({ where: { pricing_plan_id: createdPlanId } });
    }
    server.close();
  }
});
