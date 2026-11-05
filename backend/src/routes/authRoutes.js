const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Tuyến đường Đăng Nhập
router.post('/login', authController.login);

// Đăng nhập riêng cho ứng dụng Nexus Control (ADMIN/EMPLOYEE)
router.post('/control-login', authController.controlLogin);

// Tuyến đường Cấp mới Token qua Refresh Token (HttpOnly Cookie)
router.post('/refresh', authController.refresh);

// Tuyến đường Đăng Xuất (Xóa cookie & Thu hồi Token trong CSDL)
router.post('/logout', authController.logout);

// Tuyến đường Lấy Thông Tin Người Dùng Hiện Tại (Bảo vệ bằng Access Token)
router.get('/me', authenticateToken, authController.getMe);

// Tuyến đường Xác thực lại mật khẩu (Step-up Auth sau 30 phút không hoạt động)
router.post('/verify-stepup', authenticateToken, authController.verifyStepUp);

module.exports = router;
