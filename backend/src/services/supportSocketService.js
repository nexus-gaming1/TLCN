//SupportSocketService (Singleton Pattern)->Đảm nhiệm giao tiếp thời gian thực cho phân hệ Tiếp nhận Hỗ trợ và sự cố
class SupportSocketService {
  constructor() {
    this.io = null;
  }

  init(io) {
    this.io = io;
  }

  // Bắn thông báo khi có ticket mới từ khách hàng -> Phát tới Room 'staff:orders' để thu ngân nhận âm thanh chuông báo
  notifyNewRequest(requestDto) {
    if (!this.io) return;
    this.io.to('staff:orders').emit('support:created', requestDto);
  }

  // Bắn thông báo khi trạng thái ticket thay đổi (Đã tiếp nhận, Đã hoàn tất, Đã hoàn tiền)
  // -> Phát tới Room 'staff:orders' (để cập nhật bảng của thu ngân)
  // -> Phát tới Room 'customer:<memberId>' (để thông báo riêng cho khách)
  notifyRequestUpdated(requestDto, memberId = null) {
    if (!this.io) return;

    // 1. Cập nhật cho toàn bộ nhân viên quầy
    this.io.to('staff:orders').emit('support:updated', requestDto);

    // 2. Thông báo riêng tới máy của khách hàng
    const targetMember = memberId || requestDto.member_id;
    if (targetMember) {
      this.io.to(`customer:${targetMember}`).emit('support:updated', requestDto);
    }
  }
}

module.exports = new SupportSocketService();
module.exports.SupportSocketService = SupportSocketService;