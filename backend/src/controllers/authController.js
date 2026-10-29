const authService = require('../services/authService');

class AuthController {
    /**
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { identity, username, password } = req.body;
            // Chấp nhận field 'identity' hoặc 'username' từ frontend
            const targetUsername = username || identity;

            const result = await authService.login({ username: targetUsername, password });

            return res.status(200).json({
                status: 'success',
                data: result,
                message: 'Đăng nhập thành công!'
            });
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                data: null,
                message: error.message || 'Đăng nhập thất bại.'
            });
        }
    }

    /**
     * POST /api/auth/control-login
     * Đăng nhập dành riêng cho ứng dụng quản lý Nexus Control (chặn tài khoản MEMBER).
     */
    async controlLogin(req, res) {
        try {
            const { identity, username, password } = req.body;
            const targetUsername = username || identity;

            const result = await authService.controlLogin({ username: targetUsername, password });

            return res.status(200).json({
                status: 'success',
                data: result,
                message: 'Đăng nhập ứng dụng quản lý thành công!'
            });
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                data: null,
                message: error.message || 'Đăng nhập thất bại.'
            });
        }
    }

    /**
     * GET /api/auth/me
     */
    async getMe(req, res) {
        try {
            const userId = req.user.user_id;
            const userProfile = await authService.getUserProfile(userId);

            return res.status(200).json({
                status: 'success',
                data: { user: userProfile },
                message: 'Lấy thông tin người dùng thành công.'
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                data: null,
                message: error.message || 'Lỗi lấy thông tin người dùng.'
            });
        }
    }
}

module.exports = new AuthController();
