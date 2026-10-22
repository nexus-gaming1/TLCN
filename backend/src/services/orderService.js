const orderRepository = require('../repositories/orderRepository');
const {
  OrderStatus,
  PaymentStatus,
  PaymentMethodEnum,
  TransactionType,
  TransactionCategory,
  TransactionStatusEnum
} = require('../constants/enums');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errors');

class OrderService {
  constructor(orderRepo = orderRepository) {
    this.orderRepo = orderRepo;
  }

  //Helper: Tính tổng tiền của đơn hàng từ danh sách items
  calculateTotal(orderItems = []) {
    return orderItems.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const qty = parseInt(item.quantity || 0, 10);
      return sum + (price * qty);
    }, 0);
  }

  //Tạo đơn hàng kơí (Dùng cho khách tại máy trạm )
  // * @param {number} memberId - ID hội viên đặt món
  // * @param {Object} payload - { paymentMethod: 'WALLET'|'CASH', items: [{ service_item_id, quantity }] }
  async createOrder(memberId, payload = {}) {
    const { paymentMethod = PaymentMethodEnum.WALLET, items = [] } = payload;

    // 1. Validation sơ bộ đầu vào
    const parsedMemberId = parseInt(memberId, 10);
    if (!parsedMemberId || isNaN(parsedMemberId)) {
      throw new ValidationError('Mã hội viên đặt món không hợp lệ');
    }

    if (![PaymentMethodEnum.WALLET, PaymentMethodEnum.CASH].includes(paymentMethod)) {
      throw new ValidationError(`Phương thức thanh toán không hợp lệ (Chỉ chấp nhận WALLET hoặc CASH)`);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Giỏ hàng không được để trống');
    }

    // Gộp các item trùng lặp (nếu client gửi cùng 1 món 2 lần)
    const itemQuantityMap = new Map();
    for (const it of items) {
      const itemId = parseInt(it.service_item_id, 10);
      const qty = parseInt(it.quantity, 10);
      if (!itemId || isNaN(itemId)) throw new ValidationError('Mã món dịch vụ không hợp lệ');
      if (!qty || isNaN(qty) || qty <= 0) throw new ValidationError('Số lượng từng món phải lớn hơn 0');

      itemQuantityMap.set(itemId, (itemQuantityMap.get(itemId) || 0) + qty);
    }

    const uniqueItemIds = Array.from(itemQuantityMap.keys());

    // 2. TRANSACTION có khoá bi quan (PESSIMISTIC LOCKING)
    return await this.orderRepo.runInTransaction(async (t) => {
      // BƯỚC 2.1: Khoá bản ghi hội viên (SELECT ... FOR UPDATE)
      const member = await this.orderRepo.findMemberByIdWithLock(parsedMemberId, t);
      if (!member) {
        throw new NotFoundError(`Không tìm thấy thông tin hội viên #${parsedMemberId}`);
      }

      // BƯỚC 2.2: Khoá các món ăn được chọn trong kho(SELECT ... FOR UPDATE)
      const dbItems = await this.orderRepo.findItemsByIdsWithLock(uniqueItemIds, t);
      if (dbItems.length !== uniqueItemIds.length) {
        throw new NotFoundError('Một hoặc nhiều món dịch vụ không tồn tại trong hệ thống');
      }

      // Kiểm tra tính sẵn sàng và số lượng tồn kho từng món
      let totalAmount = 0;
      const orderItemsSnapshot = [];

      for (const dbItem of dbItems) {
        const requestedQty = itemQuantityMap.get(dbItem.service_item_id);

        if (!dbItem.is_available || dbItem.stock_quantity <= 0) {
          throw new BusinessLogicError(`Món "${dbItem.name}" hiện đã hết hàng`);
        }

        if (dbItem.stock_quantity < requestedQty) {
          throw new BusinessLogicError(
            `Món "${dbItem.name}" không đủ số lượng tồn kho (Còn lại: ${dbItem.stock_quantity}, Yêu cầu: ${requestedQty})`
          );
        }

        const unitPrice = parseFloat(dbItem.price || 0);
        totalAmount += unitPrice * requestedQty;

        orderItemsSnapshot.push({
          service_item_id: dbItem.service_item_id,
          item_name: dbItem.name, // Snapshot tên món bất biến
          price: unitPrice,        // Snapshot đơn giá bất biến
          quantity: requestedQty,
          dbItemInstance: dbItem
        });
      }

  
      // BƯỚC 2.3: Xử lý thanh toán: WALLET -> trừ ví, CASH -> chờ thu tiền tại bàn
      let initialStatus = OrderStatus.PENDING;
      let initialPaymentStatus = PaymentStatus.UNPAID;

      if (paymentMethod === PaymentMethodEnum.WALLET) {
        const currentBalance = parseFloat(member.real_balance || 0);
        if (currentBalance < totalAmount) {
          throw new BusinessLogicError(
            `Số dư ví không đủ (Số dư: ${currentBalance.toLocaleString('vi-VN')}đ, Cần thanh toán: ${totalAmount.toLocaleString('vi-VN')}đ)`
          );
        }

        // Trừ tiền ví hội viên
        member.real_balance = currentBalance - totalAmount;
        await this.orderRepo.save(member, t);

        // Quy tắc: Ví trừ tiền thành công -> Bếp làm luôn (PREPARING + PAID)
        initialStatus = OrderStatus.PREPARING;
        initialPaymentStatus = PaymentStatus.PAID;
      } else {
        // Quy tắc: Tiền mặt -> Chờ nhân viên thu tiền tại bàn (PENDING + UNPAID)
        initialStatus = OrderStatus.PENDING;
        initialPaymentStatus = PaymentStatus.UNPAID;
      }

      
      // BƯỚC 2.4: Trừ số lượng tồn kho của các món
      for (const snap of orderItemsSnapshot) {
        const itemInstance = snap.dbItemInstance;
        itemInstance.stock_quantity -= snap.quantity;
        // Nếu kho chạm 0 thì tự động gỡ trạng thái sẵn sàng
        if (itemInstance.stock_quantity === 0) {
          itemInstance.is_available = false;
        }
        await this.orderRepo.save(itemInstance, t);
      }

    
      // BƯỚC 2.5: Tạo các bản ghi đơn hàng(ServiceOrder)
      const newOrder = await this.orderRepo.createOrder({
        used_by: parsedMemberId,
        status: initialStatus,
        payment_status: initialPaymentStatus,
        processed_by: null // Ban đầu chưa có nhân viên xử lý
      }, { transaction: t });

      // BƯỚC 2.6: Tạo các dòng chi tiết (ServiceOrderItem)
      const itemsToInsert = orderItemsSnapshot.map(snap => ({
        order_id: newOrder.order_id,
        service_item_id: snap.service_item_id,
        item_name: snap.item_name,
        price: snap.price,
        quantity: snap.quantity
      }));
      await this.orderRepo.bulkCreateOrderItems(itemsToInsert, { transaction: t });

      // BƯỚC 2.7: Ghi nhận giao dịch đã thu tiền(FinancialTransaction)
      let createdTxn = null;
      if (paymentMethod === PaymentMethodEnum.WALLET) {
        createdTxn = await this.orderRepo.createFinancialTransaction({
          type: TransactionType.INCOME,
          category: TransactionCategory.SERVICE_SALE,
          amount: totalAmount,
          payment_method: PaymentMethodEnum.WALLET,
          status: TransactionStatusEnum.COMPLETED,
          order_id: newOrder.order_id,
          used_by: parsedMemberId,
          processed_by: null,
          description: `[Đơn hàng F&B #${newOrder.order_id}] Khách thanh toán ví hội viên (${items.length} món)`
        }, { transaction: t });
      }

      // Trả về DTO kết quả hoàn tất
      return {
        order_id: newOrder.order_id,
        status: newOrder.status,
        payment_status: newOrder.payment_status,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        new_balance: paymentMethod === PaymentMethodEnum.WALLET ? parseFloat(member.real_balance) : parseFloat(member.real_balance || 0),
        items: itemsToInsert,
        transaction_id: createdTxn ? createdTxn.transaction_id : null,
        created_at: newOrder.created_at
      };
    });
  }

  //Câp nhật trạng thái đơn hàng (Dành cho nhân viên trên Client C#))
  //  //Xử lý hoàn kho và hoàn ví tự động nếu đơn bị CANCELLED
  async updateOrderStatus(orderId, newStatus, staffId = null) {
    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(newStatus)) {
      throw new ValidationError(`Trạng thái không hợp lệ: ${newStatus}`);
    }

    return await this.orderRepo.runInTransaction(async (t) => {
      // Khóa đơn hàng để tránh 2 nhân viên cùng bấm thao tác cùng lúc
      const order = await this.orderRepo.findOrderByIdWithLock(orderId, t);
      if (!order) {
        throw new NotFoundError(`Không tìm thấy đơn hàng #${orderId}`);
      }

      // Chặn cập nhật nếu đơn đã ở trạng thái kết thúc
      if (order.status === OrderStatus.COMPLETED) {
        throw new BusinessLogicError('Đơn hàng đã hoàn thành, không thể thay đổi trạng thái');
      }
      if (order.status === OrderStatus.CANCELLED) {
        throw new BusinessLogicError('Đơn hàng đã bị hủy trước đó, không thể chỉnh sửa');
      }

      
      // Xử lý hủy đơn (CANCELLED): Hoàn kho và hoàn ví nếu đã thanh toán
      if (newStatus === OrderStatus.CANCELLED) {
        // 1. Hoàn lại số lượng tồn kho cho các món ăn
        const orderItems = order.ServiceOrderItems || [];
        for (const oi of orderItems) {
          const item = await this.orderRepo.models.ServiceItem.findByPk(oi.service_item_id, {
            lock: t.LOCK ? t.LOCK.UPDATE : true,
            transaction: t
          });
          if (item) {
            item.stock_quantity = (item.stock_quantity || 0) + oi.quantity;
            if (item.stock_quantity > 0) item.is_available = true;
            await this.orderRepo.save(item, t);
          }
        }

        // 2. Nếu đơn đã thanh toán bằng ví (WALLET) -> Hoàn tiền ví cho khách
        if (order.payment_status === PaymentStatus.PAID) {
          const walletTxn = (order.financialTransactions || []).find(
            tx => tx.payment_method === PaymentMethodEnum.WALLET && tx.category === TransactionCategory.SERVICE_SALE
          );

          if (walletTxn) {
            const refundAmount = parseFloat(walletTxn.amount || 0);
            const member = await this.orderRepo.findMemberByIdWithLock(order.used_by, t);
            if (member) {
              member.real_balance = parseFloat(member.real_balance || 0) + refundAmount;
              await this.orderRepo.save(member, t);
            }

            // Ghi sổ cái hoàn tiền REFUND (Loại EXPENSE)
            await this.orderRepo.createFinancialTransaction({
              type: TransactionType.EXPENSE,
              category: TransactionCategory.REFUND,
              amount: refundAmount,
              payment_method: PaymentMethodEnum.WALLET,
              status: TransactionStatusEnum.COMPLETED,
              order_id: order.order_id,
              used_by: order.used_by,
              processed_by: staffId,
              description: `[Hoàn tiền Đơn #${order.order_id}] Hủy đơn hàng dịch vụ F&B bởi nhân viên #${staffId || ''}`
            }, { transaction: t });
          }
        }
      }

      // Cập nhật trạng thái và nhân viên phụ trách
      order.status = newStatus;
      if (staffId) order.processed_by = staffId;
      await this.orderRepo.save(order, t);

      return {
        order_id: order.order_id,
        status: order.status,
        payment_status: order.payment_status,
        processed_by: order.processed_by
      };
    });
  }

  //Xác nhận thu tiền mặt tại quầy (Dành cho nhân viên trên Client C#)
  // -> chuyển đơn sang PAID và PREPARING để bếp bắt đầu làm
  async confirmCashPayment(orderId, staffId) {
    return await this.orderRepo.runInTransaction(async (t) => {
      const order = await this.orderRepo.findOrderByIdWithLock(orderId, t);
      if (!order) {
        throw new NotFoundError(`Không tìm thấy đơn hàng #${orderId}`);
      }

      if (order.payment_status === PaymentStatus.PAID) {
        throw new BusinessLogicError('Đơn hàng này đã được thanh toán rồi');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BusinessLogicError('Không thể thu tiền cho đơn hàng đã bị hủy');
      }

      // Tính tổng tiền đơn từ các món đã đặt
      const totalAmount = this.calculateTotal(order.ServiceOrderItems || []);

      // Cập nhật thanh toán và chuyển sang chế biến
      order.payment_status = PaymentStatus.PAID;
      order.status = OrderStatus.PREPARING;
      order.processed_by = staffId;
      await this.orderRepo.save(order, t);

      // Ghi sổ  thu tiền mặt
      const txn = await this.orderRepo.createFinancialTransaction({
        type: TransactionType.INCOME,
        category: TransactionCategory.SERVICE_SALE,
        amount: totalAmount,
        payment_method: PaymentMethodEnum.CASH,
        status: TransactionStatusEnum.COMPLETED,
        order_id: order.order_id,
        used_by: order.used_by,
        processed_by: staffId,
        description: `[Đơn hàng F&B #${order.order_id}] Thu tiền mặt tại quầy/bàn bởi nhân viên #${staffId}`
      }, { transaction: t });

      return {
        order_id: order.order_id,
        status: order.status,
        payment_status: order.payment_status,
        total_amount: totalAmount,
        transaction_id: txn.transaction_id,
        processed_by: staffId
      };
    });
  }

  //Xem chi tiết một đơn hàng kèm snapshot
  async getOrderById(orderId) {
    const order = await this.orderRepo.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError(`Không tìm thấy đơn hàng #${orderId}`);
    }

    const totalAmount = this.calculateTotal(order.ServiceOrderItems || []);
    return {
      order_id: order.order_id,
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      total_amount: totalAmount,
      member: order.Member ? {
        member_id: order.Member.member_id,
        username: order.Member.userInfo?.username || '',
        full_name: order.Member.userInfo?.full_name || '',
        phone: order.Member.userInfo?.phone || ''
      } : null,
      processedBy: order.User ? {
        user_id: order.User.user_id,
        username: order.User.username,
        full_name: order.User.full_name
      } : null,
      items: (order.ServiceOrderItems || []).map(oi => ({
        service_item_id: oi.service_item_id,
        item_name: oi.item_name,
        price: parseFloat(oi.price || 0),
        quantity: oi.quantity,
        subtotal: parseFloat(oi.price || 0) * oi.quantity
      })),
      transactions: (order.financialTransactions || []).map(tx => ({
        transaction_id: tx.transaction_id,
        type: tx.type,
        amount: parseFloat(tx.amount || 0),
        payment_method: tx.payment_method,
        status: tx.status,
        created_at: tx.created_at
      }))
    };
  }

  // Lấy danh sách lịch sử đơn hàng phân trang (Dành cho Web Admin)
  async getOrderHistory(filters = {}, pagination = {}) {
    const { count, rows } = await this.orderRepo.findOrders(filters, pagination);

    const data = rows.map(order => {
      const totalAmount = this.calculateTotal(order.ServiceOrderItems || []);
      const paymentMethod = (order.financialTransactions && order.financialTransactions.length > 0)
        ? order.financialTransactions[0].payment_method
        : 'CASH';

      return {
        order_id: order.order_id,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        created_at: order.created_at,
        customer_name: order.Member?.userInfo?.full_name || order.Member?.userInfo?.username || `Hội viên #${order.used_by}`,
        staff_name: order.User?.full_name || null,
        items_summary: (order.ServiceOrderItems || []).map(i => `${i.quantity}x ${i.item_name}`).join(', '),
        item_count: (order.ServiceOrderItems || []).reduce((acc, curr) => acc + curr.quantity, 0)
      };
    });

    return {
      total: count,
      page: Math.floor((pagination.offset || 0) / (pagination.limit || 20)) + 1,
      limit: pagination.limit || 20,
      data
    };
  }
}

module.exports = new OrderService();
module.exports.OrderService = OrderService;