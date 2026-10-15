/**
 * Webhook Authentication Middleware
 * Xác thực các request từ server bên thứ 3 (SePay, MoMo, VNPay...)
 * Khác biệt hoàn toàn với authenticateToken (JWT dành cho người dùng nội bộ Web/App)
 */

const verifySePayWebhook = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.SEPAY_WEBHOOK_TOKEN;

  if (!expectedToken) {
    console.error('[CRITICAL] Chưa cấu hình SEPAY_WEBHOOK_TOKEN trong biến môi trường hệ thống!');
    return res.status(500).json({
      status: 'error',
      message: 'Máy chủ chưa cấu hình khóa bí mật SEPAY_WEBHOOK_TOKEN'
    });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Xác thực thất bại: Thiếu header Authorization: Bearer <TOKEN>'
    });
  }

  const token = authHeader.split(' ')[1];
  if (token !== expectedToken) {
    return res.status(401).json({
      status: 'error',
      message: 'Xác thực thất bại: Token xác thực webhook không chính xác'
    });
  }

  next();
};

module.exports = {
  verifySePayWebhook
};
