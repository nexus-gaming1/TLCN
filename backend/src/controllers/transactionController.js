const transactionService = require('../services/transactionService');

/**
 * TransactionController
 * Quản lý HTTP RESTful endpoints cho Sổ Cái & Tra Cứu Giao Dịch
 */
class TransactionController {
  async getTransactions(req, res, next) {
    try {
      const data = await transactionService.getAllTransactions(req.query);
      return res.json({
        status: 'success',
        data: data.transactions,
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
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
}

module.exports = new TransactionController();
