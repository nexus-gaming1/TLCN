const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../src/routes/pricingPlanRoutes');

test('pricingPlanRoutes - Security middleware verification', () => {
  // Map routes defined in pricingPlanRoutes
  const routes = router.stack
    .filter(layer => layer.route)
    .map(layer => {
      const methods = Object.keys(layer.route.methods);
      const path = layer.route.path;
      const stackNames = layer.route.stack.map(s => s.name);
      return { path, methods, stackNames, stackLength: layer.route.stack.length };
    });

  // Verify public GET routes
  const getList = routes.find(r => r.path === '/' && r.methods.includes('get'));
  assert.ok(getList, 'Route GET / should exist');
  assert.strictEqual(getList.stackLength, 1, 'Route GET / should be public (no auth middleware)');

  const getDetail = routes.find(r => r.path === '/:id' && r.methods.includes('get'));
  assert.ok(getDetail, 'Route GET /:id should exist');
  assert.strictEqual(getDetail.stackLength, 1, 'Route GET /:id should be public');

  // Verify protected routes: POST /, PUT /:id, PATCH /:id/toggle, DELETE /:id
  const protectedDefs = [
    { path: '/', method: 'post' },
    { path: '/:id', method: 'put' },
    { path: '/:id/toggle', method: 'patch' },
    { path: '/:id', method: 'delete' },
  ];

  for (const def of protectedDefs) {
    const route = routes.find(r => r.path === def.path && r.methods.includes(def.method));
    assert.ok(route, `Route ${def.method.toUpperCase()} ${def.path} must exist`);
    // Each protected route should have at least 3 middleware: authenticateToken, authorizeRoles, and controller
    assert.strictEqual(
      route.stackLength,
      3,
      `Route ${def.method.toUpperCase()} ${def.path} must have authenticateToken, authorizeRoles, and controller handler`
    );
    assert.ok(
      route.stackNames.includes('authenticateToken'),
      `Route ${def.method.toUpperCase()} ${def.path} must include authenticateToken middleware`
    );
  }
});
