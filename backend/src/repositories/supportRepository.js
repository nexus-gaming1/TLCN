// src/repositories/supportRepository.js
const db = require('../models');
const { Op } = require('sequelize');

//SupportRepository - Đảm nhận toàn bộ truy vấn CSDL cho SupportRequest
//Tuân thủ Single Responsibility Principle (SRP)
class SupportRepository {
  constructor(models = db) {
    this.models = models;
  }

  //Tạo phiếu hỗ trợ / khiếu nại mới
  async create(data) {
    return await this.models.SupportRequest.create(data);
  }

  //Tìm ticket theo ID (kèm thông tin máy trạm, hội viên, đơn hàng, và người xử lý)
  async findById(requestId) {
    return await this.models.SupportRequest.findByPk(requestId, {
      include: [
         {
          model: this.models.ServiceOrder,
          as: 'order',
          include: [
            {
              model: this.models.ServiceOrderItem,
              as: 'orderItems'
            },
            {
              model: this.models.FinancialTransaction,
              as: 'transactions',
              where: {
                type: 'EXPENSE',
                category: 'REFUND'
              },
              required: false,
              separate: true,
              attributes: ['transaction_id', 'amount']
            }
          ]
        },
      ]
    });
  }

    //Lấy danh sách ticket với bộ lọc linh hoạt (cho Staff/Admin)
    async findAll(options = {}) {
    // Ép kiểu số nguyên an toàn để tránh lỗi cú pháp LIMIT '20' trên MySQL/TiDB
    const parsedLimit = Math.max(1, parseInt(options.limit, 10) || 50);
    const parsedOffset = Math.max(0, parseInt(options.offset, 10) || 0);
    const { status, type } = options;
    const where = {};
    // Hỗ trợ cả 1 giá trị đơn ('PENDING') lẫn nhiều giá trị phân cách dấu phẩy ('PENDING,IN_PROGRESS')
    if (status && status !== 'ALL') {
      const statusList = String(status).split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statusList.length > 1 ? { [Op.in]: statusList } : statusList[0];
    }
    if (type && type !== 'ALL') {
      const typeList = String(type).split(',').map((t) => t.trim()).filter(Boolean);
      where.type = typeList.length > 1 ? { [Op.in]: typeList } : typeList[0];
    }
    return await this.models.SupportRequest.findAndCountAll({
      where,
      include: [
        {
          model: this.models.Computer,
          as: 'computer',
          attributes: ['computer_id', 'computer_name']
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
          model: this.models.ServiceOrder,
          as: 'order',
          attributes: ['order_id', 'status', 'total_amount', 'payment_status'],
          include: [
            {
              model: this.models.FinancialTransaction,
              as: 'transactions',
              where: {
                type: 'EXPENSE',
                category: 'REFUND'
              },
              required: false,
              separate: true,
              attributes: ['transaction_id', 'amount']
            }
          ]
        },
        {
          model: this.models.User,
          as: 'resolver',
          attributes: ['user_id', 'full_name']
        }
      ],
      order: [
        [
          db.sequelize.literal(`CASE 
            WHEN SupportRequest.status = 'PENDING' THEN 1 
            WHEN SupportRequest.status = 'IN_PROGRESS' THEN 2 
            ELSE 3 END`),
          'ASC'
        ],
        ['created_at', 'DESC']
      ],
      limit: parsedLimit,
      offset: parsedOffset,
      distinct: true
    });
  }

  //Lấy lịch sử ticket của riêng một khách hàng
  async findByMemberId(memberId, limit = 20) {
    return await this.models.SupportRequest.findAll({
      where: { member_id: memberId },
      include: [
        {
          model: this.models.Computer,
          as: 'computer',
          attributes: ['computer_id', 'computer_name']
        },
        {
          model: this.models.ServiceOrder,
          as: 'order',
          attributes: ['order_id', 'status', 'total_amount']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });
  }

  //Tự động tra cứu phiên chơi đang ACTIVE của hội viên để lấy computer_id (Chống giả mạo số máy)
  async findActiveRentalSession(memberId) {
    return await this.models.RentalSession.findOne({
      where: {
        member_id: memberId,
        status: this.models.RentalSession.Status.ACTIVE
      },
      include: [
        {
          model: this.models.Computer,
          as: 'computer'
        }
      ]
    });
  }

  // Kiểm tra xem hội viên hoặc máy trạm đã có yêu cầu hỗ trợ kỹ thuật nào đang mở chưa (chống spam)
  async findActiveMachineSupport(memberId, computerId = null) {
    const orConditions = [{ member_id: memberId }];
    if (computerId) {
      orConditions.push({ computer_id: computerId });
    }
    return await this.models.SupportRequest.findOne({
      where: {
        type: 'MACHINE_SUPPORT',
        status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] },
        [Op.or]: orConditions
      }
    });
  }

  // Kiểm tra xem đơn hàng đã có khiếu nại nào đang chờ xử lý chưa (tránh spam khiếu nại)
  async findActiveDisputeByOrderId(orderId) {
    return await this.models.SupportRequest.findOne({
      where: {
        order_id: orderId,
        type: 'ORDER_DISPUTE',
        status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] }
      }
    });
  }

  // Tìm đơn hàng để xác thực quyền khiếu nại
  async findOrderById(orderId) {
    return await this.models.ServiceOrder.findByPk(orderId);
  }

  // Cập nhật bản ghi SupportRequest
  async update(requestInstance, updateData) {
    return await requestInstance.update(updateData);
  }

  //Thống kê điểm hài lòng của khách hàng (AVG rating) và tổng số lượng ticket
  async getSatisfactionStats() {
    const ratingStats = await this.models.SupportRequest.findAll({
      where: {
        type: 'FEEDBACK',
        rating: { [Op.ne]: null }
      },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('rating')), 'averageRating'],
        [db.sequelize.fn('COUNT', db.sequelize.col('request_id')), 'totalReviews']
      ],
      raw: true
    });

    const pendingCount = await this.models.SupportRequest.count({
      where: { status: 'PENDING' }
    });

    return {
      averageRating: parseFloat(ratingStats[0]?.averageRating || 0).toFixed(1),
      totalReviews: parseInt(ratingStats[0]?.totalReviews || 0, 10),
      pendingRequests: pendingCount
    };
  }
}

module.exports = new SupportRepository();
module.exports.SupportRepository = SupportRepository;