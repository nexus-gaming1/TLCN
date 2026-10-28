const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Route Đăng Nhập thông thường
router.post('/login', (req, res) => authController.login(req, res));

// Route Đăng Nhập dành riêng cho Quản lý / Nhân viên Nexus Control (chặn MEMBER)
router.post('/control-login', (req, res) => authController.controlLogin(req, res));

// Route Lấy Thông Tin Người Dùng Hiện Tại (Bảo vệ bằng Bearer Token)
router.get('/me', authenticateToken, (req, res) => authController.getMe(req, res));

module.exports = router;
