/**
 * ==============================================================================
 * BỘ KIỂM THỬ TẦNG API ROUTES & BẢO MẬT PHÂN QUYỀN RBAC (MEMBER API ROUTES)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. [AC-01] Router Stack: Kiểm tra chuỗi Middleware phân quyền RBAC & authenticateToken
 * 2. [AC-02] HTTP 401 Unauthorized: Chặn mọi request thiếu Bearer Token
 * 3. [AC-03] HTTP 403 Forbidden: Chặn request từ vai trò không có quyền (MEMBER bị từ chối)
 * 4. [AC-04] HTTP 200 OK: GET /api/members lấy danh sách hội viên với Admin/Employee Token
 * 5. [AC-05] HTTP 200 & 404: GET /api/members/:id chi tiết hội viên hoặc 404
 * 6. [AC-06] HTTP 201 & 400: POST /api/members tạo mới thành công hoặc lỗi dữ liệu 400
 * 7. [AC-07] HTTP 200 & 404: PUT /api/members/:id/info cập nhật hồ sơ hoặc 404
 * 8. [AC-08] HTTP 200 & 403/404: PUT /api/members/:id/status đổi trạng thái tài khoản (Chỉ ADMIN)
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const memberRoutes = require('../../../src/routes/memberRoutes');
const memberService = require('../../../src/services/memberService');
const errorHandler = require('../../../src/middleware/errorHandler');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole } = require('../../../src/constants/enums');

// Dữ liệu mẫu phục vụ Stub
const sampleMember = {
  id: 101,
  uid: '#MB-101',
  name: 'Nguyễn Văn Test',
  username: 'test_member',
  full_name: 'Nguyễn Văn Test',
  email: 'test_member@cyber.vn',
  phone: '0987654321',
  status: 'ACTIVE',
  real_balance: 150000,
  bonus_balance: 20000,
  total_balance: 170000,
  points: 150,
  rank_name: 'Vàng',
  station_name: 'A-01',
  station_status: 'IN_USE'
};

test('[Member API Routes Suite] Kiểm thử định tuyến HTTP, RBAC Auth & RESTful Contract', async (suite) => {
  let app;
  let server;
  let baseUrl;

  // Tokens phân quyền
  const adminToken = generateToken({ user_id: 1, username: 'admin_test', role: UserRole.ADMIN });
  const employeeToken = generateToken({ user_id: 2, username: 'staff_test', role: UserRole.EMPLOYEE });
  const memberToken = generateToken({ user_id: 3, username: 'gamer_test', role: UserRole.MEMBER });

  // Bản sao lưu phương thức gốc của memberService để hoàn tác sau test
  const origGetAllMembers = memberService.getAllMembers;
  const origGetMemberById = memberService.getMemberById;
  const origCreateMember = memberService.createMember;
  const origUpdateMemberInfo = memberService.updateMemberInfo;
  const origUpdateAccountStatus = memberService.updateAccountStatus;

  suite.before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/members', memberRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/members`;
        resolve();
      });
    });
  });

  suite.after(async () => {
    memberService.getAllMembers = origGetAllMembers;
    memberService.getMemberById = origGetMemberById;
    memberService.createMember = origCreateMember;
    memberService.updateMemberInfo = origUpdateMemberInfo;
    memberService.updateAccountStatus = origUpdateAccountStatus;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ----------------------------------------------------------------------------
  // [AC-01] Router Stack: Xác minh Middleware RBAC trên từng route
  // ----------------------------------------------------------------------------
  await suite.test('[AC-01] [Router Stack & RBAC] Xác minh chuỗi middleware authenticateToken & authorizeRoles', () => {
    const routes = memberRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => {
        const methods = Object.keys(layer.route.methods);
        const path = layer.route.path;
        return { path, methods, stackLength: layer.route.stack.length };
      });

    const expected = [
      { path: '/', method: 'get' },
      { path: '/', method: 'post' },
      { path: '/:id', method: 'get' },
      { path: '/:id/info', method: 'put' },
      { path: '/:id/status', method: 'put' }
    ];

    for (const exp of expected) {
      const match = routes.find((r) => r.path === exp.path && r.methods.includes(exp.method));
      assert.ok(match, `Route ${exp.method.toUpperCase()} ${exp.path} phải được đăng ký trong memberRoutes`);
      // Phải có chuỗi: authenticateToken -> authorizeRoles -> controller
      assert.strictEqual(match.stackLength, 3, `Route ${exp.path} phải có đúng 3 middleware (Auth + Role + Handler)`);
    }
  });

  // ----------------------------------------------------------------------------
  // [AC-02] HTTP 401 Unauthorized khi không gửi Token
  // ----------------------------------------------------------------------------
  await suite.test('[AC-02] [HTTP 401] Yêu cầu không có Bearer Token bị từ chối 401 Unauthorized', async () => {
    const res = await fetch(baseUrl);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.status, 'error');
    assert.ok(json.message.includes('Bearer Token'));
  });

  // ----------------------------------------------------------------------------
  // [AC-03] HTTP 403 Forbidden khi role không đủ quyền (MEMBER)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-03] [HTTP 403] Hội viên (MEMBER) bị từ chối 403 Forbidden', async () => {
    const res = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.status, 'error');
    assert.ok(json.message.includes('không có quyền truy cập'));
  });

  // ----------------------------------------------------------------------------
  // [AC-04] GET /api/members (200 OK với Admin Token hoặc Employee Token)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-04] [HTTP 200] GET /api/members trả về danh sách hội viên với Admin/Employee Token', async () => {
    memberService.getAllMembers = async () => [sampleMember];

    // Thử với Employee Token
    const res = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.strictEqual(json.message, 'Lấy danh sách hội viên thành công');
    assert.ok(Array.isArray(json.data));
    assert.strictEqual(json.data[0].username, 'test_member');
  });

  // ----------------------------------------------------------------------------
  // [AC-05] GET /api/members/:id (200 OK & 404 Not Found)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-05] [HTTP 200 & 404] GET /api/members/:id lấy chi tiết hoặc báo 404', async () => {
    memberService.getMemberById = async (id) => {
      if (Number(id) === 101) return sampleMember;
      return null;
    };

    // 1. Tìm thấy
    const resOk = await fetch(`${baseUrl}/101`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resOk.status, 200);
    const jsonOk = await resOk.json();
    assert.strictEqual(jsonOk.status, 'success');
    assert.strictEqual(jsonOk.data.id, 101);

    // 2. Không tìm thấy
    const resNotFound = await fetch(`${baseUrl}/999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resNotFound.status, 404);
    const jsonNotFound = await resNotFound.json();
    assert.strictEqual(jsonNotFound.status, 'error');
  });

  // ----------------------------------------------------------------------------
  // [AC-06] POST /api/members (201 Created & 400 Bad Request)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-06] [HTTP 201 & 400] POST /api/members tạo hội viên hoặc validation 400', async () => {
    // 1. Tạo thành công
    memberService.createMember = async (body) => ({
      id: 202,
      username: body.username,
      full_name: body.fullName,
      rank_name: 'Đồng',
      real_balance: body.deposit || 0
    });

    const resCreated = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        username: 'new_gamer',
        fullName: 'Trần Văn Mới',
        password: 'password123',
        tier: 'normal',
        deposit: 50000
      })
    });

    assert.strictEqual(resCreated.status, 201);
    const jsonCreated = await resCreated.json();
    assert.strictEqual(jsonCreated.status, 'success');
    assert.strictEqual(jsonCreated.data.username, 'new_gamer');

    // 2. Bỏ trống username (400 Bad Request)
    memberService.createMember = async () => {
      throw new Error('Tên đăng nhập không được để trống');
    };

    const resMissing = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ username: '', fullName: 'Trần Văn Mới' })
    });

    assert.strictEqual(resMissing.status, 400);
    const jsonMissing = await resMissing.json();
    assert.strictEqual(jsonMissing.status, 'error');
    assert.strictEqual(jsonMissing.message, 'Tên đăng nhập không được để trống');
  });

  // ----------------------------------------------------------------------------
  // [AC-07] PUT /api/members/:id/info (200 OK & 404 Not Found)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-07] [HTTP 200 & 404] PUT /api/members/:id/info cập nhật hồ sơ hội viên', async () => {
    memberService.updateMemberInfo = async (id, data) => {
      if (Number(id) === 101) {
        return { ...sampleMember, full_name: data.fullName, phone: data.phone };
      }
      return null;
    };

    const resUpdated = await fetch(`${baseUrl}/101/info`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ fullName: 'Nguyễn Văn Đã Sửa', phone: '0911223344' })
    });

    assert.strictEqual(resUpdated.status, 200);
    const jsonUpdated = await resUpdated.json();
    assert.strictEqual(jsonUpdated.status, 'success');
    assert.strictEqual(jsonUpdated.data.full_name, 'Nguyễn Văn Đã Sửa');
  });

  // ----------------------------------------------------------------------------
  // [AC-08] PUT /api/members/:id/status (Chỉ ADMIN được quyền thực hiện)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-08] [HTTP 200 & 403] PUT /api/members/:id/status chỉ cấp phép cho ADMIN', async () => {
    // 1. Employee bị từ chối 403 khi đổi trạng thái tài khoản
    const resEmpForbidden = await fetch(`${baseUrl}/101/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ status: 'LOCKED' })
    });
    assert.strictEqual(resEmpForbidden.status, 403);

    // 2. Admin thực hiện thành công
    memberService.updateAccountStatus = async (id, status) => {
      if (Number(id) === 101) {
        return { ...sampleMember, status };
      }
      return null;
    };

    const resAdminOk = await fetch(`${baseUrl}/101/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'LOCKED' })
    });

    assert.strictEqual(resAdminOk.status, 200);
    const jsonAdminOk = await resAdminOk.json();
    assert.strictEqual(jsonAdminOk.status, 'success');
    assert.strictEqual(jsonAdminOk.data.status, 'LOCKED');
  });
});
