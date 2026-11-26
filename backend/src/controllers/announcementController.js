// src/controllers/announcementController.js
const announcementService = require('../services/announcementService');
const asyncHandler = require('../utils/asyncHandler');

///AnnouncementController - Điều phối HTTP Request/Response cho Thông báo
class AnnouncementController {
  constructor(service = announcementService) {
    this.service = service;
  }

  // GET /api/announcements/active - Khách xem banner đang bật
  getActiveAnnouncements = asyncHandler(async (req, res) => {
    const data = await this.service.getActiveAnnouncements();
    return res.json({
      status: 'success',
      data,
      message: 'Lấy danh sách thông báo đang hiển thị thành công'
    });
  });

  // GET /api/announcements - Staff/Admin lấy tất cả thông báo
  getAllAnnouncements = asyncHandler(async (req, res) => {
    const data = await this.service.getAllAnnouncements();
    return res.json({
      status: 'success',
      data,
      message: 'Lấy toàn bộ danh sách thông báo thành công'
    });
  });

  // POST /api/announcements - Tạo thông báo mới
  createAnnouncement = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const data = await this.service.createAnnouncement(userId, req.body);
    return res.status(201).json({
      status: 'success',
      data,
      message: 'Tạo thông báo mới thành công'
    });
  });

  // PUT /api/announcements/:id - Cập nhật nội dung thông báo
  updateAnnouncement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await this.service.updateAnnouncement(id, req.body);
    return res.json({
      status: 'success',
      data,
      message: 'Cập nhật thông báo thành công'
    });
  });

  // PATCH /api/announcements/:id/toggle - Bật/tắt trạng thái hiển thị
  toggleActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await this.service.toggleActive(id);
    return res.json({
      status: 'success',
      data,
      message: `Đã ${data.is_active ? 'bật' : 'tắt'} hiển thị thông báo thành công`
    });
  });

  // DELETE /api/announcements/:id - Xóa thông báo
  deleteAnnouncement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await this.service.deleteAnnouncement(id);
    return res.json({
      status: 'success',
      data,
      message: 'Đã xóa thông báo thành công'
    });
  });
}

module.exports = new AnnouncementController();
module.exports.AnnouncementController = AnnouncementController;