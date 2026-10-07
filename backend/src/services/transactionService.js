const db = require('../models');
const { TransactionType, TransactionCategory } = require('../constants/enums');
const { Op } = require('sequelize');

/**
 * TransactionService
 * Quản lý nghiệp vụ Sổ Cái & Tra Cứu Giao Dịch Tài Chính
 * Tuân thủ quy tắc SOLID & Clean Code Architecture
 */
class TransactionService {
  /**
   * Lấy danh sách giao dịch kèm thông tin Member & User + Tính toán các chỉ số KPI Tài Chính
   */
  async getAllTransactions(params = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        paymentMethod,
        status,
        dateRange
      } = params;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};

      if (category && category !== 'all') whereClause.category = category;
      if (paymentMethod && paymentMethod !== 'all') whereClause.payment_method = paymentMethod;
      if (status && status !== 'all') whereClause.status = status;

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

      const includeQuery = [
        {
          model: db.Member,
          as: 'memberInfo',
          include: [
            {
              model: db.User,
              as: 'userInfo',
              attributes: ['user_id', 'username', 'full_name']
            },
            {
              model: db.MembershipRank,
              attributes: ['rank_id', 'name']
            }
          ]
        },
        {
          model: db.User,
          as: 'processedBy',
          attributes: ['user_id', 'username', 'full_name']
        }
      ];

      // We cannot easily filter includes inside findAndCountAll without `subQuery: false` and duplicating logic.
      // But we can pull all rows matching basic where, then filter in JS if search text exists.
      // Actually, since we want full backend pagination, we must use sequelize.
      // To simplify for search:
      if (search) {
        const q = `%${search}%`;
        const searchOr = [];
        
        // Match Transaction ID if possible
        const matchTxn = String(search).match(/txn-0*(\d+)/i);
        if (matchTxn) {
          searchOr.push({ transaction_id: parseInt(matchTxn[1]) });
        } else if (!isNaN(parseInt(search))) {
          searchOr.push({ transaction_id: parseInt(search) });
        }
        
        searchOr.push({ '$memberInfo.phone$': { [Op.like]: q } });
        searchOr.push({ '$memberInfo.userInfo.full_name$': { [Op.like]: q } });
        
        whereClause[Op.or] = searchOr;
      }

      const { count, rows } = await db.FinancialTransaction.findAndCountAll({
        where: whereClause,
        include: includeQuery,
        order: [['transaction_id', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        subQuery: false // Important for $nested.includes$
      });

      // Calculate 4 Financial KPI Cards (Always based on TODAY)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTxns = await db.FinancialTransaction.findAll({
        where: {
          created_at: { [Op.gte]: todayStart },
          status: 'COMPLETED'
        }
      });

      let totalRevenueToday = 0;
      let pcTimeRevenue = 0;
      let foodServiceRevenue = 0;
      const successCount = todayTxns.length;

      todayTxns.forEach((t) => {
        const amt = parseFloat(t.amount || 0);
        const type = (t.type || '').toUpperCase();
        const cat = (t.category || '').toUpperCase();

        if (type === TransactionType.INCOME || cat === TransactionCategory.MEMBER_TOPUP || cat === TransactionCategory.SERVICE_SALE) {
          totalRevenueToday += amt;
          if (cat === TransactionCategory.MEMBER_TOPUP) {
            pcTimeRevenue += amt;
          } else if (cat === TransactionCategory.SERVICE_SALE) {
            foodServiceRevenue += amt;
          } else if (cat === TransactionCategory.COMBO_PURCHASE) {
            pcTimeRevenue += amt * 0.65;
            foodServiceRevenue += amt * 0.35;
          }
        }
      });

      const metrics = {
        totalRevenueToday,
        pcTimeRevenue: Math.round(pcTimeRevenue),
        pcTimePercent: totalRevenueToday > 0 ? Number(((pcTimeRevenue / totalRevenueToday) * 100).toFixed(1)) : 66.5,
        foodServiceRevenue: Math.round(foodServiceRevenue),
        foodServicePercent: totalRevenueToday > 0 ? Number(((foodServiceRevenue / totalRevenueToday) * 100).toFixed(1)) : 33.5,
        successRate: 100.0,
        successCount,
        pendingCount: 0,
        totalTxnCount: successCount || 1
      };

      const formattedTransactions = rows.map((t) => {
        const userObj = t.memberInfo && t.memberInfo.userInfo ? t.memberInfo.userInfo : null;
        const rankObj = t.memberInfo && t.memberInfo.MembershipRank ? t.memberInfo.MembershipRank : null;
        const staffObj = t.processedBy;

        return {
          id: t.transaction_id,
          txnCode: `TXN-${String(t.transaction_id).padStart(5, '0')}`,
          type: t.type || TransactionType.INCOME,
          category: t.category || TransactionCategory.MEMBER_TOPUP,
          amount: parseFloat(t.amount || 0),
          paymentMethod: t.payment_method || 'CASH',
          status: t.status || 'COMPLETED',
          memberId: t.used_by,
          memberName: userObj ? userObj.full_name : 'Khách Vãng Lai',
          username: userObj ? userObj.username : 'guest',
          phone: t.memberInfo ? t.memberInfo.phone : '—',
          rankName: rankObj ? rankObj.name : 'Đồng',
          computerName: '—',
          staffName: staffObj ? staffObj.full_name : 'Thu Ngân Quầy',
          notes: t.description || '',
          createdAt: t.created_at
        };
      });

      return {
        transactions: formattedTransactions,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        metrics
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách giao dịch tài chính:', error);
      throw error;
    }
  }

  /**
   * Tạo mới giao dịch Nạp Tiền Tại Quầy
   */
  async createTopUpTransaction(data) {
    try {
      const { member_id, amount, description, processed_by } = data;

      // Find target member
      const member = await db.Member.findByPk(member_id, {
        include: [{ model: db.User, as: 'userInfo' }]
      });

      if (!member) {
        throw new Error('Không tìm thấy tài khoản hội viên');
      }

      const topupAmount = parseFloat(amount || 0);
      if (isNaN(topupAmount) || topupAmount <= 0) {
        throw new Error('Số tiền nạp không hợp lệ');
      }

      // Add balance via member model method topUp()
      await member.topUp(topupAmount);
      // Award bonus point (1000 đ = 1 point)
      member.point = (member.point || 0) + Math.floor(topupAmount / 1000);
      await member.save();

      // Create Financial Transaction record
      const newTxn = await db.FinancialTransaction.create({
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        amount: topupAmount,
        description: description || `Nạp tiền tại quầy cho ${member.userInfo ? member.userInfo.full_name : 'hội viên'}`,
        used_by: member.member_id,
        processed_by: processed_by || 1,
        created_at: new Date()
      });

      return newTxn;
    } catch (error) {
      console.error('Lỗi khi tạo giao dịch nạp tiền:', error);
      throw error;
    }
  }
}

module.exports = new TransactionService();
