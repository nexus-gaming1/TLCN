const db = require('../models');
const { TransactionType, TransactionCategory } = require('../constants/enums');

/**
 * TransactionService
 * Quản lý nghiệp vụ Sổ Cái & Tra Cứu Giao Dịch Tài Chính
 * Tuân thủ quy tắc SOLID & Clean Code Architecture
 */
class TransactionService {
  /**
   * Lấy danh sách giao dịch kèm thông tin Member & User + Tính toán các chỉ số KPI Tài Chính
   */
  async getAllTransactions() {
    try {
      const transactions = await db.FinancialTransaction.findAll({
        include: [
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
        ],
        order: [['transaction_id', 'DESC']]
      });

      // Calculate 4 Financial KPI Cards
      let totalRevenueToday = 0;
      let pcTimeRevenue = 0;
      let foodServiceRevenue = 0;
      const successCount = transactions.length;

      transactions.forEach((t) => {
        const amt = parseFloat(t.amount || 0);
        const type = (t.type || '').toUpperCase();
        const cat = (t.category || '').toUpperCase();

        if (type === TransactionType.INCOME) {
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

      const totalTxnCount = transactions.length || 1;
      const successRate = 100.0;

      const metrics = {
        totalRevenueToday,
        pcTimeRevenue: Math.round(pcTimeRevenue),
        pcTimePercent: totalRevenueToday > 0 ? Number(((pcTimeRevenue / totalRevenueToday) * 100).toFixed(1)) : 66.5,
        foodServiceRevenue: Math.round(foodServiceRevenue),
        foodServicePercent: totalRevenueToday > 0 ? Number(((foodServiceRevenue / totalRevenueToday) * 100).toFixed(1)) : 33.5,
        successRate,
        successCount,
        pendingCount: 0,
        totalTxnCount
      };

      const formattedTransactions = transactions.map((t) => {
        const userObj = t.memberInfo ? t.memberInfo.userInfo : null;
        const rankObj = t.memberInfo ? t.memberInfo.MembershipRank : null;
        const staffObj = t.processedBy;

        return {
          id: t.transaction_id,
          txnCode: `TXN-${String(t.transaction_id).padStart(5, '0')}`,
          type: t.type || TransactionType.INCOME,
          category: t.category || TransactionCategory.MEMBER_TOPUP,
          amount: parseFloat(t.amount || 0),
          paymentMethod: 'CASH',
          status: 'SUCCESS',
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

  // Hàm bóc tách member_id từ nội dung chuyển khoản bằng Regex
  parseMemberIdFromContent(content) {
    if (!content || typeof content !== 'string') return null;
    const match = content.match(/NEXUS[-_\s]*(\d+)/i);
    if (match && match[1]) {
      const memberId = parseInt(match[1], 10);
      return isNaN(memberId) ? null : memberId;
    }
    return null;
  }

   //Xử lý webhook SePay nạp tiền tự động
   //Đảm bảo tính nguyên tử ACID bằng Sequelize Transaction
  async processSePayWebhook(webhookData) {
    // 1. Bóc tách dữ liệu từ payload của SePay
    const content = webhookData.content || webhookData.description || webhookData.code || '';
    const rawAmount = webhookData.transferAmount !== undefined ? webhookData.transferAmount : webhookData.amount;
    const amount = parseFloat(rawAmount || 0);
    const referenceCode = webhookData.referenceCode || webhookData.id || webhookData.referenceNumber || `SEPAY-${Date.now()}`;

    if (isNaN(amount) || amount <= 0) {
      const err = new Error('Số tiền chuyển khoản không hợp lệ (phải > 0)');
      err.statusCode = 400;
      throw err;
    }

    // 2. Phân tích bóc tách member_id
    const memberId = this.parseMemberIdFromContent(content);
    if (!memberId) {
      const err = new Error(`Không tìm thấy cú pháp mã hội viên NEXUS hợp lệ trong nội dung: "${content}"`);
      err.statusCode = 400;
      throw err;
    }

    // Kiểm tra chống trùng lặp giao dịch
    // Ngăn chặn lỗi SePay bắn webhook 2 lần cho cùng 1 giao dịch gây cộng tiền 2 lần
    const existingTxn = await db.FinancialTransaction.findOne({
      where: { txn_code: referenceCode }
    });

    if (existingTxn) {
      console.warn(`[SePay] Giao dịch ${referenceCode} đã được xử lý trước đó. Bỏ qua.`);
      return {
        message: 'Giao dịch đã được xử lý trước đó',
        transaction_id: existingTxn.transaction_id,
        amount_added: 0,
        status: 'ignored'
      };
    }

    // 3. Thực hiện sequelize transaction để đảm bảo an toàn CSDL
    return await db.sequelize.transaction(async (t) => {
      // Tìm thông tin hội viên
      const member = await db.Member.findByPk(memberId, {
        include: [{ model: db.User, as: 'userInfo' }],
        transaction: t
      });

      if (!member) {
        const err = new Error(`Hội viên #${memberId} không tồn tại trong hệ thống`);
        err.statusCode = 404;
        throw err;
      }

      // Cộng tiền real_balance và điểm thưởng (1,000 đ = 1 point)
      member.real_balance = parseFloat(member.real_balance || 0) + amount;
      member.point = (member.point || 0) + Math.floor(amount / 1000);
      await member.save({ transaction: t });

      // Lưu log vào bảng FinancialTransaction
      const newTxn = await db.FinancialTransaction.create({
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        amount: amount,
        description: `[SePay Auto Topup] Tự động nạp ${amount.toLocaleString('vi-VN')}đ cho hội viên #${memberId} (${member.userInfo ? member.userInfo.full_name : ''})`,
        used_by: memberId,
        processed_by: null, // Hệ thống tự động xử lý
        payment_method: 'BANK_TRANSFER',
        status: 'SUCCESS',
        txn_code: referenceCode,
        notes: content,
        created_at: new Date()
      }, { transaction: t });

      return {
        transaction_id: newTxn.transaction_id,
        member_id: member.member_id,
        username: member.userInfo ? member.userInfo.username : '',
        full_name: member.userInfo ? member.userInfo.full_name : '',
        amount_added: amount,
        new_real_balance: parseFloat(member.real_balance),
        points_added: Math.floor(amount / 1000)
      };
    });
  }
}

module.exports = new TransactionService();
