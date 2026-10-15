const sePayService = require('../services/sePayService');

/**
 * WebhookController
 * Chuyên trách tiếp nhận và phản hồi các request Webhook từ các đối tác thanh toán bên thứ 3 (SePay, MoMo, VNPay...)
 * Tuân thủ Single Responsibility Principle (SRP):
 * - Chỉ phục vụ cổng Webhook từ bên ngoài, tách biệt hoàn toàn với TransactionController (dành cho Web/App nội bộ).
 * - Sử dụng Adapter / Gateway Service (sePayService) để xử lý logic phiên dịch.
 */
class WebhookController {
  constructor(sePaySvc = sePayService) {
    this.sePayService = sePaySvc;
  }

  /**
   * Tiếp nhận webhook thông báo biến động số dư ngân hàng từ SePay
   * Route: POST /api/webhooks/sepay
   */
  async handleSePay(req, res, next) {
    try {
      const result = await this.sePayService.processWebhook(req.body);

      return res.json({
        status: 'success',
        data: result,
        message: 'Tự động nạp tiền SePay thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WebhookController();
module.exports.WebhookController = WebhookController;
