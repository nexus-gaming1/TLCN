const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const computerRoutes = require('../../../src/routes/computerRoutes');
const computerService = require('../../../src/services/computerService');
const stationControlService = require('../../../src/services/stationControlService');
const errorHandler = require('../../../src/middleware/errorHandler');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole, ComputerStatus } = require('../../../src/constants/enums');

// Dữ liệu mẫu stub
const sampleComputer = {
  computer_id: 101,
  computer_name: 'PC-101',
  ip_address: '192.168.1.101',
  mac_address: '00:11:22:33:44:55',
  status: ComputerStatus.OFFLINE,
  zone_id: 1,
  is_remote_enabled: false
};

test('[Machine Fleet API Routes Suite] Kiểm thử định tuyến HTTP, RBAC Auth & RESTful Contract', async (suite) => {
  let app;
  let server;
  let baseUrl;

  // Tokens phân quyền
  const adminToken = generateToken({ user_id: 1, username: 'admin_test', role: UserRole.ADMIN });
  const employeeToken = generateToken({ user_id: 2, username: 'staff_test', role: UserRole.EMPLOYEE });
  const memberToken = generateToken({ user_id: 3, username: 'gamer_test', role: UserRole.MEMBER });

  // Sao lưu phương thức gốc
  const origGetAllComputers = computerService.getAllComputers;
  const origGetComputerById = computerService.getComputerById;
  const origCreateComputer = computerService.createComputer;
  const origUpdateComputer = computerService.updateComputer;
  const origDeleteComputer = computerService.deleteComputer;
  const origGetRoomLayoutGrid = computerService.getRoomLayoutGrid;
  const origChangeStatus = stationControlService.changeStatus;

  suite.before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/computers', computerRoutes);
    app.use(errorHandler);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/computers`;
        resolve();
      });
    });
  });

  suite.after(async () => {
    // Khôi phục phương thức gốc
    computerService.getAllComputers = origGetAllComputers;
    computerService.getComputerById = origGetComputerById;
    computerService.createComputer = origCreateComputer;
    computerService.updateComputer = origUpdateComputer;
    computerService.deleteComputer = origDeleteComputer;
    computerService.getRoomLayoutGrid = origGetRoomLayoutGrid;
    stationControlService.changeStatus = origChangeStatus;

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ----------------------------------------------------------------------------
  // [AC-01] 401 Unauthorized khi thiếu Token
  // ----------------------------------------------------------------------------
  await suite.test('[AC-01] [401 Unauthorized] Chặn request truy cập danh sách máy khi không có Bearer token', async () => {
    const res = await fetch(`${baseUrl}`);
    assert.strictEqual(res.status, 401);
  });

  // ----------------------------------------------------------------------------
  // [AC-02] 403 Forbidden khi role MEMBER truy cập
  // ----------------------------------------------------------------------------
  await suite.test('[AC-02] [403 Forbidden] Chặn tài khoản MEMBER truy cập tài nguyên máy trạm', async () => {
    const res = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  // ----------------------------------------------------------------------------
  // [AC-03] 403 Forbidden khi EMPLOYEE cố gắng thao tác tạo / sửa / xóa (Chỉ ADMIN)
  // ----------------------------------------------------------------------------
  await suite.test('[AC-03] [403 Forbidden] Chặn EMPLOYEE gọi các endpoint thay đổi cấu trúc trạm (POST, PUT, DELETE)', async () => {
    const resCreate = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ computer_name: 'PC-FORBIDDEN' })
    });
    assert.strictEqual(resCreate.status, 403);

    const resDelete = await fetch(`${baseUrl}/101`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(resDelete.status, 403);
  });

  // ----------------------------------------------------------------------------
  // [AC-04] 200 OK: GET /api/computers danh sách máy trạm với ADMIN & EMPLOYEE
  // ----------------------------------------------------------------------------
  await suite.test('[AC-04] [200 OK] Cho phép ADMIN và EMPLOYEE lấy danh sách máy trạm', async () => {
    computerService.getAllComputers = async () => [sampleComputer];

    const resAdmin = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdmin.status, 200);
    const bodyAdmin = await resAdmin.json();
    assert.strictEqual(bodyAdmin.status, 'success');
    assert.strictEqual(bodyAdmin.data.length, 1);

    const resStaff = await fetch(`${baseUrl}`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert.strictEqual(resStaff.status, 200);
  });

  // ----------------------------------------------------------------------------
  // [AC-05] 200 OK: GET /api/computers/grid sơ đồ phòng máy
  // ----------------------------------------------------------------------------
  await suite.test('[AC-05] [200 OK] Lấy sơ đồ phòng máy layout grid', async () => {
    computerService.getRoomLayoutGrid = async () => ({
      summary: { total: 1, online: 0, offline: 1 },
      zones: []
    });

    const res = await fetch(`${baseUrl}/grid`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.summary.total, 1);
  });

  // ----------------------------------------------------------------------------
  // [AC-06] 200 OK & 404: GET /api/computers/:id
  // ----------------------------------------------------------------------------
  await suite.test('[AC-06] [200 & 404] Lấy chi tiết máy hoặc trả về 404 khi không tồn tại', async () => {
    computerService.getComputerById = async (id) => (Number(id) === 101 ? sampleComputer : null);

    const resSuccess = await fetch(`${baseUrl}/101`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resSuccess.status, 200);
    const bodySuccess = await resSuccess.json();
    assert.strictEqual(bodySuccess.data.computer_id, 101);

    const resNotFound = await fetch(`${baseUrl}/9999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resNotFound.status, 404);
  });

  // ----------------------------------------------------------------------------
  // [AC-07] 201 Created & 400 Bad Request: POST /api/computers
  // ----------------------------------------------------------------------------
  await suite.test('[AC-07] [201 & 400] Tạo máy trạm mới hoặc trả về 400 khi lỗi dữ liệu', async () => {
    computerService.createComputer = async (data) => {
      if (data.ip_address === 'invalid') {
        const err = new Error('Địa chỉ IP không đúng định dạng IPv4 hợp lệ');
        err.statusCode = 400;
        throw err;
      }
      return { computer_id: 102, ...data };
    };

    const resSuccess = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ computer_name: 'PC-102', zone_id: 1 })
    });
    assert.strictEqual(resSuccess.status, 201);
    const bodySuccess = await resSuccess.json();
    assert.strictEqual(bodySuccess.data.computer_id, 102);

    const resFail = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ computer_name: 'PC-103', ip_address: 'invalid' })
    });
    assert.strictEqual(resFail.status, 400);
  });

  // ----------------------------------------------------------------------------
  // [AC-08] 200 OK & 404: PUT /api/computers/:id
  // ----------------------------------------------------------------------------
  await suite.test('[AC-08] [200 & 404] Cập nhật máy trạm hoặc trả về 404 khi không tìm thấy', async () => {
    computerService.updateComputer = async (id, data) => {
      if (Number(id) === 101) return { ...sampleComputer, ...data };
      return null;
    };

    const resSuccess = await fetch(`${baseUrl}/101`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ computer_name: 'PC-101-UPDATED' })
    });
    assert.strictEqual(resSuccess.status, 200);

    const resNotFound = await fetch(`${baseUrl}/9999`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ computer_name: 'PC-GHOST' })
    });
    assert.strictEqual(resNotFound.status, 404);
  });

  // ----------------------------------------------------------------------------
  // [AC-09] 200 OK & 404: DELETE /api/computers/:id
  // ----------------------------------------------------------------------------
  await suite.test('[AC-09] [200 & 404] Xóa máy trạm hoặc trả về 404 khi không tìm thấy', async () => {
    computerService.deleteComputer = async (id) => Number(id) === 101;

    const resSuccess = await fetch(`${baseUrl}/101`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resSuccess.status, 200);

    const resNotFound = await fetch(`${baseUrl}/9999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(resNotFound.status, 404);
  });

  // ----------------------------------------------------------------------------
  // [AC-10] 200 OK: PATCH /api/computers/:id/status
  // ----------------------------------------------------------------------------
  await suite.test('[AC-10] [200 OK] Đổi trạng thái máy trạm (ONLINE, OFFLINE, MAINTENANCE)', async () => {
    stationControlService.changeStatus = async (id, status) => ({
      computer_id: Number(id),
      status
    });

    const res = await fetch(`${baseUrl}/101/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({ status: ComputerStatus.ONLINE })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
  });
});

