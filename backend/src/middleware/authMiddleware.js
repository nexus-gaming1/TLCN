const { verifyToken } = require('../utils/jwt');

/**
 * Middleware xác thực chuỗi Bearer Token (JWT) từ Header Authorization
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // Header dạng: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Truy cập bị từ chối. Vui lòng cung cấp chuỗi Bearer Token hợp lệ.',
            data: null
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // { user_id, username, role, ... }
        next();
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            message: 'Token không hợp lệ hoặc đã hết hạn.',
            error: { code: 'INVALID_TOKEN', details: error.message }
        });
    }
};

/**
 * Middleware phân quyền theo vai trò (Role-Based Access Control)
 * @param  {...string} allowedRoles Các role có quyền truy cập (vd: 'ADMIN', 'EMPLOYEE', 'MEMBER')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: `Bạn không có quyền truy cập tài nguyên này. Vai trò yêu cầu: ${allowedRoles.join(', ')}`,
                data: null
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
