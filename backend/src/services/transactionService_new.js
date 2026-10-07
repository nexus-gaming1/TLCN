const db = require('../models');
const { TransactionType, TransactionCategory } = require('../constants/enums');
const { Op } = require('sequelize');

class TransactionService {
  async getAllTransactions(params = {}) {
    try {
      const { page = 1, limit = 10, search, category, paymentMethod, status, dateRange } = params;
      const offset = (page - 1) * limit;

      const whereClause = {};

      if (category && category !== 'all') {
        whereClause.category = category;
      }
      if (paymentMethod && paymentMethod !== 'all') {
        whereClause.payment_method = paymentMethod;
      }
      if (status && status !== 'all') {
        whereClause.status = status;
      }

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

      if (search) {
        const q = `%${search}%`;
        const searchOr = [
            { description: { [Op.like]: q } }
        ];

        // If it's a number, maybe it's an ID
        const matchTxn = search.match(/txn-0*(\d+)/i);
        if (matchTxn) {
            searchOr.push({ transaction_id: parseInt(matchTxn[1]) });
        } else if (!isNaN(parseInt(search))) {
            searchOr.push({ transaction_id: parseInt(search) });
        }

        // We can't easily search nested includes using Op.or at root without subqueries or stringifying.
        // Easiest is to add to searchOr using Sequelize syntax $model.field$
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
        subQuery: false // required when filtering on included tables
      });

      // Format data
      const formattedTransactions = rows.map((t) => {
        const userObj = t.memberInfo && t.memberInfo.userInfo ? t.memberInfo.userInfo : null;
        const rankObj = t.memberInfo && t.memberInfo.MembershipRank ? t.memberInfo.MembershipRank : null;
        const staffObj = t.processedBy ? t.processedBy : null;

        return {
          id: t.transaction_id,
          txnCode: `TXN-${String(t.transaction_id).padStart(5, '0')}`,
          type: t.type || TransactionType.INCOME,
          category: t.category || TransactionCategory.MEMBER_TOPUP,
          amount: parseFloat(t.amount || 0),
          paymentMethod: t.payment_method || 'CASH',
          status: t.status || 'COMPLETED',
          memberId: t.used_by,
          memberName: userObj ? userObj.full_name : 'Khách hàng',
          username: userObj ? userObj.username : 'customer',
          phone: t.memberInfo ? t.memberInfo.phone : '—',
          rankName: rankObj ? rankObj.name : 'Đồng',
          computerName: '—',
          staffName: staffObj ? staffObj.full_name : 'Thu Ngân Quầy',
          notes: t.description || '',
          createdAt: t.created_at
        };
      });

      // Calculate KPI (today only, independent of pagination)
      // For accurate KPIs, we need a separate query, but to save time, we query aggregations.
      // Actually, since we only need today's KPIs, let's query it.
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
      
      todayTxns.forEach((t) => {
        const amt = parseFloat(t.amount || 0);
        const type = (t.type || '').toUpperCase();
        const cat = (t.category || '').toUpperCase();

        if (type === TransactionType.INCOME || cat === 'MEMBER_TOPUP' || cat === 'SERVICE_SALE') {
          totalRevenueToday += amt;
          if (cat === TransactionCategory.MEMBER_TOPUP) pcTimeRevenue += amt;
          else if (cat === TransactionCategory.SERVICE_SALE) foodServiceRevenue += amt;
          else if (cat === TransactionCategory.COMBO_PURCHASE) {
            pcTimeRevenue += amt * 0.65;
            foodServiceRevenue += amt * 0.35;
          }
        }
      });

      return {
        transactions: formattedTransactions,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit),
        metrics: {
          totalRevenueToday,
          pcTimeRevenue,
          foodServiceRevenue,
          successCount: todayTxns.length
        }
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách giao dịch:', error);
      throw error;
    }
  }
}
