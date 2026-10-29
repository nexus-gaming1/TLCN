const db = require('../models');
const { Op } = require('sequelize');


 // OrderRepository - Đảm nhiệm toàn bộ thao tác truy vấn CSDL cho ServiceOrder, ServiceOrderItem
 //Tuân thủ Dependency Inversion (DIP) & Repository Pattern
class OrderRepository {
  constructor(models = db) {
    this.models = models;
    this.sequelize = models.sequelize;
  }

  
// Mở Managed Transaction đảm bảo tính toàn vẹn dữ liệu ACID
  async runInTransaction(callback) {
    return await this.sequelize.transaction(callback);
  }

  
   // Tìm hội viên kèm Khóa bi quan (Pessimistic Lock: SELECT ... FOR UPDATE)
   // Chống lỗi Double spending khi trừ ví 
  async findMemberByIdWithLock(memberId, transaction) {
    return await this.models.Member.findByPk(memberId, {
      lock: transaction?.LOCK ? transaction.LOCK.UPDATE : true,
      transaction,
      include: [
        {
          model: this.models.User,
          as: 'userInfo',
          attributes: ['user_id', 'username', 'full_name']
        }
      ]
    });
  }

  //Tìm danh sách món ăn kèm Khóa bi quan (SELECT ... FOR UPDATE)
  // Chống lỗi bán quá tồn kho
  async findItemsByIdsWithLock(itemIds, transaction) {
    return await this.models.ServiceItem.findAll({
      where: {
        service_item_id: { [Op.in]: itemIds }
      },
      lock: transaction?.LOCK ? transaction.LOCK.UPDATE : true,
      transaction
    });
  }

  //Tạo bản ghi đơn hàng mới (ServiceOrder)
  async createOrder(orderData, options = {}) {
    return await this.models.ServiceOrder.create(orderData, options);
  }

  //Tạo hàng loạt chi tiết món trong đơn (ServiceOrderItem) với snapshot giá
  async bulkCreateOrderItems(itemsData, options = {}) {
    return await this.models.ServiceOrderItem.bulkCreate(itemsData, options);
  }

  //Tạo giao dịch tài chính ghi vào sổ (FinancialTransaction)
  async createFinancialTransaction(txData, options = {}) {
    return await this.models.FinancialTransaction.create(txData, options);
  }

  //Tìm đơn hàng theo ID kèm chi tiết món ăn, người đặt và nhân viên xử lý
  async findOrderById(orderId, options = {}) {
    return await this.models.ServiceOrder.findByPk(orderId, {
      include: [
        {
          model: this.models.ServiceOrderItem,
          as: 'orderItems'
        },
        {
          model: this.models.Member,
          as: 'member',
          include: [
            {
              model: this.models.User,
              as: 'userInfo',
              attributes: ['user_id', 'username', 'full_name']
            }
          ]
        },
        {
          model: this.models.User,
          as: 'processedBy',
          attributes: ['user_id', 'username', 'full_name', 'role']
        },
        {
          model: this.models.FinancialTransaction,
          as: 'transactions',
          required: false
        }
      ],
      ...options
    });
  }

  //Tìm đơn hàng theo ID kèm Lock để phục vụ cập nhật trạng thái / hủy đơn
  async findOrderByIdWithLock(orderId, transaction) {
    return await this.models.ServiceOrder.findByPk(orderId, {
      lock: transaction?.LOCK ? transaction.LOCK.UPDATE : true,
      transaction,
      include: [
        {
          model: this.models.ServiceOrderItem,
          as: 'orderItems'
        },
        {
          model: this.models.FinancialTransaction,
          as: 'transactions',
          required: false
        }
      ]
    });
  }

  //Lấy danh sách đơn hàng có phân trang và bộ lọc (Dùng cho Web Admin và Staff C#)
  async findOrders(filters = {}, pagination = {}) {
    const { status, paymentStatus, startDate, endDate, search, memberId } = filters;
    const { limit = 20, offset = 0 } = pagination;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (paymentStatus && paymentStatus !== 'ALL') where.payment_status = paymentStatus;
    if (memberId) where.used_by = memberId;

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const nextDay = new Date(endDate);
        // Nếu truyền dạng YYYY-MM-DD (10 ký tự), dùng ngày kế tiếp làm mốc exclusive (<)
        if (typeof endDate === 'string' && endDate.length <= 10) {
          nextDay.setDate(nextDay.getDate() + 1);
          dateFilter[Op.lt] = nextDay;
        } else {
          dateFilter[Op.lte] = nextDay;
        }
      }
      where.created_at = dateFilter;
    }

    // Include để phục vụ search theo tên khách hoặc mã đơn
    const memberInclude = {
      model: this.models.Member,
      as: 'member',
      include: [
        {
          model: this.models.User,
          as: 'userInfo',
          attributes: ['user_id', 'username', 'full_name']
        }
      ]
    };

    if (search) {
      const q = `%${search.trim()}%`;
      const searchConditions = [
        { '$member.userInfo.full_name$': { [Op.like]: q } }, 
        { '$member.userInfo.username$': { [Op.like]: q } }  
      ];
      if (!isNaN(parseInt(search, 10))) {
        searchConditions.unshift({ order_id: parseInt(search, 10) });
      }
      where[Op.or] = searchConditions;
    }

    return await this.models.ServiceOrder.findAndCountAll({
      where,
      include: [
        {
          model: this.models.ServiceOrderItem,
          as: 'orderItems'    
        },
        memberInclude,
        {
          model: this.models.User,
          as: 'processedBy', 
          attributes: ['user_id', 'username', 'full_name']
        },
        {
          model: this.models.FinancialTransaction,
          as: 'transactions',
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      distinct: true // Đảm bảo count chính xác khi có quan hệ 1-N (include items)
    });
  }

  //Lưu thay đổi của entity (Member, ServiceItem, ServiceOrder)
  async save(instance, transaction = null) {
    return await instance.save(transaction ? { transaction } : undefined);
  }
}

module.exports = new OrderRepository();
module.exports.OrderRepository = OrderRepository;