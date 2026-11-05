const orderService = require('../services/orderService');

class OrderController {
  constructor(service = orderService) {
    this.orderService = service;
  }


  // ----------------------------------------------------
  // 1. Nhóm API khách hàng  (C# NetClient tại máy trạm)
 
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
      const memberId = req.user.user_id;
      const order = await this.orderService.createOrder(memberId, req.body);

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


  // ------------------------------------------------------------------------
  // 2. Nhóm API của nhân viên (C# NetStaff tại quầy)

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
        message: 'Xác nhận thu tiền mặt và chuyển đơn vào bếp thành công'
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
  
  
  // ------------------------------------------------------------------------
  // 3. NNhóm API của admin (Web Admin Console)

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