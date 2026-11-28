// OrderSocketService (Singleton Pattern) -> Đảm nhiệm phát các sự kiện Real-time liên quan đến đơn hàng F&B
class OrderSocketService {
  constructor() {
    this.io = null;
  }

//Khởi tạo Socket.IO instance (gọi từ backend/index.js khi server khởi động)
  init(io) {
    this.io = io;
  }

  // Bắn thông báo khi có đơn hàng mới -> Phát tới Room 'staff:orders' để nhân viên nhận
  notifyOrderCreated(orderDto) {
    if (!this.io) return;
    this.io.to('staff:orders').emit('order:created', orderDto);
  }

  /**
   Bắn thông báo khi trạng thái đơn thay đổi
   -> Phát tới Room 'staff:orders' 
   -> Phát tới Room 'customer:<memberId>'
   */
  notifyOrderUpdated(orderDto, targetMemberId = null) {
    if (!this.io) return;
    
    // 1. Đồng bộ cho toàn bộ nhân viên quầy
    this.io.to('staff:orders').emit('order:updated', orderDto);

    // 2. Thông báo riêng cho khách hàng sở hữu đơn
    if (targetMemberId) {
      this.io.to(`customer:${targetMemberId}`).emit('order:updated', orderDto);
    }
  }
}

module.exports = new OrderSocketService();