/**
 * ==============================================================================
 * BỘ KIỂM THỬ TẦNG API ROUTES & BẢO MẬT HTTP (GAME & CATEGORY ROUTES)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. [AC-01] Cấu trúc Router & Phân quyền RBAC (Route Stack & Layers)
 * 2. [AC-02] Bảo mật HTTP 401 Unauthorized: Chặn request thiếu Bearer Token
 * 3. [AC-03] Phân quyền HTTP 403 Forbidden: Chặn request từ vai trò không phải ADMIN (MEMBER, EMPLOYEE)
 * 4. [AC-04] Hợp đồng dữ liệu HTTP 200 OK: Tuyến đọc công khai (GET /games, /metrics, /categories)
 * 5. [AC-05] Thao tác quản trị HTTP 201/200: Tạo mới, cập nhật, toggle, restore, xóa game với Admin Token
 * 6. [AC-06] Xử lý lỗi chuẩn RESTful: 400 Bad Request & 404 Not Found qua Centralized Error Handler
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const gameRoutes = require('../../../src/routes/gameRoutes');
const categoryRoutes = require('../../../src/routes/categoryRoutes');
const gameService = require('../../../src/services/gameService');
const categoryService = require('../../../src/services/categoryService');
const errorHandler = require('../../../src/middleware/errorHandler');
const { generateToken } = require('../../../src/utils/jwt');
const { UserRole } = require('../../../src/constants/enums');

// ==============================================================================
// 1. [AC-01] KIỂM TRA TĨNH ROUTER STACK & CHUỖI MIDDLEWARE PHÂN QUYỀN RBAC
// ==============================================================================
test('[AC-01] [Router Stack & RBAC] gameRoutes - Xác minh cấu trúc Layer và phân quyền RBAC', () => {
  const routes = gameRoutes.stack
    .filter(layer => layer.route)
    .map(layer => {
      const methods = Object.keys(layer.route.methods);
      const path = layer.route.path;
      const stackNames = layer.route.stack.map(s => s.name);
      return { path, methods, stackNames, stackLength: layer.route.stack.length };
    });

  // 1. Tuyến đọc dữ liệu (Public): GET /, GET /:id, GET /metrics, GET /categories
  const publicRoutes = [
    { path: '/', method: 'get', desc: 'Danh sách game' },
    { path: '/:id', method: 'get', desc: 'Chi tiết game' },
    { path: '/metrics', method: 'get', desc: 'Số liệu KPI kho game' },
    { path: '/categories', method: 'get', desc: 'Danh mục thể loại game' }
  ];

  for (const def of publicRoutes) {
    const route = routes.find(r => r.path === def.path && r.methods.includes(def.method));
    assert.ok(route, `Tuyến public ${def.method.toUpperCase()} ${def.path} (${def.desc}) phải tồn tại`);
    assert.strictEqual(
      route.stackLength,
      1,
      `Tuyến public ${def.method.toUpperCase()} ${def.path} chỉ chứa 1 handler controller, không bị chặn auth`
    );
  }

  // 2. Tuyến ghi dữ liệu (Protected Admin): POST, PUT, PATCH, DELETE
  const protectedRoutes = [
    { path: '/', method: 'post', desc: 'Tạo game mới' },
    { path: '/:id', method: 'put', desc: 'Cập nhật game' },
    { path: '/:id/toggle', method: 'patch', desc: 'Bật/tắt trạng thái phục vụ' },
    { path: '/:id/restore', method: 'patch', desc: 'Khôi phục game đã xóa' },
    { path: '/:id', method: 'delete', desc: 'Xóa mềm game' },
    { path: '/categories', method: 'post', desc: 'Tạo thể loại game' }
  ];

  for (const def of protectedRoutes) {
    const route = routes.find(r => r.path === def.path && r.methods.includes(def.method));
    assert.ok(route, `Tuyến bảo vệ ${def.method.toUpperCase()} ${def.path} (${def.desc}) bắt buộc phải tồn tại`);
    assert.strictEqual(
      route.stackLength,
      3,
      `Tuyến bảo vệ ${def.method.toUpperCase()} ${def.path} bắt buộc phải có đủ 3 layers (Auth -> Role -> Controller)`
    );
    assert.ok(
      route.stackNames.includes('authenticateToken'),
      `Tuyến ${def.method.toUpperCase()} ${def.path} phải có middleware authenticateToken`
    );
  }

  // 3. Tuyến độc lập categoryRoutes
  const catRoutes = categoryRoutes.stack
    .filter(layer => layer.route)
    .map(layer => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      stackLength: layer.route.stack.length
    }));
  const catGet = catRoutes.find(r => r.path === '/' && r.methods.includes('get'));
  assert.ok(catGet, 'Route GET / categories phải tồn tại');
  assert.strictEqual(catGet.stackLength, 1);
  const catPost = catRoutes.find(r => r.path === '/' && r.methods.includes('post'));
  assert.ok(catPost, 'Route POST / categories phải tồn tại');
  assert.strictEqual(catPost.stackLength, 3);
});

// ==============================================================================
// 2. BEHAVIORAL HTTP TESTING SUITE (NATIVE HTTP PIPELINE VIA EPHEMERAL SERVER)
// ==============================================================================
test('[API / Route Testing Suite] Hành vi HTTP End-to-End, mã lỗi RESTful & Phân quyền', async (t) => {
  // Khởi tạo Express app cô lập phục vụ kiểm thử HTTP
  const app = express();
  app.use(express.json());
  app.use('/api/games', gameRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/games`;

  // Dọn dẹp đóng server khi hoàn thành test suite
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  // Tạo Token JWT kiểm thử theo các Role
  const adminToken = generateToken({ user_id: 1, username: 'admin_master', role: UserRole.ADMIN });
  const memberToken = generateToken({ user_id: 10, username: 'gamer_pro', role: UserRole.MEMBER });
  const employeeToken = generateToken({ user_id: 5, username: 'staff_cyber', role: UserRole.EMPLOYEE });

  // Dữ liệu mẫu mock độc lập
  const sampleGame = {
    game_id: 101,
    name: 'Counter-Strike 2',
    category_id: 1,
    executable_path: 'C:\\Games\\cs2.exe',
    cover_image_url: 'https://cdn.example.com/cs2.jpg',
    is_available: true,
    is_remote_supported: true,
    is_deleted: false
  };

  // Sao lưu các hàm gốc của service để hoàn trả sau test
  const originalServiceMethods = {
    getGames: gameService.getGames,
    getGameById: gameService.getGameById,
    createGame: gameService.createGame,
    updateGame: gameService.updateGame,
    toggleAvailability: gameService.toggleAvailability,
    restoreGame: gameService.restoreGame,
    deleteGame: gameService.deleteGame,
    getMetrics: gameService.getMetrics,
    getCategories: categoryService.getCategories,
    createCategory: categoryService.createCategory
  };

  t.after(() => {
    Object.assign(gameService, originalServiceMethods);
    categoryService.getCategories = originalServiceMethods.getCategories;
    categoryService.createCategory = originalServiceMethods.createCategory;
  });

  // ----------------------------------------------------------------------------
  // [AC-02] 401 UNAUTHORIZED: Request thiếu Token Bearer
  // ----------------------------------------------------------------------------
  await t.test('[AC-02] [HTTP 401] Yêu cầu chỉnh sửa không gửi kèm Bearer Token phải bị từ chối 401', async () => {
    const mutationRequests = [
      { url: `${baseUrl}`, method: 'POST', body: { name: 'Test' } },
      { url: `${baseUrl}/1`, method: 'PUT', body: { name: 'Test' } },
      { url: `${baseUrl}/1/toggle`, method: 'PATCH' },
      { url: `${baseUrl}/1/restore`, method: 'PATCH' },
      { url: `${baseUrl}/1`, method: 'DELETE' },
      { url: `${baseUrl}/categories`, method: 'POST', body: { name: 'Moba' } }
    ];

    for (const req of mutationRequests) {
      const res = await fetch(req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
        body: req.body ? JSON.stringify(req.body) : undefined
      });

      assert.strictEqual(
        res.status,
        401,
        `Phương thức ${req.method} ${req.url} không có token phải trả về HTTP 401 Unauthorized`
      );
      const json = await res.json();
      assert.strictEqual(json.status, 'error');
      assert.ok(json.message.includes('Vui lòng cung cấp chuỗi Bearer Token hợp lệ'));
    }
  });

  // ----------------------------------------------------------------------------
  // [AC-03] 403 FORBIDDEN: Request có Token nhưng không phải ADMIN
  // ----------------------------------------------------------------------------
  await t.test('[AC-03] [HTTP 403] Người dùng vai trò MEMBER hoặc EMPLOYEE bị từ chối 403 Forbidden', async () => {
    const nonAdminTokens = [memberToken, employeeToken];

    for (const token of nonAdminTokens) {
      const resPost = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'Hacked Game', category_id: 1 })
      });

      assert.strictEqual(resPost.status, 403, 'User không có role ADMIN phải nhận mã HTTP 403 Forbidden');
      const jsonPost = await resPost.json();
      assert.strictEqual(jsonPost.status, 'error');
      assert.ok(jsonPost.message.includes('Bạn không có quyền truy cập tài nguyên này'));

      const resDelete = await fetch(`${baseUrl}/101`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.strictEqual(resDelete.status, 403);
    }
  });

  // ----------------------------------------------------------------------------
  // [AC-04] 200 OK: Các tuyến đọc công khai (Public GET)
  // ----------------------------------------------------------------------------
  await t.test('[AC-04] [HTTP 200] Tuyến GET công khai trả về dữ liệu chuẩn JSON', async () => {
    // Stub dữ liệu cho tầng service
    gameService.getGames = async (filter) => ({
      games: [sampleGame],
      metrics: { totalGames: 1, availableGames: 1 }
    });
    gameService.getGameById = async (id) => sampleGame;
    gameService.getMetrics = async () => ({ totalGames: 1, availableGames: 1, remoteRate: 100 });
    categoryService.getCategories = async () => [{ category_id: 1, name: 'FPS' }];

    // 1. GET /api/games
    const resGames = await fetch(`${baseUrl}?search=cs2&category_id=1&is_available=true`);
    assert.strictEqual(resGames.status, 200);
    const jsonGames = await resGames.json();
    assert.strictEqual(jsonGames.status, 'success');
    assert.strictEqual(jsonGames.data.length, 1);
    assert.strictEqual(jsonGames.data[0].name, 'Counter-Strike 2');
    assert.strictEqual(jsonGames.metrics.totalGames, 1);

    // 2. GET /api/games/:id
    const resDetail = await fetch(`${baseUrl}/101`);
    assert.strictEqual(resDetail.status, 200);
    const jsonDetail = await resDetail.json();
    assert.strictEqual(jsonDetail.status, 'success');
    assert.strictEqual(jsonDetail.data.game_id, 101);

    // 3. GET /api/games/metrics
    const resMetrics = await fetch(`${baseUrl}/metrics`);
    assert.strictEqual(resMetrics.status, 200);
    const jsonMetrics = await resMetrics.json();
    assert.strictEqual(jsonMetrics.status, 'success');
    assert.strictEqual(jsonMetrics.data.totalGames, 1);

    // 4. GET /api/games/categories
    const resCategories = await fetch(`${baseUrl}/categories`);
    assert.strictEqual(resCategories.status, 200);
    const jsonCategories = await resCategories.json();
    assert.strictEqual(jsonCategories.status, 'success');
    assert.strictEqual(jsonCategories.data[0].name, 'FPS');
  });

  // ----------------------------------------------------------------------------
  // [AC-05] 201 & 200 OK: Thao tác quản trị của ADMIN
  // ----------------------------------------------------------------------------
  await t.test('[AC-05] [HTTP 201 & 200] Quản trị viên (ADMIN) thực hiện thành công các thao tác ghi', async () => {
    // 1. POST /api/games -> 201 Created
    gameService.createGame = async (dto) => ({
      game_id: 102,
      ...dto,
      is_available: true,
      is_deleted: false
    });

    const resCreate = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Dota 2',
        category_id: 2,
        executable_path: 'C:\\Games\\dota2.exe'
      })
    });

    assert.strictEqual(resCreate.status, 201, 'Tạo mới game thành công phải trả về HTTP 201 Created');
    const jsonCreate = await resCreate.json();
    assert.strictEqual(jsonCreate.status, 'success');
    assert.strictEqual(jsonCreate.data.name, 'Dota 2');

    // 2. PUT /api/games/:id -> 200 OK
    gameService.updateGame = async (id, dto) => ({
      ...sampleGame,
      ...dto,
      game_id: Number(id)
    });

    const resUpdate = await fetch(`${baseUrl}/101`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Counter-Strike 2 Global' })
    });

    assert.strictEqual(resUpdate.status, 200);
    const jsonUpdate = await resUpdate.json();
    assert.strictEqual(jsonUpdate.status, 'success');
    assert.strictEqual(jsonUpdate.data.name, 'Counter-Strike 2 Global');

    // 3. PATCH /api/games/:id/toggle -> 200 OK
    gameService.toggleAvailability = async (id) => ({
      ...sampleGame,
      game_id: Number(id),
      is_available: false
    });

    const resToggle = await fetch(`${baseUrl}/101/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(resToggle.status, 200);
    const jsonToggle = await resToggle.json();
    assert.strictEqual(jsonToggle.status, 'success');
    assert.strictEqual(jsonToggle.data.is_available, false);

    // 4. DELETE /api/games/:id -> 200 OK
    gameService.deleteGame = async (id) => ({
      success: true,
      game_id: Number(id),
      is_deleted: true
    });

    const resDelete = await fetch(`${baseUrl}/101`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(resDelete.status, 200);
    const jsonDelete = await resDelete.json();
    assert.strictEqual(jsonDelete.status, 'success');
    assert.strictEqual(jsonDelete.data.success, true);

    // 5. PATCH /api/games/:id/restore -> 200 OK
    gameService.restoreGame = async (id) => ({
      success: true,
      game_id: Number(id),
      is_deleted: false,
      is_available: true
    });

    const resRestore = await fetch(`${baseUrl}/101/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(resRestore.status, 200);
    const jsonRestore = await resRestore.json();
    assert.strictEqual(jsonRestore.status, 'success');
    assert.strictEqual(jsonRestore.data.is_deleted, false);

    // 6. POST /api/games/categories -> 201 Created
    categoryService.createCategory = async (name) => ({
      category_id: 5,
      name: typeof name === 'object' ? name.name : name
    });

    const resCategory = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: 'Survival Horror' })
    });

    assert.strictEqual(resCategory.status, 201);
    const jsonCategory = await resCategory.json();
    assert.strictEqual(jsonCategory.status, 'success');
    assert.strictEqual(jsonCategory.data.name, 'Survival Horror');
  });

  // ----------------------------------------------------------------------------
  // [AC-06] 400 & 404: Xử lý ngoại lệ nghiệp vụ qua Centralized Error Handler
  // ----------------------------------------------------------------------------
  await t.test('[AC-06] [HTTP 400 & 404] Ngoại lệ ném từ Service được ánh xạ chính xác HTTP status code', async () => {
    // 1. Ca lỗi 400: Dữ liệu body không hợp lệ (Tên game để trống)
    gameService.createGame = async () => {
      const err = new Error('Tên game không được để trống');
      err.statusCode = 400;
      throw err;
    };

    const resBad = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: '', category_id: 1 })
    });

    assert.strictEqual(resBad.status, 400, 'Lỗi validation phải trả về HTTP 400');
    const jsonBad = await resBad.json();
    assert.strictEqual(jsonBad.status, 'error');
    assert.strictEqual(jsonBad.message, 'Tên game không được để trống');

    // 2. Ca lỗi 404: Không tìm thấy game theo ID
    gameService.getGameById = async (id) => {
      const err = new Error(`Không tìm thấy game với ID: ${id}`);
      err.statusCode = 404;
      throw err;
    };

    const resNotFound = await fetch(`${baseUrl}/9999`);
    assert.strictEqual(resNotFound.status, 404, 'Truy vấn tài nguyên không tồn tại phải trả về HTTP 404');
    const jsonNotFound = await resNotFound.json();
    assert.strictEqual(jsonNotFound.status, 'error');
    assert.ok(jsonNotFound.message.includes('Không tìm thấy game với ID: 9999'));
  });
});

