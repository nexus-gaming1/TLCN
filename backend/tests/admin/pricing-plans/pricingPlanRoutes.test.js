const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../../../src/routes/pricingPlanRoutes');

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
