const supportService = require('../services/supportService');
const asyncHandler = require('../utils/asyncHandler');

// SupportController - Điều phối HTTP Request/Response cho Phiếu hỗ trợ và khiếu nại
class SupportController {
  constructor(service = supportService) {
    this.service = service;
  }

  // POST /api/support - Khách tạo yêu cầu hỗ trợ / khiếu nại / đánh giá
  createRequest = asyncHandler(async (req, res) => {
    // member_id lấy trực tiếp từ JWT payload đã xác thực
    const memberId = req.user.member_id || req.user.user_id;
    const data = await this.service.createRequest(memberId, req.body);
    return res.status(201).json({
      status: 'success',
      data,
      message: 'Gửi yêu cầu hỗ trợ thành công. Nhân viên sẽ hỗ trợ bạn ngay!'
    });
  });

  // GET /api/support/my-requests - Khách xem lịch sử yêu cầu của chính mình
  getMyRequests = asyncHandler(async (req, res) => {
    const memberId = req.user.member_id || req.user.user_id;
    const data = await this.service.getMyRequests(memberId);
    return res.json({
      status: 'success',
      data,
      message: 'Lấy lịch sử yêu cầu thành công'
    });
  });

  // GET /api/support - Staff/Admin xem danh sách ticket
  getStaffRequests = asyncHandler(async (req, res) => {
    const data = await this.service.getStaffRequests(req.query);
    return res.json({
      status: 'success',
      data,
      message: 'Lấy danh sách yêu cầu hỗ trợ thành công'
    });
  });

  // PATCH /api/support/:id/process - Staff xử lý ticket (Tiếp nhận / Hoàn tất / Hoàn tiền / Từ chối)
  processRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const staffId = req.user.user_id;
    const data = await this.service.processRequest(id, staffId, req.body);
    return res.json({
      status: 'success',
      data,
      message: 'Cập nhật trạng thái xử lý ticket thành công'
    });
  });

  // GET /api/support/stats - Admin xem thống kê điểm hài lòng
  getStats = asyncHandler(async (req, res) => {
    const data = await this.service.getStats();
    return res.json({
      status: 'success',
      data,
      message: 'Lấy thống kê đánh giá chất lượng thành công'
    });
  });
}

module.exports = new SupportController();
module.exports.SupportController = SupportController;