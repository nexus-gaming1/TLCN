const db = require('../models');
const { Op } = require('sequelize');

/**
 * TransactionRepository
 * Đóng gói toàn bộ thao tác truy vấn CSDL cho FinancialTransaction (Tuân thủ DIP & Repository Pattern)
 */
class TransactionRepository {
  constructor(models = db) {
    this.models = models;
    this.sequelize = models.sequelize;
  }

  /**
   * Xây dựng mệnh đề WHERE từ params nghiệp vụ (Ẩn giấu chi tiết Sequelize Op khỏi tầng Service)
   */
  buildSearchFilters(filters = {}) {
    const { category, paymentMethod, status, dateRange, search } = filters;
    const whereClause = {};

    if (category && category !== 'all') whereClause.category = String(category).toUpperCase().trim();
    if (paymentMethod && paymentMethod !== 'all') whereClause.payment_method = String(paymentMethod).toUpperCase().trim();
    if (status && status !== 'all') whereClause.status = String(status).toUpperCase().trim();

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const start = new Date();
      if (dateRange === 'today') {
        start.setHours(0, 0, 0, 0);
      } else if (dateRange === '7days') {
        start.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        start.setDate(now.getDate() - 30);
      }
      whereClause.created_at = { [Op.gte]: start };
    }

    if (search && String(search).trim()) {
      const trimmedSearch = String(search).trim();
      const q = `%${trimmedSearch}%`;
      const searchOr = [];

      // Phân tích mã giao dịch TXN-XXXXX hoặc số ID
      const matchTxn = trimmedSearch.match(/txn-0*(\d+)/i);
      if (matchTxn) {
        searchOr.push({ transaction_id: parseInt(matchTxn[1], 10) });
      } else if (/^\d+$/.test(trimmedSearch)) {
        searchOr.push({ transaction_id: parseInt(trimmedSearch, 10) });
      }

      searchOr.push({ txn_code: { [Op.like]: q } });
      searchOr.push({ '$memberInfo.phone$': { [Op.like]: q } });
      searchOr.push({ '$memberInfo.userInfo.full_name$': { [Op.like]: q } });

      whereClause[Op.or] = searchOr;
    }

    return whereClause;
  }

  /**
   * Truy vấn danh sách giao dịch có phân trang và quan hệ đầy đủ (Member, User, Rank)
   */
  async findAndCountAllWithAssociations(filters = {}, pagination = {}) {
    const whereClause = this.buildSearchFilters(filters);
    const safePage = Math.max(1, parseInt(pagination.page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    const includeQuery = [
      {
        model: this.models.Member,
        as: 'memberInfo',
        include: [
          {
            model: this.models.User,
            as: 'userInfo',
            attributes: ['user_id', 'username', 'full_name']
          },
          {
            model: this.models.MembershipRank,
            attributes: ['rank_id', 'name']
          }
        ]
      },
      {
        model: this.models.User,
        as: 'processedBy',
        attributes: ['user_id', 'username', 'full_name']
      }
    ];

    return await this.models.FinancialTransaction.findAndCountAll({
      where: whereClause,
      include: includeQuery,
      order: [['transaction_id', 'DESC']],
      limit: safeLimit,
      offset,
      subQuery: false
    });
  }

  /**
   * Truy vấn danh sách giao dịch có phân trang và quan hệ
   */
  async findAndCountAll(options) {
    return await this.models.FinancialTransaction.findAndCountAll(options);
  }

  /**
   * Tìm giao dịch theo Primary Key (ID)
   */
  async findById(transactionId, options = {}) {
    return await this.models.FinancialTransaction.findByPk(transactionId, options);
  }

  /**
   * Tìm giao dịch theo ID kèm Pessimistic Lock trong Transaction
   */
  async findByIdWithLock(transactionId, transaction = null) {
    const options = {};
    if (transaction) {
      options.transaction = transaction;
      options.lock = transaction.LOCK ? transaction.LOCK.UPDATE : true;
    }
    return await this.models.FinancialTransaction.findByPk(transactionId, options);
  }

  /**
   * Lưu thay đổi của entity Transaction
   */
  async save(txnInstance, transaction = null) {
    return await txnInstance.save(transaction ? { transaction } : undefined);
  }

  /**
   * Tìm giao dịch theo mã tham chiếu / mã ngân hàng (txn_code)
   */
  async findByTxnCode(txnCode, options = {}) {
    return await this.models.FinancialTransaction.findOne({
      where: { txn_code: txnCode },
      ...options
    });
  }

  /**
   * Tạo mới bản ghi giao dịch tài chính
   */
  async create(data, options = {}) {
    return await this.models.FinancialTransaction.create(data, options);
  }

  /**
   * Tính toán các chỉ số KPI tài chính bằng SQL Aggregation (hỗ trợ lọc theo khoảng thời gian/bộ lọc)
   */
  async getTodayKpiMetrics(whereOrDateStart) {
    const whereClause = whereOrDateStart instanceof Date
      ? { created_at: { [Op.gte]: whereOrDateStart } }
      : (whereOrDateStart && typeof whereOrDateStart === 'object' ? whereOrDateStart : {});

    return await this.models.FinancialTransaction.findOne({
      attributes: [
        [this.sequelize.fn('COUNT', this.sequelize.col('transaction_id')), 'totalTxnCount'],
        [
          this.sequelize.fn('SUM', this.sequelize.literal(`
            CASE 
              WHEN (\`type\` = 'INCOME' OR \`category\` IN ('MEMBER_TOPUP', 'SERVICE_SALE', 'COMBO_PURCHASE')) AND \`status\` = 'COMPLETED' 
              THEN \`amount\` ELSE 0 
            END
          `)),
          'totalRevenue'
        ],
        [
          this.sequelize.fn('SUM', this.sequelize.literal(`
            CASE 
              WHEN \`category\` = 'MEMBER_TOPUP' AND \`status\` = 'COMPLETED' THEN \`amount\` 
              WHEN \`category\` = 'COMBO_PURCHASE' AND \`status\` = 'COMPLETED' THEN \`amount\` * 0.65 
              ELSE 0 
            END
          `)),
          'pcTimeRevenue'
        ],
        [
          this.sequelize.fn('SUM', this.sequelize.literal(`
            CASE 
              WHEN \`category\` = 'SERVICE_SALE' AND \`status\` = 'COMPLETED' THEN \`amount\` 
              WHEN \`category\` = 'COMBO_PURCHASE' AND \`status\` = 'COMPLETED' THEN \`amount\` * 0.35 
              ELSE 0 
            END
          `)),
          'foodServiceRevenue'
        ],
        [
          this.sequelize.fn('SUM', this.sequelize.literal(`
            CASE WHEN \`status\` = 'COMPLETED' THEN 1 ELSE 0 END
          `)),
          'successCount'
        ],
        [
          this.sequelize.fn('SUM', this.sequelize.literal(`
            CASE WHEN \`status\` = 'PENDING' THEN 1 ELSE 0 END
          `)),
          'pendingCount'
        ]
      ],
      where: whereClause,
      raw: true
    });
  }

  /**
   * Tính toán doanh thu ngày hôm qua để so sánh tăng trưởng
   */
  async getYesterdayRevenue(yesterdayStart, todayStart) {
    return await this.models.FinancialTransaction.findOne({
      attributes: [
        [
          this.sequelize.fn('SUM', this.sequelize.literal(`
            CASE 
              WHEN (\`type\` = 'INCOME' OR \`category\` IN ('MEMBER_TOPUP', 'SERVICE_SALE', 'COMBO_PURCHASE')) AND \`status\` = 'COMPLETED' 
              THEN \`amount\` ELSE 0 
            END
          `)),
          'yesterdayRevenue'
        ]
      ],
      where: {
        created_at: {
          [Op.gte]: yesterdayStart,
          [Op.lt]: todayStart
        }
      },
      raw: true
    });
  }

  /**
   * Mở Managed Transaction đảm bảo ACID
   */
  async runInTransaction(callback) {
    return await this.sequelize.transaction(callback);
  }
}

module.exports = TransactionRepository;
