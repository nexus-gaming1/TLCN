const transactionService = require('../services/transactionService');
const computerSocketService = require('../services/computerSocketService');

/**
 * TransactionController
 * Quản lý HTTP RESTful endpoints cho Sổ Cái & Tra Cứu Giao Dịch (Internal Web/App)
 * Tuân thủ Single Responsibility Principle (SRP):
 * - Chỉ phục vụ các thao tác của nhân viên thu ngân / quản trị viên nội bộ.
 * - Toàn bộ thao tác Webhook bên thứ 3 đã được tách riêng sang WebhookController.
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
      const payload = {
        ...req.body,
        processed_by: req.user ? req.user.user_id : req.body.processed_by
      };
      const newTxn = await transactionService.createTopUpTransaction(payload);
      if (payload.member_id) {
        await computerSocketService.syncMemberSessionTime(payload.member_id);
      }
      return res.status(201).json({
        status: 'success',
        data: newTxn,
        message: 'Nạp tiền tại quầy thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async createWithdraw(req, res, next) {
      try {
        const payload = {
          ...req.body,
          processed_by: req.user ? req.user.user_id : req.body.processed_by
        };
        const newTxn = await transactionService.createWithdrawTransaction(payload);
        if (payload.member_id) {
          await computerSocketService.syncMemberSessionTime(payload.member_id);
        }
        return res.status(201).json({
          status: 'success',
          data: newTxn,
          message: 'Rút tiền tại quầy thành công'
        });
      } catch (error) {
        next(error);
      }
  }

  async createBonusTopUp(req, res, next) {
      try {
        const payload = {
          ...req.body,
          processed_by: req.user ? req.user.user_id : req.body.processed_by
        };
        const newTxn = await transactionService.createBonusTopUpTransaction(payload);
        if (payload.member_id) {
          await computerSocketService.syncMemberSessionTime(payload.member_id);
        }
        return res.status(201).json({
          status: 'success',
          data: newTxn,
          message: 'Tặng tiền miễn phí thành công'
        });
      } catch (error) {
        next(error);
      }
    }

  async createBonusWithdraw(req, res, next) {
      try {
        const payload = {
          ...req.body,
          processed_by: req.user ? req.user.user_id : req.body.processed_by
        };
        const newTxn = await transactionService.createBonusWithdrawTransaction(payload);
        if (payload.member_id) {
          await computerSocketService.syncMemberSessionTime(payload.member_id);
        }
        return res.status(201).json({
          status: 'success',
          data: newTxn,
          message: 'Trừ tiền miễn phí thành công'
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
      if (updated.used_by) {
        await computerSocketService.syncMemberSessionTime(updated.used_by);
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
