const db = require('../models');
const { Op } = require('sequelize');
const { TransactionType, TransactionCategory, TransactionStatusEnum, PaymentStatus } = require('../constants/enums');

//ReportRepository : Đảm nhiệm truy vấn và tổng hợp dữ liệu doanh thu từ CSDL
class ReportRepository {
  constructor(models = db) {
    this.models = models;
    this.sequelize = models.sequelize;
  }

   //Truy vấn tổng tiền nạp tài khoản gom nhóm theo ngày
   //Điều kiện: type = 'INCOME', category = 'MEMBER_TOPUP', status = 'COMPLETED'
  async getTopupRevenueByDateRange(startDate, endDate) {
    return await this.models.FinancialTransaction.findAll({
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('created_at')), 'date'],
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'topupRevenue']
      ],
      where: {
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        status: TransactionStatusEnum.COMPLETED,
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: [this.sequelize.fn('DATE', this.sequelize.col('created_at'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('created_at')), 'ASC']],
      raw: true
    });
  }

  
   //Truy vấn doanh thu đồ ăn gom nhóm theo ngày từ ServiceOrder + ServiceOrderItem
   //Điều kiện: payment_status = 'PAID' (Đã thanh toán)
   //Công thức: SUM(ServiceOrderItem.quantity * ServiceOrderItem.price)
  async getServiceOrderRevenueByDateRange(startDate, endDate) {
    return await this.models.ServiceOrder.findAll({
      attributes: [
        [this.sequelize.fn('DATE', this.sequelize.col('ServiceOrder.created_at')), 'date'],
        [
          this.sequelize.fn(
            'SUM',
            this.sequelize.literal('`ServiceOrderItems`.`quantity` * `ServiceOrderItems`.`price`')
          ),
          'serviceRevenue'
        ]
      ],
      include: [
        {
          model: this.models.ServiceOrderItem,
          attributes: [],
          required: true // INNER JOIN để chỉ tính những đơn có món
        }
      ],
      where: {
        payment_status: PaymentStatus.PAID,
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: [this.sequelize.fn('DATE', this.sequelize.col('ServiceOrder.created_at'))],
      order: [[this.sequelize.fn('DATE', this.sequelize.col('ServiceOrder.created_at')), 'ASC']],
      raw: true
    });
  }

  //Truy vấn tỷ trọng phương thức thanh toán tiền nạp (CASH, VIETQR...)
  async getPaymentMethodDistribution(startDate, endDate) {
    return await this.models.FinancialTransaction.findAll({
      attributes: [
        ['payment_method', 'method'],
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total']
      ],
      where: {
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        status: TransactionStatusEnum.COMPLETED,
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: ['payment_method'],
      order: [[this.sequelize.literal('total'), 'DESC']],
      raw: true
    });
  }

  //Truy vấn Top món ăn bán chạy nhất
  async getTopSellingItems(startDate, endDate, limit = 5) {
    return await this.models.ServiceOrderItem.findAll({
      attributes: [
        'service_item_id',
        'item_name',
        [this.sequelize.fn('SUM', this.sequelize.col('quantity')), 'totalSold'],
        [
          this.sequelize.fn(
            'SUM',
            this.sequelize.literal('`ServiceOrderItem`.`quantity` * `ServiceOrderItem`.`price`')
          ),
          'revenue'
        ]
      ],
      include: [
        {
          model: this.models.ServiceOrder,
          attributes: [],
          where: {
            payment_status: PaymentStatus.PAID,
            created_at: {
              [Op.gte]: startDate,
              [Op.lte]: endDate
            }
          },
          required: true
        }
      ],
      group: ['ServiceOrderItem.service_item_id', 'ServiceOrderItem.item_name'],
      order: [[this.sequelize.literal('revenue'), 'DESC']],
      limit: parseInt(limit, 10),
      raw: true,
      subQuery: false
    });
  }

  //Truy vấn top hội viên nạp tiền nhiều nhất
  async getTopVipMembers(startDate, endDate, limit = 5) {
    return await this.models.FinancialTransaction.findAll({
      attributes: [
        ['used_by', 'memberId'],
        [this.sequelize.col('memberInfo.userInfo.full_name'), 'name'],
        [this.sequelize.col('memberInfo.userInfo.username'), 'username'],
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'totalTopup']
      ],
      include: [
        {
          model: this.models.Member,
          as: 'memberInfo',
          attributes: [],
          required: true,
          include: [
            {
              model: this.models.User,
              as: 'userInfo',
              attributes: [],
              required: true
            }
          ]
        }
      ],
      where: {
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        status: TransactionStatusEnum.COMPLETED,
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: [
        'FinancialTransaction.used_by',
        'memberInfo.userInfo.user_id',
        'memberInfo.userInfo.full_name',
        'memberInfo.userInfo.username'
      ],
      order: [[this.sequelize.literal('totalTopup'), 'DESC']],
      limit: parseInt(limit, 10),
      raw: true,
      subQuery: false
    });
  }
}

module.exports = new ReportRepository();
module.exports.ReportRepository = ReportRepository;