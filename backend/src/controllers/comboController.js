const comboTimeService = require('../services/comboTimeService');

class ComboController {
  // GET /api/catalog/combos
  async getCombos(req, res, next) {
    try {
      const includeInactive = req.query.all === 'true' || req.user?.role === 'ADMIN' || req.user?.role === 'EMPLOYEE';
      const combos = await comboTimeService.getAllPackages({ includeInactive });
      return res.json({
        status: 'success',
        data: combos,
        message: 'Lấy danh sách gói Combo thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/catalog/combos/:id
  async getComboById(req, res, next) {
    try {
      const combo = await comboTimeService.getPackageById(req.params.id);
      return res.json({
        status: 'success',
        data: combo
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/catalog/combos
  async createCombo(req, res, next) {
    try {
      const newCombo = await comboTimeService.createPackage(req.body);
      return res.status(201).json({
        status: 'success',
        data: newCombo,
        message: 'Tạo gói Combo mới thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/catalog/combos/:id
  async updateCombo(req, res, next) {
    try {
      const updated = await comboTimeService.updatePackage(req.params.id, req.body);
      return res.json({
        status: 'success',
        data: updated,
        message: 'Cập nhật gói Combo thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/catalog/combos/:id/status
  async toggleComboStatus(req, res, next) {
    try {
      const { is_active } = req.body;
      const updated = await comboTimeService.togglePackageStatus(req.params.id, is_active);
      return res.json({
        status: 'success',
        data: updated,
        message: `Đã ${updated.is_active ? 'kích hoạt' : 'ngừng kinh doanh'} gói Combo thành công`
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/catalog/combos/:id
  async deleteCombo(req, res, next) {
    try {
      const result = await comboTimeService.deletePackage(req.params.id);
      return res.json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/catalog/combos/:id/items
  async setComboItems(req, res, next) {
    try {
      const updated = await comboTimeService.setComboItems(req.params.id, req.body.items);
      return res.json({
        status: 'success',
        data: updated,
        message: 'Cập nhật dịch vụ trong gói Combo thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/catalog/combos/purchase OR POST /api/catalog/combos/:id/purchase
  async purchaseCombo(req, res, next) {
    try {
      const comboId = req.params.id || req.body.combo_id;
      // Resolve memberId: if request is authenticated as MEMBER, only allow own memberId
      let memberId = req.body.member_id;
      let staffUserId = null;

      if (req.user) {
        if (req.user.role === 'MEMBER' || req.user.role === 'CUSTOMER') {
          memberId = req.user.member_id || req.user.user_id;
        } else {
          // Admin or Employee buying on behalf of a member
          staffUserId = req.user.user_id;
          if (!memberId) {
            return res.status(400).json({
              status: 'error',
              message: 'Vui lòng cung cấp mã hội viên (member_id)'
            });
          }
        }
      }

      const result = await comboTimeService.purchaseCombo({
        memberId,
        comboId,
        paymentMethod: req.body.payment_method || 'WALLET',
        staffUserId
      });

      return res.status(201).json({
        status: 'success',
        data: result,
        message: result.isExtension
          ? 'Gia hạn gói Combo Time thành công! Thời gian đã được cộng dồn.'
          : 'Mua gói Combo Time thành công! Vui lòng chọn máy để bắt đầu sử dụng.'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/catalog/combos/activate
  async activateSession(req, res, next) {
    try {
      const { combo_time_id, computer_id } = req.body;
      let memberId = null;

      if (req.user && (req.user.role === 'MEMBER' || req.user.role === 'CUSTOMER')) {
        memberId = req.user.member_id || req.user.user_id;
      }

      const result = await comboTimeService.activateSession({
        comboTimeId: combo_time_id,
        memberId,
        computerId: computer_id
      });

      return res.json({
        status: 'success',
        data: result,
        message: 'Kích hoạt phiên chơi Combo Time thành công! Máy trạm đã được mở khóa.'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/catalog/combos/switch-station
  async switchStation(req, res, next) {
    try {
      const { combo_time_id, target_computer_id } = req.body;
      let memberId = null;

      if (req.user && (req.user.role === 'MEMBER' || req.user.role === 'CUSTOMER')) {
        memberId = req.user.member_id || req.user.user_id;
      }

      const result = await comboTimeService.switchStation({
        comboTimeId: combo_time_id,
        memberId,
        targetComputerId: target_computer_id
      });

      return res.json({
        status: 'success',
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/catalog/combos/end-session
  async endSessionEarly(req, res, next) {
    try {
      const { combo_time_id } = req.body;
      let memberId = null;

      if (req.user && (req.user.role === 'MEMBER' || req.user.role === 'CUSTOMER')) {
        memberId = req.user.member_id || req.user.user_id;
      }

      const result = await comboTimeService.endSessionEarly({
        comboTimeId: combo_time_id,
        memberId
      });

      return res.json({
        status: 'success',
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/catalog/combos/active-time
  async getActiveCombo(req, res, next) {
    try {
      let memberId = req.query.member_id;

      if (req.user && (req.user.role === 'MEMBER' || req.user.role === 'CUSTOMER')) {
        memberId = req.user.member_id || req.user.user_id;
      } else if (!memberId && req.user) {
        memberId = req.user.member_id || req.user.user_id;
      }

      if (!memberId) {
        return res.status(400).json({
          status: 'error',
          message: 'Vui lòng cung cấp member_id'
        });
      }

      const activeCombo = await comboTimeService.getActiveComboByMember(memberId);
      return res.json({
        status: 'success',
        data: activeCombo,
        message: activeCombo ? 'Lấy thông tin phiên Combo thành công' : 'Không có phiên Combo nào đang hoạt động'
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/catalog/combos/history
  async getComboHistory(req, res, next) {
    try {
      let memberId = req.query.member_id;

      if (req.user && (req.user.role === 'MEMBER' || req.user.role === 'CUSTOMER')) {
        memberId = req.user.member_id || req.user.user_id;
      }

      if (!memberId) {
        return res.status(400).json({
          status: 'error',
          message: 'Vui lòng cung cấp member_id'
        });
      }

      const history = await comboTimeService.getMemberComboHistory(memberId);
      return res.json({
        status: 'success',
        data: history,
        message: 'Lấy lịch sử sử dụng Combo thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/catalog/combos/check-expired
  async checkExpired(req, res, next) {
    try {
      const count = await comboTimeService.checkAndExpireCombos();
      return res.json({
        status: 'success',
        data: { expiredCount: count },
        message: `Đã xử lý quét ${count} phiên combo hết hạn`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComboController();
