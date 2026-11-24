const supportRepository = require('../repositories/supportRepository');
const supportSocketService = require('./supportSocketService');
const orderService = require('./orderService');
const { SupportRequestType, SupportRequestStatus, OrderStatus } = require('../constants/enums');
const { ValidationError, NotFoundError, BusinessLogicError, ConflictError } = require('../utils/errors');

//SupportService - Xử lý toàn bộ logic nghiệp vụ hỗ trợ, khiếu nại hoàn tiền và đánh giá
class SupportService {
  constructor(
    repository = supportRepository,
    socketService = supportSocketService,
    orderSvc = orderService
  ) {
    this.repository = repository;
    this.socketService = socketService;
    this.orderService = orderSvc;
  }

  // 1. Khách hàng tạo phiếu yêu cầu (Hỗ trợ máy / Khiếu nại F&B / Đánh giá chất lượng)
  async createRequest(memberId, payload = {}) {
    const parsedMemberId = parseInt(memberId, 10);
    if (!parsedMemberId || isNaN(parsedMemberId)) {
      throw new ValidationError('Mã hội viên không hợp lệ');
    }

    const { type, title, description, rating, order_id } = payload;

    // Validation loại yêu cầu
    if (!type || !Object.values(SupportRequestType).includes(type)) {
      throw new ValidationError(`Loại yêu cầu không hợp lệ. Cho phép: ${Object.values(SupportRequestType).join(', ')}`);
    }

    let detectedComputerId = null;
    let detectedComputerName = null;

    // Tra cứu phiên chơi đang hoạt động của khách
    const activeSession = await this.repository.findActiveRentalSession(parsedMemberId);
    if (activeSession) {
      detectedComputerId = activeSession.computer_id;
      detectedComputerName = activeSession.computer?.computer_name || `PC-${activeSession.computer_id}`;
    }

    // -------------------------------------------------------------
    // Xử lý theo từng loại

    // Trường hợp 1: Yêu cầu hỗ trợ thiết bị / kỹ thuật tại máy
    if (type === SupportRequestType.MACHINE_SUPPORT) {
      if (!detectedComputerId) {
        throw new BusinessLogicError('Bạn cần có phiên chơi đang hoạt động tại phòng máy để yêu cầu hỗ trợ tại máy.');
      }

      // Chống spam: Chặn tạo mới nếu hội viên hoặc máy trạm này đang có phiếu hỗ trợ chưa đóng
      const existingMachineSupport = await this.repository.findActiveMachineSupport(parsedMemberId, detectedComputerId);
      if (existingMachineSupport) {
        throw new ConflictError(
          `Máy trạm này đang có một yêu cầu hỗ trợ kỹ thuật đang được xử lý (Mã ticket: #${existingMachineSupport.request_id}). Vui lòng chờ nhân viên kiểm tra!`
        );
      }
    }

    // Trường hợp 2: Khiếu nại sự cố đơn món ăn / nước uống F&B
    let parsedOrderId = null;
    if (type === SupportRequestType.ORDER_DISPUTE) {
      parsedOrderId = parseInt(order_id, 10);
      if (!parsedOrderId || isNaN(parsedOrderId)) {
        throw new ValidationError('Vui lòng cung cấp mã đơn hàng cần khiếu nại (order_id)');
      }

      const order = await this.repository.findOrderById(parsedOrderId);
      if (!order) {
        throw new NotFoundError(`Không tìm thấy đơn hàng #${parsedOrderId}`);
      }

      // Đảm bảo khách chỉ được khiếu nại đơn của chính mình
      if (order.used_by !== parsedMemberId) {
        throw new BusinessLogicError('Bạn không có quyền khiếu nại đơn hàng của người khác');
      }

      // Chỉ khiếu nại đơn đã hoàn thành (COMPLETED)
      if (order.status !== OrderStatus.COMPLETED) {
        throw new BusinessLogicError('Chỉ có thể báo cáo sự cố cho đơn hàng đã phục vụ hoàn tất (COMPLETED)');
      }

      // Chống spam khiếu nại trùng lặp trên cùng 1 đơn hàng
      const existingDispute = await this.repository.findActiveDisputeByOrderId(parsedOrderId);
      if (existingDispute) {
        throw new ConflictError(`Đơn hàng #${parsedOrderId} đang có một khiếu nại đang được xử lý (Mã ticket: #${existingDispute.request_id})`);
      }
    }

    // Trường hợp 3: Đánh giá chất lượng dịch vụ (FEEDBACK)
    let validatedRating = null;
    if (type === SupportRequestType.FEEDBACK) {
      if (rating !== undefined && rating !== null) {
        validatedRating = parseInt(rating, 10);
        if (isNaN(validatedRating) || validatedRating < 1 || validatedRating > 5) {
          throw new ValidationError('Đánh giá chất lượng phải từ 1 đến 5 sao');
        }
      }
    }

    // Xác định tiêu đề mặc định nếu khách không nhập
    const finalTitle = title && title.trim() 
      ? title.trim() 
      : type === SupportRequestType.MACHINE_SUPPORT 
        ? `[${detectedComputerName || 'MÁY TRẠM'}] Khách yêu cầu hỗ trợ thiết bị`
        : type === SupportRequestType.ORDER_DISPUTE 
          ? `[Sự cố F&B] Đơn hàng #${parsedOrderId}`
          : `[Đánh giá dịch vụ] Khách chấm ${validatedRating || 5}⭐`;

    const isFeedback = type === SupportRequestType.FEEDBACK;
    // Lưu vào CSDL
    const newRequest = await this.repository.create({
      member_id: parsedMemberId,
      computer_id: detectedComputerId,
      order_id: parsedOrderId,
      type,
      title: finalTitle,
      description: description ? description.trim() : null,
      rating: validatedRating,
      status: isFeedback ? SupportRequestStatus.RESOLVED : SupportRequestStatus.PENDING,
      resolution_note: isFeedback ? 'Hệ thống đã ghi nhận đánh giá của bạn' : null,
    });

    // Lấy lại dữ liệu đầy đủ kèm quan hệ để bắn socket
    const fullTicket = await this.repository.findById(newRequest.request_id);

    // Bắn socket tới nhân viên thu ngân
    this.socketService.notifyNewRequest(fullTicket);

    return fullTicket;
  }

  //2. Lấy danh sách ticket cho Staff/Admin
  async getStaffRequests(query = {}) {
    return await this.repository.findAll(query);
  }

  // 3. Khách hàng xem lịch sử yêu cầu của chính mình
  async getMyRequests(memberId) {
    const parsedMemberId = parseInt(memberId, 10);
    return await this.repository.findByMemberId(parsedMemberId);
  }

  // 4. Staff/Admin xử lý yêu cầu (Tiếp nhận / Hoàn tất / Bác bỏ / Duyệt)
  async processRequest(requestId, staffId, payload = {}) {
    const parsedId = parseInt(requestId, 10);
    if (!parsedId || isNaN(parsedId)) {
      throw new ValidationError('Mã ticket không hợp lệ');
    }

    const ticket = await this.repository.findById(parsedId);
    if (!ticket) {
      throw new NotFoundError(`Không tìm thấy yêu cầu hỗ trợ #${parsedId}`);
    }
    // Chốt chặn trạng thái: Tránh thu ngân bấm đúp hoặc xử lý lại ticket đã đóng
    if (ticket.status === SupportRequestStatus.RESOLVED || ticket.status === SupportRequestStatus.REJECTED) {
      throw new BusinessLogicError(`Yêu cầu #${parsedId} đã kết thúc (${ticket.status}), không thể xử lý lại`);
    }

    const { action, resolution_note, refund_amount } = payload;

    // Cho phép các hành động: 'IN_PROGRESS', 'RESOLVE', 'REFUND', 'REJECT'
    const allowedActions = ['IN_PROGRESS', 'RESOLVE', 'REFUND', 'REJECT'];
    
    if (!action || !allowedActions.includes(action)) {
      throw new ValidationError(`Hành động không hợp lệ. Cho phép: ${allowedActions.join(', ')}`);
    }

    // Chốt chặn State Machine 2 bước (PENDING -> IN_PROGRESS -> RESOLVED/REJECTED)
    if (action === 'IN_PROGRESS') {
      if (ticket.status !== SupportRequestStatus.PENDING) {
        throw new BusinessLogicError(`Yêu cầu #${parsedId} đã được tiếp nhận (${ticket.status}), không thể tiếp nhận lại`);
      }
    } else {
      // Các quyết định cuối cùng (RESOLVE, REFUND, REJECT) bắt buộc phải qua bước Tiếp nhận (IN_PROGRESS)
      if (ticket.status !== SupportRequestStatus.IN_PROGRESS) {
        throw new BusinessLogicError(
          `Vui lòng bấm "Tiếp nhận" yêu cầu #${parsedId} trước khi thực hiện thao tác kết thúc (${action})`
        );
      }
    }

    let updatedStatus = ticket.status;
    const incomingNote = resolution_note ? resolution_note.trim() : '';
    let finalNote = incomingNote;

    // -------------------------------------------------------------
    // Luồng hoàn tiền liên thông với khiếu nại ORDER_DISPUTE
    if (action === 'REFUND') {
      if (ticket.type !== SupportRequestType.ORDER_DISPUTE || !ticket.order_id) {
        throw new BusinessLogicError('Chỉ có thể thực hiện hoàn tiền cho các khiếu nại sự cố đơn hàng F&B (ORDER_DISPUTE)');
      }

      // Xác định số tiền hoàn: nếu không chỉ định thì hoàn toàn bộ đơn
      const order = await this.repository.findOrderById(ticket.order_id);
      if (!order) throw new NotFoundError('Không tìm thấy thông tin đơn hàng gắn với khiếu nại này');

      const amountToRefund = refund_amount !== undefined ? parseFloat(refund_amount) : parseFloat(order.total_amount || 0);
      const refundReason = incomingNote || `Xử lý sự cố khiếu nại ticket #${ticket.request_id}`;

      // Gọi vào luồng hoàn tiền gốc của orderService (có khóa Pessimistic Lock, ghi sổ FinancialTransaction)
      await this.orderService.refundCompletedOrder(ticket.order_id, staffId, {
        amount: amountToRefund,
        reason: refundReason
      });

      updatedStatus = SupportRequestStatus.RESOLVED;
      finalNote = `[ĐÃ HOÀN TIỀN ${amountToRefund.toLocaleString('vi-VN')}đ] ${refundReason}`;
    } else if (action === 'IN_PROGRESS') {
      updatedStatus = SupportRequestStatus.IN_PROGRESS;
      finalNote =
        incomingNote ||
        (ticket.type === SupportRequestType.ORDER_DISPUTE
          ? 'Thu ngân đã tiếp nhận và đang kiểm tra đơn hàng'
          : 'Nhân viên đang tới máy hỗ trợ');
    } else if (action === 'RESOLVE') {
      updatedStatus = SupportRequestStatus.RESOLVED;
      finalNote =
        incomingNote ||
        (ticket.type === SupportRequestType.ORDER_DISPUTE
          ? 'Đã xử lý sự cố món ăn (không hoàn tiền)'
          : 'Nhân viên đã hỗ trợ xử lý hoàn tất tại máy');
    } else if (action === 'REJECT') {
      if (ticket.type === SupportRequestType.MACHINE_SUPPORT) {
        throw new BusinessLogicError(
          'Yêu cầu hỗ trợ kỹ thuật tại máy không hỗ trợ từ chối. Vui lòng kiểm tra trực tiếp và đánh dấu Hoàn thành.'
        );
      }
      if (!incomingNote) {
        throw new ValidationError('Vui lòng nhập lý do từ chối khiếu nại vào ghi chú xử lý');
      }
      updatedStatus = SupportRequestStatus.REJECTED;
      finalNote = incomingNote;
    }

    // Cập nhật ticket
    const updatedTicket = await this.repository.update(ticket, {
      status: updatedStatus,
      resolved_by: staffId,
      resolution_note: finalNote
    });

    const refreshedRecord = await this.repository.findById(updatedTicket.request_id);

    // Đồng bộ Realtime cho cả Nhân viên và Khách hàng
    this.socketService.notifyRequestUpdated(refreshedRecord, refreshedRecord.member_id);

    return refreshedRecord;
  }

  // 5. Lấy báo cáo thống kê đánh giá sao cho Admin
  async getStats() {
    return await this.repository.getSatisfactionStats();
  }
}

module.exports = new SupportService();
module.exports.SupportService = SupportService;