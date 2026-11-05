const authService = require('../services/authService');

class AuthController {
    /**
     * Helper thiết lập HttpOnly Cookie an toàn cho Refresh Token
     */
    setRefreshTokenCookie = (res, refreshToken) => {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('nexus_refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'strict' : 'lax',
            maxAge: 2 * 24 * 60 * 60 * 1000, // 2 ngày (mili-giây)
            path: '/'
        });
    };

    /**
     * POST /api/auth/login
     */
    login = async (req, res) => {
        try {
            const { identity, username, password } = req.body;
            // Chấp nhận field 'identity' hoặc 'username' từ frontend
            const targetUsername = username || identity;

            const result = await authService.login({ username: targetUsername, password });

            // Lưu Refresh Token vào HttpOnly Cookie chống XSS
            this.setRefreshTokenCookie(res, result.refreshToken);

            return res.status(200).json({
                status: 'success',
                data: {
                    accessToken: result.accessToken,
                    token: result.accessToken, // Tương thích ngược
                    tokenType: 'Bearer',
                    user: result.user
                },
                message: 'Đăng nhập thành công!'
            });
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                data: null,
                message: error.message || 'Đăng nhập thất bại.'
            });
        }
    };

    /**
     * POST /api/auth/refresh
     * Cấp mới Access Token (15m) và Refresh Token mới (RTR) qua HttpOnly Cookie
     */
    refresh = async (req, res) => {
        try {
            const refreshToken = req.cookies?.nexus_refresh_token || req.body?.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    status: 'error',
                    data: null,
                    message: 'Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.'
                });
            }

            const result = await authService.refreshToken(refreshToken);

            // Cập nhật Refresh Token mới vào Cookie
            this.setRefreshTokenCookie(res, result.refreshToken);

            return res.status(200).json({
                status: 'success',
                data: {
                    accessToken: result.accessToken,
                    token: result.accessToken,
                    tokenType: 'Bearer',
                    user: result.user
                },
                message: 'Làm mới phiên làm việc thành công.'
            });
        } catch (error) {
            // Xóa cookie cũ nếu refresh token không còn hợp lệ
            res.clearCookie('nexus_refresh_token', { path: '/' });
            return res.status(401).json({
                status: 'error',
                data: null,
                message: error.message || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
            });
        }
    };

    /**
     * POST /api/auth/logout
     * Thu hồi token trong CSDL và dọn dẹp Cookie
     */
    logout = async (req, res) => {
        try {
            const refreshToken = req.cookies?.nexus_refresh_token || req.body?.refreshToken;
            const userId = req.user?.user_id;

            await authService.logout({ refreshToken, userId });

            // Xóa Cookie HttpOnly
            res.clearCookie('nexus_refresh_token', { path: '/' });

            return res.status(200).json({
                status: 'success',
                data: null,
                message: 'Đăng xuất thành công!'
            });
        } catch (error) {
            res.clearCookie('nexus_refresh_token', { path: '/' });
            return res.status(200).json({
                status: 'success',
                data: null,
                message: 'Đã hoàn tất đăng xuất.'
            });
        }
    };

    /**
     * POST /api/auth/verify-stepup
     * Xác thực lại mật khẩu (Step-up Auth) khi quá 30 phút không hoạt động
     */
    verifyStepUp = async (req, res) => {
        try {
            const userId = req.user?.user_id;
            const { password } = req.body;

            const result = await authService.verifyStepUp({ userId, password });

            return res.status(200).json({
                status: 'success',
                data: result,
                message: 'Xác nhận danh tính thành công.'
            });
        } catch (error) {
            return res.status(400).json({
                status: 'error',
                data: null,
                message: error.message || 'Mật khẩu xác nhận không chính xác.'
            });
        }
    };

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
    getMe = async (req, res) => {
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
    };
}

module.exports = new AuthController();
module.exports.AuthController = AuthController;
