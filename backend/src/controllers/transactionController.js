const transactionService = require('../services/transactionService');

/**
 * TransactionController
 * Quản lý HTTP RESTful endpoints cho Sổ Cái & Tra Cứu Giao Dịch
 */
class TransactionController {
  async getTransactions(req, res, next) {
    try {
      const data = await transactionService.getAllTransactions();
      return res.json({
        status: 'success',
        data: data.transactions,
        metrics: data.metrics,
        message: 'Lấy sổ cái giao dịch thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async createTopUp(req, res, next) {
    try {
      const newTxn = await transactionService.createTopUpTransaction(req.body);
      return res.status(201).json({
        status: 'success',
        data: newTxn,
        message: 'Nạp tiền tại quầy thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async refundTransaction(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updated = await transactionService.refundTransaction(id, reason);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy giao dịch để hoàn tiền'
        });
      }
      return res.json({
        status: 'success',
        data: updated,
        message: 'Hoàn tiền giao dịch thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  //Tiếp nhận webhook từ SePay cổng Thanh Toán
  async handleSePayWebhook(req, res, next) {
    try {
      // 1. Kiểm tra xác thực webhook authorization token (bearer token)
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.SEPAY_WEBHOOK_TOKEN || 'NEXUS_SEPAY_SECRET_TOKEN';

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          status: 'error',
          message: 'Xác thực thất bại: Thiếu header Authorization: Bearer <SEPAY_WEBHOOK_TOKEN>'
        });
      }

      const token = authHeader.split(' ')[1];
      if (token !== expectedToken) {
        return res.status(401).json({
          status: 'error',
          message: 'Xác thực thất bại: SEPAY_WEBHOOK_TOKEN không chính xác'
        });
      }

      // 2. Chuyển dữ liệu xuống Service xử lý
      const result = await transactionService.processSePayWebhook(req.body);

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

module.exports = new TransactionController();
