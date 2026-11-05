/**
 * ==============================================================================
 * BỘ KIỂM THỬ XÁC THỰC DUAL-TOKEN, REFRESH ROTATION & STEP-UP AUTH (OWASP STANDARDS)
 * ==============================================================================
 */

require('dotenv').config();
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/models');

const {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken
} = require('../src/utils/jwt');

const { AuthService } = require('../src/services/authService');
const { AuthController } = require('../src/controllers/authController');

before(async () => {
  if (db.RefreshToken) {
    await db.RefreshToken.sync();
  }
});

test('[AUTH-01] [JWT Dual-Token] Access Token (15m) & Refresh Token (2d) generation & verification', () => {
  const payload = { user_id: 99, username: 'cyber_admin', role: 'ADMIN' };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  assert.ok(accessToken, 'Access Token must not be empty');
  assert.ok(refreshToken, 'Refresh Token must not be empty');
  assert.notEqual(accessToken, refreshToken, 'Access token and refresh token must be distinct');

  // Xác thực Access Token bằng secret của Access Token
  const decodedAccess = verifyAccessToken(accessToken);
  assert.equal(decodedAccess.user_id, 99);
  assert.equal(decodedAccess.username, 'cyber_admin');
  assert.equal(decodedAccess.role, 'ADMIN');

  // Xác thực Refresh Token bằng secret riêng của Refresh Token
  const decodedRefresh = verifyRefreshToken(refreshToken);
  assert.equal(decodedRefresh.user_id, 99);
  assert.equal(decodedRefresh.username, 'cyber_admin');

  // Access Token và Refresh Token phải dùng 2 Secret tách biệt hoàn toàn
  assert.throws(() => {
    verifyAccessToken(refreshToken);
  }, 'Access token verifier must reject refresh token');
});

test('[AUTH-02] [Hash Token] SHA-256 token hashing for database storage', () => {
  const token = 'sample_random_token_string_12345';
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);

  assert.equal(hash1, hash2, 'Hash của cùng một token phải đồng nhất');
  assert.equal(hash1.length, 64, 'Độ dài SHA-256 hex phải đạt 64 ký tự');
  assert.notEqual(hash1, token, 'Token gốc không được trùng với chuỗi hash');
});

test('[AUTH-03] [AuthService.login] Login successfully issues Access Token, Refresh Token & User Data', async () => {
  const authService = new AuthService();

  // Test đăng nhập thành công với tài khoản quản trị
  const result = await authService.login({
    username: 'admin',
    password: '123456'
  });

  assert.ok(result.accessToken, 'Phải trả về accessToken');
  assert.ok(result.refreshToken, 'Phải trả về refreshToken');
  assert.equal(result.user.username, 'admin');
  assert.equal(result.user.role, 'ADMIN');

  // Test đăng nhập sai mật khẩu phải ném lỗi
  await assert.rejects(async () => {
    await authService.login({ username: 'admin', password: 'wrongpassword' });
  }, { message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
});

test('[AUTH-04] [AuthService.refreshToken] Refresh Token Rotation (RTR) and Revocation', async () => {
  const authService = new AuthService();

  // 1. Chặn token rỗng
  await assert.rejects(async () => {
    await authService.refreshToken('');
  }, { message: 'Refresh token không được để trống.' });

  // 2. Chặn token giả mạo
  await assert.rejects(async () => {
    await authService.refreshToken('invalid.tampered.token');
  }, { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });

  // 3. Quy trình Refresh Token thực tế (Login cấp token -> Gọi refresh -> Nhận cặp token mới)
  const loginResult = await authService.login({
    username: 'admin',
    password: '123456'
  });
  const validRefreshToken = loginResult.refreshToken;

  const refreshed = await authService.refreshToken(validRefreshToken);
  assert.ok(refreshed.accessToken, 'Phải cấp mới Access Token');
  assert.ok(refreshed.refreshToken, 'Phải xoay vòng (Rotate) sang Refresh Token mới');
  assert.notEqual(refreshed.refreshToken, validRefreshToken, 'Refresh token mới phải khác token cũ');
  assert.equal(refreshed.user.username, 'admin');

  // 4. Token cũ vừa được refresh phải bị thu hồi ngay (chống Token Reuse)
  await assert.rejects(async () => {
    await authService.refreshToken(validRefreshToken);
  }, { message: 'Phát hiện cảnh báo bảo mật. Phiên làm việc đã bị vô hiệu hóa.' });
});

test('[AUTH-05] [AuthService.verifyStepUp] Step-up password authentication after inactivity', async () => {
  const authService = new AuthService();

  // 1. Thiếu mật khẩu
  await assert.rejects(async () => {
    await authService.verifyStepUp({ userId: 1, password: '' });
  }, { message: 'Vui lòng nhập mật khẩu xác nhận.' });

  // 2. Đúng mật khẩu
  const stepUpResult = await authService.verifyStepUp({ userId: 1, password: '123456' });
  assert.equal(stepUpResult.success, true);
  assert.ok(stepUpResult.verifiedAt);

  // 3. Sai mật khẩu
  await assert.rejects(async () => {
    await authService.verifyStepUp({ userId: 1, password: 'incorrect_password' });
  }, { message: 'Mật khẩu xác nhận không chính xác.' });
});

test('[AUTH-06] [AuthController] Sets HttpOnly Cookie on login, refresh and clears on logout', async () => {
  const authController = new AuthController();

  let cookieSet = {};
  let cookieCleared = null;

  const mockRes = {
    cookie: (name, val, options) => {
      cookieSet = { name, val, options };
    },
    clearCookie: (name, options) => {
      cookieCleared = { name, options };
    },
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (payload) {
      this.body = payload;
      return this;
    }
  };

  const mockReq = {
    body: { username: 'admin', password: '123456' }
  };

  // 1. Test Login Controller
  await authController.login(mockReq, mockRes);

  assert.equal(mockRes.statusCode, 200);
  assert.equal(cookieSet.name, 'nexus_refresh_token');
  assert.equal(cookieSet.options.httpOnly, true, 'Cookie bắt buộc là HttpOnly');
  assert.equal(cookieSet.options.path, '/', 'Cookie path phải là /');
  assert.equal(cookieSet.options.maxAge, 2 * 24 * 60 * 60 * 1000, 'Cookie maxAge phải là 2 ngày');
  assert.ok(mockRes.body.data.accessToken);

  // 2. Test Refresh Controller qua Cookie
  const mockRefreshReq = {
    cookies: { nexus_refresh_token: cookieSet.val }
  };
  await authController.refresh(mockRefreshReq, mockRes);
  assert.equal(mockRes.statusCode, 200);
  assert.ok(mockRes.body.data.accessToken);

  // 3. Test Logout Controller
  const mockLogoutReq = {
    cookies: { nexus_refresh_token: cookieSet.val },
    user: { user_id: 1 }
  };
  const mockLogoutRes = {
    clearCookie: (name, options) => {
      cookieCleared = { name, options };
    },
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (payload) {
      this.body = payload;
      return this;
    }
  };

  await authController.logout(mockLogoutReq, mockLogoutRes);
  assert.equal(mockLogoutRes.statusCode, 200);
  assert.equal(cookieCleared.name, 'nexus_refresh_token');
  assert.equal(cookieCleared.options.path, '/');
});
