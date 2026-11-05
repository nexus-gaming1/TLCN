const TransactionRepository = require('../repositories/transactionRepository');
const MemberRepository = require('../repositories/memberRepository');
const { TransactionType, TransactionCategory, TransactionStatusEnum } = require('../constants/enums');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errors');

/**
 * Cấu hình nghiệp vụ phân bổ doanh thu & điểm thưởng (Tuân thủ OCP)
 * Cho phép mở rộng thêm loại giao dịch hoặc thay đổi tỷ lệ mà không sửa đổi core logic
 */
const DEFAULT_TRANSACTION_CONFIG = Object.freeze({
  REVENUE_CATEGORIES: [
    TransactionCategory.MEMBER_TOPUP,
    TransactionCategory.SERVICE_SALE,
    TransactionCategory.COMBO_PURCHASE
  ],
  BONUS_POINT_RATE: 1000 // 1,000 VNĐ nạp = 1 Điểm thưởng
});

/**
 * TransactionService
 * Quản lý nghiệp vụ Sổ Cái & Giao Dịch Tài Chính
 * Tuân thủ nghiêm ngặt các nguyên tắc SOLID & Clean Architecture:
 * - SRP: Tách bạch rõ ràng giữa xử lý logic nghiệp vụ, tính toán KPI, DTO formatting và repository query.
 * - OCP: Cho phép mở rộng phân loại doanh thu / tỷ lệ tích điểm qua cấu hình DI config.
 * - DIP: Không phụ thuộc vào ORM (Sequelize) hay Model CSDL; phụ thuộc hoàn toàn vào Abstraction Repository.
 */
class TransactionService {
  /**
   * Dependency Injection qua Constructor (Tuân thủ DIP)
   */
  constructor(
    transactionRepo = new TransactionRepository(),
    memberRepo = new MemberRepository(),
    config = DEFAULT_TRANSACTION_CONFIG
  ) {
    this.transactionRepo = transactionRepo;
    this.memberRepo = memberRepo;
    this.config = config;
  }

  /**
   * Helper 1 (SRP & DIP): Ủy thác xây dựng bộ lọc CSDL cho Repository (không chứa cú pháp ORM Op)
   */
  buildSearchFilters(params = {}) {
    return this.transactionRepo.buildSearchFilters(params);
  }

  /**
   * Helper 2 (SRP): Tính toán 4 thẻ chỉ số KPI Tài Chính từ Repository
   */
  async calculateFinancialKPIs() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todayKpiRow, yesterdayKpiRow] = await Promise.all([
      this.transactionRepo.getTodayKpiMetrics(todayStart),
      this.transactionRepo.getYesterdayRevenue(yesterdayStart, todayStart)
    ]);

    const totalRevenueToday = parseFloat(todayKpiRow?.totalRevenue || 0);
    const yesterdayRevenue = parseFloat(yesterdayKpiRow?.yesterdayRevenue || 0);
    const pcTimeRevenue = parseFloat(todayKpiRow?.pcTimeRevenue || 0);
    const foodServiceRevenue = parseFloat(todayKpiRow?.foodServiceRevenue || 0);
    const successCount = parseInt(todayKpiRow?.successCount || todayKpiRow?.totalTxnCount || 0, 10);
    const pendingCount = parseInt(todayKpiRow?.pendingCount || 0, 10);
    const totalTxnCount = parseInt(todayKpiRow?.totalTxnCount || 0, 10);

    let vsYesterdayPercent = 0;
    if (yesterdayRevenue > 0) {
      vsYesterdayPercent = Number((((totalRevenueToday - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1));
    } else if (totalRevenueToday > 0) {
      vsYesterdayPercent = 100.0;
    }

    const successRate = totalTxnCount > 0 ? Number(((successCount / totalTxnCount) * 100).toFixed(1)) : 100.0;

    return {
      totalRevenueToday,
      yesterdayRevenue,
      vsYesterdayPercent,
      pcTimeRevenue: Math.round(pcTimeRevenue),
      pcTimePercent: totalRevenueToday > 0 ? Number(((pcTimeRevenue / totalRevenueToday) * 100).toFixed(1)) : 0,
      foodServiceRevenue: Math.round(foodServiceRevenue),
      foodServicePercent: totalRevenueToday > 0 ? Number(((foodServiceRevenue / totalRevenueToday) * 100).toFixed(1)) : 0,
      successRate,
      successCount,
      pendingCount,
      totalTxnCount
    };
  }

  /**
   * Helper 3 (SRP): Định dạng danh sách bản ghi Entity thành DTO sạch cho UI
   */
  formatTransactionDTO(rows) {
    return rows.map((t) => {
      const userObj = t.memberInfo && t.memberInfo.userInfo ? t.memberInfo.userInfo : null;
      const rankObj = t.memberInfo && t.memberInfo.MembershipRank ? t.memberInfo.MembershipRank : null;
      const staffObj = t.processedBy;

      return {
        id: t.transaction_id,
        txnCode: t.txn_code || `TXN-${String(t.transaction_id).padStart(5, '0')}`,
        type: t.type || TransactionType.INCOME,
        category: t.category || TransactionCategory.MEMBER_TOPUP,
        amount: parseFloat(t.amount || 0),
        paymentMethod: t.payment_method || 'CASH',
        status: t.status || TransactionStatusEnum.COMPLETED,
        memberId: t.used_by,
        memberName: userObj ? userObj.full_name : 'Khách Vãng Lai',
        username: userObj ? userObj.username : 'guest',
        phone: t.memberInfo ? t.memberInfo.phone : '—',
        rankName: rankObj ? rankObj.name : 'Đồng',
        computerName: t.computer_name || '—',
        staffName: staffObj ? staffObj.full_name : (t.staff_name || 'Thu Ngân Quầy'),
        notes: t.notes || t.description || '',
        createdAt: t.created_at
      };
    });
  }

  /**
   * Lấy danh sách giao dịch kèm thông tin Member & User + Tính toán các chỉ số KPI Tài Chính
   * (Phương thức điều phối Use Case thuần túy, không chứa mã ORM)
   */
  async getAllTransactions(params = {}) {
    const { page = 1, limit = 10, ...filterParams } = params;

    const [{ count, rows }, metrics] = await Promise.all([
      this.transactionRepo.findAndCountAllWithAssociations(filterParams, { page, limit }),
      this.calculateFinancialKPIs()
    ]);

    return {
      transactions: this.formatTransactionDTO(rows),
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      metrics
    };
  }

  /**
   * Tạo mới giao dịch Nạp Tiền Tại Quầy
   * - Bắt buộc có processed_by xác định (Tránh hardcode fallback 1)
   * - Đảm bảo tính nguyên tử ACID bằng Managed Transaction
   * - Sử dụng Repository Abstraction với Pessimistic Lock
   */
  async createTopUpTransaction(data) {
    const { member_id, amount, description, processed_by } = data;

    // 1. Kiểm tra dữ liệu đầu vào
    const topupAmount = parseFloat(amount || 0);
    if (isNaN(topupAmount) || topupAmount <= 0) {
      throw new ValidationError('Số tiền nạp không hợp lệ (phải lớn hơn 0)');
    }

    if (!member_id) {
      throw new ValidationError('Thiếu thông tin mã hội viên cần nạp');
    }

    if (!processed_by) {
      throw new ValidationError('Thiếu thông tin nhân viên thu ngân thực hiện nạp tiền (processed_by)');
    }

    // 2. Thực thi giao dịch CSDL an toàn qua Repository
    return await this.transactionRepo.runInTransaction(async (t) => {
      const member = await this.memberRepo.findMemberWithLock(member_id, t);

      if (!member) {
        throw new NotFoundError('Không tìm thấy tài khoản hội viên');
      }

      // Cộng tiền và điểm thưởng theo tỷ lệ cấu hình
      member.real_balance = parseFloat(member.real_balance || 0) + topupAmount;
      member.point = (member.point || 0) + Math.floor(topupAmount / this.config.BONUS_POINT_RATE);
      await this.memberRepo.saveMember(member, t);

      // Lưu lịch sử giao dịch vào FinancialTransaction
      const newTxn = await this.transactionRepo.create({
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        amount: topupAmount,
        payment_method: 'CASH',
        status: TransactionStatusEnum.COMPLETED,
        description: description || `Nạp tiền tại quầy cho ${member.userInfo ? member.userInfo.full_name : 'hội viên'}`,
        used_by: member.member_id,
        processed_by: processed_by,
        created_at: new Date()
      }, { transaction: t });

      return newTxn;
    });
  }

  /**
   * Rút tiền tại quầy cho hội viên đang sử dụng máy.
   */
  async createWithdrawTransaction(data) {
    const { member_id, amount, description, processed_by } = data;
    const withdrawAmount = parseFloat(amount || 0);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      throw new ValidationError('Số tiền rút không hợp lệ (phải lớn hơn 0)');
    }
    if (!member_id) {
      throw new ValidationError('Thiếu thông tin mã hội viên cần rút tiền');
    }
    if (!processed_by) {
      throw new ValidationError('Thiếu thông tin nhân viên thu ngân thực hiện rút tiền (processed_by)');
    }

    return this.transactionRepo.runInTransaction(async (t) => {
      const member = await this.memberRepo.findMemberWithLock(member_id, t);
      if (!member) {
        throw new NotFoundError('Không tìm thấy tài khoản hội viên');
      }

      const currentBalance = parseFloat(member.real_balance || 0);
      if (currentBalance < withdrawAmount) {
        throw new BusinessLogicError('Số dư tài khoản không đủ để rút tiền');
      }

      member.real_balance = currentBalance - withdrawAmount;
      await this.memberRepo.saveMember(member, t);

      return this.transactionRepo.create({
        type: TransactionType.EXPENSE,
        category: TransactionCategory.MEMBER_WITHDRAW,
        amount: withdrawAmount,
        payment_method: 'CASH',
        status: TransactionStatusEnum.COMPLETED,
        description: description || `Rút tiền tại quầy cho ${member.userInfo ? member.userInfo.full_name : 'hội viên'}`,
        used_by: member.member_id,
        processed_by,
        created_at: new Date()
      }, { transaction: t });
    });
  }

  /**
   * Bước 1: Xử lý Nạp Tiền Tự Động dùng chung cho mọi nguồn thanh toán (Internal Standard DTO)
   * Giữ TransactionService thuần khiết 100%, không phụ thuộc cấu trúc của bất kỳ bên thứ 3 nào.
   * @param {Object} payload
   * @param {number} payload.memberId - ID của hội viên cần nạp
   * @param {number} payload.amount - Số tiền nạp thực tế
   * @param {string} [payload.paymentMethod='VIETQR'] - Phương thức thanh toán chuẩn
   * @param {string} payload.referenceCode - Mã tham chiếu/Mã giao dịch ngân hàng duy nhất (Idempotency Key)
   * @param {string} [payload.description] - Mô tả giao dịch
   * @param {string} [payload.notes] - Ghi chú chi tiết
   */
  async processAutoTopUp(payload = {}) {
    const {
      memberId,
      amount,
      paymentMethod = 'VIETQR',
      referenceCode,
      description,
      notes
    } = payload;

    const parsedMemberId = parseInt(memberId, 10);
    if (!memberId || isNaN(parsedMemberId)) {
      throw new ValidationError('Mã hội viên nạp tiền không hợp lệ');
    }

    const parsedAmount = parseFloat(amount || 0);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError('Số tiền nạp tự động không hợp lệ (phải lớn hơn 0)');
    }

    if (!referenceCode || !String(referenceCode).trim()) {
      throw new ValidationError('Thiếu mã tham chiếu giao dịch (referenceCode/Idempotency Key)');
    }

    // 1. Chống nạp tiền trùng lặp Idempotency
    const existingTxn = await this.transactionRepo.findByTxnCode(referenceCode);
    if (existingTxn) {
      console.warn(`[AutoTopUp] Giao dịch ${referenceCode} đã được xử lý trước đó. Bỏ qua.`);
      return {
        message: 'Giao dịch đã được xử lý trước đó',
        transaction_id: existingTxn.transaction_id,
        amount_added: 0,
        status: 'ignored'
      };
    }

    // 2. ACID Transaction cập nhật số dư & tạo giao dịch tài chính
    return await this.transactionRepo.runInTransaction(async (t) => {
      const member = await this.memberRepo.findMemberWithLock(parsedMemberId, t);

      if (!member) {
        throw new NotFoundError(`Hội viên #${parsedMemberId} không tồn tại trong hệ thống`);
      }

      member.real_balance = parseFloat(member.real_balance || 0) + parsedAmount;
      member.point = (member.point || 0) + Math.floor(parsedAmount / this.config.BONUS_POINT_RATE);
      await this.memberRepo.saveMember(member, t);

      // Lưu bản ghi với trạng thái COMPLETED đồng bộ với hệ thống KPI
      const newTxn = await this.transactionRepo.create({
        type: TransactionType.INCOME,
        category: TransactionCategory.MEMBER_TOPUP,
        amount: parsedAmount,
        payment_method: paymentMethod,
        status: TransactionStatusEnum.COMPLETED,
        txn_code: referenceCode,
        description: description || `[Tự động nạp tiền] Nạp ${parsedAmount.toLocaleString('vi-VN')}đ cho hội viên #${parsedMemberId} (${member.userInfo ? member.userInfo.full_name : ''})`,
        notes: notes || '',
        used_by: parsedMemberId,
        processed_by: null, // Hệ thống tự động
        created_at: new Date()
      }, { transaction: t });

      return {
        transaction_id: newTxn.transaction_id,
        member_id: member.member_id,
        username: member.userInfo ? member.userInfo.username : '',
        full_name: member.userInfo ? member.userInfo.full_name : '',
        amount_added: parsedAmount,
        new_real_balance: parseFloat(member.real_balance),
        points_added: Math.floor(parsedAmount / this.config.BONUS_POINT_RATE)
      };
    });
  }



  /**
   * Xử lý hoàn tiền giao dịch (Refund)
   * - Kiểm tra số dư hội viên: Từ chối hoàn nếu số dư hiện tại < số tiền cần hoàn (Khắc phục lỗ hổng gian lận)
   * - Khấu trừ điểm thưởng đã tích lũy từ giao dịch này
   * - Sử dụng Repository Abstraction với Pessimistic Lock
   */
  async refundTransaction(transactionId, reason) {
    if (!reason || !String(reason).trim()) {
      throw new ValidationError('Lý do hoàn tiền không được để trống');
    }

    return await this.transactionRepo.runInTransaction(async (t) => {
      const txn = await this.transactionRepo.findByIdWithLock(transactionId, t);

      if (!txn) {
        return null;
      }

      if (txn.status === TransactionStatusEnum.REFUNDED) {
        throw new BusinessLogicError('Giao dịch này đã được hoàn tiền trước đó');
      }

      // Xử lý hoàn tiền cho giao dịch Nạp tiền giờ chơi
      if (txn.category === TransactionCategory.MEMBER_TOPUP && txn.used_by) {
        const member = await this.memberRepo.findMemberWithLock(txn.used_by, t);

        if (member) {
          const currentBal = parseFloat(member.real_balance || 0);
          const refundAmt = parseFloat(txn.amount || 0);

          // Bảo vệ chống gian lận: Hội viên đã tiêu hết tiền nạp thì không được hoàn tiền
          if (currentBal < refundAmt) {
            throw new BusinessLogicError(
              `Số dư tài khoản hội viên không đủ để hoàn tiền (Số dư hiện tại: ${currentBal.toLocaleString()}đ, Số tiền cần hoàn: ${refundAmt.toLocaleString()}đ)`
            );
          }

          // Trừ lại số dư và thu hồi điểm thưởng đã nhận
          member.real_balance = currentBal - refundAmt;
          const pointsEarned = Math.floor(refundAmt / this.config.BONUS_POINT_RATE);
          member.point = Math.max(0, (member.point || 0) - pointsEarned);
          await this.memberRepo.saveMember(member, t);
        }
      }

      // Cập nhật trạng thái giao dịch
      txn.status = TransactionStatusEnum.REFUNDED;
      txn.notes = txn.notes ? `${txn.notes} | Lý do hoàn: ${reason}` : `Lý do hoàn: ${reason}`;
      await this.transactionRepo.save(txn, t);

      return txn;
    });
  }
}

module.exports = new TransactionService();
module.exports.TransactionService = TransactionService;
