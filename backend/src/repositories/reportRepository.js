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
}

module.exports = new ReportRepository();
module.exports.ReportRepository = ReportRepository;