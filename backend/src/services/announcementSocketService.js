// src/services/announcementSocketService.js

//AnnouncementSocketService (Singleton Pattern) -> Đảm nhiệm phát các sự kiện Realtime liên quan đến thông báo và banner toàn quán
class AnnouncementSocketService {
  constructor() {
    this.io = null;
  }

  //Khởi tạo Socket.IO instance (được gọi từ backend/index.js)
  init(io) {
    this.io = io;
  }

  // Phát sóng tới toàn bộ client đang kết nối khi banner có sự thay đổi (Tạo mới, sửa nội dung, bật/tắt hoặc xóa)
  broadcastAnnouncementUpdated(data = null) {
    if (!this.io) return;
    this.io.emit('announcement:updated', {
      timestamp: new Date().toISOString(),
      action: data?.action || 'REFRESH',
      announcement: data?.announcement || null
    });
  }
}

module.exports = new AnnouncementSocketService();
module.exports.AnnouncementSocketService = AnnouncementSocketService;