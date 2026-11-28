const orderService = require('../services/orderService');

class OrderController {
  constructor(service = orderService) {
    this.orderService = service;
  }


  // ----------------------------------------------------
  // 1. Nhóm API gọi món, đơn cá nhân ( khách hàng)
 
  async getAvailableMenu(req, res, next) {
    try {
      const menu = await this.orderService.getAvailableMenu();
      return res.json({
        status: 'success',
        data: menu,
        message: 'Lấy thực đơn phục vụ thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req, res, next) {
    try {
      const isStaffOrAdmin = req.user.role === 'EMPLOYEE' || req.user.role === 'ADMIN';
      let memberId = req.user.user_id;
      // Nếu nhân viên tạo đơn hộ: hỗ trợ truyền cả username hoặc member_id
      if (isStaffOrAdmin && req.body.target_member_id) {
        const rawTarget = req.body.target_member_id;
        if (typeof rawTarget === 'string' && isNaN(Number(rawTarget))) {
          const userObj = await this.orderService.orderRepo.models.User.findOne({
            where: { username: rawTarget.trim() },
            include: [{ model: this.orderService.orderRepo.models.Member, as: 'memberProfile' }]
          });
          if (!userObj || !userObj.memberProfile) {
            return res.status(404).json({
              status: 'error',
              message: `Không tìm thấy tài khoản hội viên có tên '${rawTarget}'`
            });
          }
          memberId = userObj.memberProfile.member_id;
        } else {
          memberId = Number(rawTarget);
        }
      }
      const order = await this.orderService.createOrder(memberId, req.body, req.user);
      return res.status(201).json({
        status: 'success',
        data: order,
        message: 'Đặt món thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyOrders(req, res, next) {
    try {
      const memberId = req.user.user_id;
      const result = await this.orderService.getMyOrders(memberId, req.query);

      return res.json({
        status: 'success',
        data: result,
        message: 'Lấy danh sách đơn hàng cá nhân thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async customerCancelOrder(req, res, next) {
    try {
      const orderId = req.params.id;
      const memberId = req.user.user_id;
      const result = await this.orderService.customerCancelOrder(orderId, memberId);

      return res.json({
        status: 'success',
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async checkSessionStatus(req, res, next) {
    try {
      const memberId = req.user.user_id;
      const data = await this.orderService.checkCustomerSession(memberId);
      return res.json({
        status: 'success',
        data,
        message: 'Kiểm tra phiên chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }


  // ------------------------------------------------------------------------
  // 2. Nhóm API của nhân viên 

  async getStaffPendingOrders(req, res, next) {
    try {
      const result = await this.orderService.getStaffPendingOrders(req.query);
      return res.json({
        status: 'success',
        data: result.data,
        total: result.total,
        message: 'Lấy danh sách đơn hàng cho bếp thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      const staffId = req.user.user_id;

      const result = await this.orderService.updateOrderStatus(orderId, status, staffId);
      return res.json({
        status: 'success',
        data: result,
        message: `Đã cập nhật trạng thái đơn hàng sang ${status}`
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmCashPayment(req, res, next) {
    try {
      const orderId = req.params.id;
      const staffId = req.user.user_id;

      const result = await this.orderService.confirmCashPayment(orderId, staffId);
      return res.json({
        status: 'success',
        data: result,
        message: 'Xác nhận thu tiền mặt thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async staffCancelOrder(req, res, next) {
    try {
      const orderId = req.params.id;
      const { reason } = req.body;
      const staffId = req.user.user_id;

      const result = await this.orderService.staffCancelOrder(orderId, staffId, reason);
      return res.json({
        status: 'success',
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  //Hoàn tiền sự cố sau khi giao
  async refundCompletedOrder(req, res, next) {
    try {
      const orderId = req.params.id;
      const staffId = req.user.user_id;
      const { amount, reason } = req.body;
      const result = await this.orderService.refundCompletedOrder(orderId, staffId, { amount, reason });
      return res.json({
        status: 'success',
        data: result,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  
  // ------------------------------------------------------------------------
  // 3. NNhóm API quản trị và chi tiết ( admin)

  async getOrderHistory(req, res, next) {
    try {
      const { status, paymentStatus, startDate, endDate, search, page = 1, limit = 20 } = req.query;
      const pagination = {
        limit: parseInt(limit, 10),
        offset: (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10)
      };

      const result = await this.orderService.getOrderHistory(
        { status, paymentStatus, startDate, endDate, search },
        pagination
      );

      return res.json({
        status: 'success',
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit) || 1
        },
        message: 'Lấy lịch sử đơn hàng thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const orderId = req.params.id;
      const order = await this.orderService.getOrderById(orderId, req.user);

      return res.json({
        status: 'success',
        data: order,
        message: 'Lấy chi tiết đơn hàng thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
module.exports.OrderController = OrderController;