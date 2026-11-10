const TransactionRepository = require('../repositories/transactionRepository');
const MemberRepository = require('../repositories/memberRepository');
const { TransactionType, TransactionCategory, TransactionStatusEnum, PaymentMethodEnum } = require('../constants/enums');
const { ValidationError, NotFoundError, BusinessLogicError } = require('../utils/errors');

const MAX_TRANSACTION_AMOUNT = 100_000_000;
const MAX_TEXT_LENGTH = 500;
const UNSAFE_CONTENT_REGEX = /<script|javascript:|data:\s*text\/html|\0/i;

const PAYMENT_METHOD_ALIAS = Object.freeze({
  CASH: PaymentMethodEnum.CASH,
  VIETQR: PaymentMethodEnum.VIETQR,
  WALLET: PaymentMethodEnum.WALLET,
  POS: PaymentMethodEnum.VIETQR
});

const CATEGORY_ALIAS = Object.freeze({
  MEMBER_TOPUP: TransactionCategory.MEMBER_TOPUP,
  SERVICE_SALE: TransactionCategory.SERVICE_SALE,
  COMBO_PURCHASE: TransactionCategory.COMBO_PURCHASE,
  MEMBER_WITHDRAW: TransactionCategory.MEMBER_WITHDRAW,
  REFUND: TransactionCategory.REFUND,
  OTHER: TransactionCategory.OTHER,
  'NẠP GIỜ CHƠI': TransactionCategory.MEMBER_TOPUP,
  'DỊCH VỤ F&B': TransactionCategory.SERVICE_SALE,
  'COMBO ĐÊM': TransactionCategory.COMBO_PURCHASE,
  'KHÁC': TransactionCategory.OTHER
});

/**
 * Cấu hình nghiệp vụ phân bổ doanh thu & điểm thưởng (Tuân thủ OCP)
 */
const DEFAULT_TRANSACTION_CONFIG = Object.freeze({
  REVENUE_CATEGORIES: [
    TransactionCategory.MEMBER_TOPUP,
    TransactionCategory.SERVICE_SALE,
    TransactionCategory.COMBO_PURCHASE
  ],
  BONUS_POINT_RATE: 1000 // 1,000 VNĐ nạp = 1 Điểm thưởng
});

function validateSafeText(val, fieldLabel) {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val !== 'string') {
    throw new ValidationError(`${fieldLabel} phải là chuỗi ký tự hợp lệ`);
  }
  const trimmed = val.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new ValidationError(`${fieldLabel} không được vượt quá ${MAX_TEXT_LENGTH} ký tự`);
  }
  if (UNSAFE_CONTENT_REGEX.test(trimmed)) {
    throw new ValidationError(`${fieldLabel} chứa nội dung không an toàn`);
  }
  return trimmed;
}

function normalizePaymentMethod(raw) {
  if (!raw) return PaymentMethodEnum.CASH;
  const key = String(raw).trim().toUpperCase();
  if (!PAYMENT_METHOD_ALIAS[key]) {
    throw new ValidationError(`Phương thức thanh toán '${raw}' không hợp lệ`);
  }
  return PAYMENT_METHOD_ALIAS[key];
}

function normalizeCategory(raw, defaultCategory) {
  if (!raw) return defaultCategory;
  const key = String(raw).trim().toUpperCase();
  return CATEGORY_ALIAS[key] || defaultCategory;
}

/**
 * TransactionService
 * Quản lý nghiệp vụ Sổ Cái & Giao Dịch Tài Chính (SOLID & Clean Architecture)
 */
class TransactionService {
  constructor(
    transactionRepo = new TransactionRepository(),
    memberRepo = new MemberRepository(),
    config = DEFAULT_TRANSACTION_CONFIG
  ) {
    this.transactionRepo = transactionRepo;
    this.memberRepo = memberRepo;
    this.config = config;
  }

  buildSearchFilters(params = {}) {
    return this.transactionRepo.buildSearchFilters(params);
  }

  async calculateFinancialKPIs(filterParams = {}) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const kpiFilterInput = {
      category: filterParams.category,
      paymentMethod: filterParams.paymentMethod,
      status: filterParams.status,
      dateRange: filterParams.dateRange || 'all'
    };
    const kpiWhere = typeof this.transactionRepo.buildSearchFilters === 'function'
      ? this.transactionRepo.buildSearchFilters(kpiFilterInput)
      : todayStart;

    const [kpiRow, yesterdayKpiRow] = await Promise.all([
      this.transactionRepo.getTodayKpiMetrics(kpiWhere),
      this.transactionRepo.getYesterdayRevenue(yesterdayStart, todayStart)
    ]);

    const totalRevenueToday = parseFloat(kpiRow?.totalRevenue || 0);
    const yesterdayRevenue = parseFloat(yesterdayKpiRow?.yesterdayRevenue || 0);
    const pcTimeRevenue = parseFloat(kpiRow?.pcTimeRevenue || 0);
    const foodServiceRevenue = parseFloat(kpiRow?.foodServiceRevenue || 0);
    const rawSuccessCount = kpiRow?.successCount !== undefined && kpiRow?.successCount !== null
      ? kpiRow.successCount
      : (kpiRow?.totalTxnCount ?? 0);
    const successCount = parseInt(rawSuccessCount, 10) || 0;
    const pendingCount = parseInt(kpiRow?.pendingCount || 0, 10) || 0;
    const totalTxnCount = parseInt(kpiRow?.totalTxnCount || 0, 10) || 0;

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
      totalTxnCount,
      dateRange: kpiFilterInput.dateRange
    };
  }

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
        paymentMethod: t.payment_method || PaymentMethodEnum.CASH,
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

  async getAllTransactions(params = {}) {
    try {
      const safePage = Math.max(1, parseInt(params.page, 10) || 1);
      const safeLimit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 10));
      const filterParams = { ...params };
      delete filterParams.page;
      delete filterParams.limit;

      const [{ count, rows }, metrics] = await Promise.all([
        this.transactionRepo.findAndCountAllWithAssociations(filterParams, { page: safePage, limit: safeLimit }),
        this.calculateFinancialKPIs(filterParams)
      ]);

      return {
        transactions: this.formatTransactionDTO(rows),
        total: count,
        page: safePage,
        totalPages: Math.ceil(count / safeLimit),
        metrics
      };
    } catch (error) {
      console.error('[TransactionService] Lỗi khi tải sổ cái giao dịch:', error.message);
      throw error;
    }
  }

  /**
   * Shared helper cho giao dịch thu/chi tại quầy (Top-up & Withdraw) - DRY & ACID
   */
  async _executeCounterTransaction(data, isTopUp) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ValidationError('Dữ liệu giao dịch không hợp lệ');
    }

    const { member_id, customer_identifier, amount, description, notes, category, payment_method, processed_by } = data;
    const actionNoun = isTopUp ? 'nạp' : 'rút';
    const parsedAmount = Number(amount);

    if (amount === undefined || amount === null || amount === '' || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError(`Số tiền ${actionNoun} không hợp lệ (phải lớn hơn 0)`);
    }
    if (parsedAmount > MAX_TRANSACTION_AMOUNT) {
      throw new ValidationError(`Số tiền ${actionNoun} vượt quá hạn mức tối đa (${MAX_TRANSACTION_AMOUNT.toLocaleString('vi-VN')}đ)`);
    }

    const identifier = member_id || (customer_identifier ? validateSafeText(String(customer_identifier), 'Mã khách hàng') : '');
    if (!identifier) {
      throw new ValidationError(isTopUp ? 'Thiếu thông tin mã hội viên cần nạp' : 'Thiếu thông tin mã hội viên cần rút tiền');
    }

    if (!processed_by) {
      throw new ValidationError(
        isTopUp
          ? 'Thiếu thông tin nhân viên thu ngân thực hiện nạp tiền (processed_by)'
          : 'Thiếu thông tin nhân viên thu ngân thực hiện rút tiền (processed_by)'
      );
    }

    const safeDescription = validateSafeText(description, 'Mô tả giao dịch');
    const safeNotes = validateSafeText(notes, 'Ghi chú giao dịch');
    const resolvedPaymentMethod = normalizePaymentMethod(payment_method);
    const defaultCat = isTopUp ? TransactionCategory.MEMBER_TOPUP : TransactionCategory.MEMBER_WITHDRAW;
    const resolvedCategory = normalizeCategory(category, defaultCat);

    try {
      return await this.transactionRepo.runInTransaction(async (t) => {
        let member = null;
        if (member_id) {
          member = await this.memberRepo.findMemberWithLock(member_id, t);
        } else if (typeof this.memberRepo.findMemberByIdentifierWithLock === 'function') {
          member = await this.memberRepo.findMemberByIdentifierWithLock(identifier, t);
        } else {
          member = await this.memberRepo.findMemberWithLock(identifier, t);
        }

        if (!member) {
          throw new NotFoundError('Không tìm thấy tài khoản hội viên');
        }

        const currentBalance = parseFloat(member.real_balance || 0);
        if (isTopUp) {
          member.real_balance = currentBalance + parsedAmount;
          member.point = (member.point || 0) + Math.floor(parsedAmount / this.config.BONUS_POINT_RATE);
        } else {
          if (currentBalance < parsedAmount) {
            throw new BusinessLogicError('Số dư tài khoản không đủ để rút tiền');
          }
          member.real_balance = currentBalance - parsedAmount;
        }

        await this.memberRepo.saveMember(member, t);

        const defaultDesc = `${isTopUp ? 'Nạp tiền' : 'Rút tiền'} tại quầy cho ${member.userInfo ? member.userInfo.full_name : 'hội viên'}`;
        const newTxn = await this.transactionRepo.create({
          type: isTopUp ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: resolvedCategory,
          amount: parsedAmount,
          payment_method: resolvedPaymentMethod,
          status: TransactionStatusEnum.COMPLETED,
          description: safeDescription || defaultDesc,
          notes: safeNotes || '',
          used_by: member.member_id,
          processed_by,
          created_at: new Date()
        }, { transaction: t });

        console.info(
          `[Transaction] ${isTopUp ? 'TOPUP' : 'WITHDRAW'} #${newTxn.transaction_id} | member=${member.member_id} | amount=${parsedAmount} | method=${resolvedPaymentMethod} | staff=${processed_by}`
        );
        return newTxn;
      });
    } catch (error) {
      console.error(`[Transaction] ${isTopUp ? 'TOPUP' : 'WITHDRAW'} failed:`, error.message);
      throw error;
    }
  }

  async createTopUpTransaction(data) {
    return await this._executeCounterTransaction(data, true);
  }

  async createWithdrawTransaction(data) {
    return await this._executeCounterTransaction(data, false);
  }

  async processAutoTopUp(payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError('Dữ liệu nạp tự động không hợp lệ');
    }

    const {
      memberId,
      amount,
      paymentMethod = PaymentMethodEnum.VIETQR,
      referenceCode,
      description,
      notes
    } = payload;

    const parsedMemberId = parseInt(memberId, 10);
    if (!memberId || isNaN(parsedMemberId) || parsedMemberId <= 0) {
      throw new ValidationError('Mã hội viên nạp tiền không hợp lệ');
    }

    const parsedAmount = Number(amount);
    if (amount === undefined || amount === null || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError('Số tiền nạp tự động không hợp lệ (phải lớn hơn 0)');
    }
    if (parsedAmount > MAX_TRANSACTION_AMOUNT) {
      throw new ValidationError('Số tiền nạp tự động vượt quá hạn mức tối đa cho phép');
    }

    if (!referenceCode || !String(referenceCode).trim()) {
      throw new ValidationError('Thiếu mã tham chiếu giao dịch (referenceCode/Idempotency Key)');
    }

    const trimmedRef = validateSafeText(String(referenceCode), 'Mã tham chiếu giao dịch');
    const safeDesc = validateSafeText(description, 'Mô tả giao dịch');
    const safeNotes = validateSafeText(notes, 'Ghi chú giao dịch');
    const resolvedMethod = normalizePaymentMethod(paymentMethod);

    try {
      const existingTxn = await this.transactionRepo.findByTxnCode(trimmedRef);
      if (existingTxn) {
        console.warn(`[AutoTopUp] Giao dịch ${trimmedRef} đã được xử lý trước đó. Bỏ qua.`);
        return {
          message: 'Giao dịch đã được xử lý trước đó',
          transaction_id: existingTxn.transaction_id,
          amount_added: 0,
          status: 'ignored'
        };
      }

      return await this.transactionRepo.runInTransaction(async (t) => {
        const member = await this.memberRepo.findMemberWithLock(parsedMemberId, t);

        if (!member) {
          throw new NotFoundError(`Hội viên #${parsedMemberId} không tồn tại trong hệ thống`);
        }

        const pointsAdded = Math.floor(parsedAmount / this.config.BONUS_POINT_RATE);
        member.real_balance = parseFloat(member.real_balance || 0) + parsedAmount;
        member.point = (member.point || 0) + pointsAdded;
        await this.memberRepo.saveMember(member, t);

        const newTxn = await this.transactionRepo.create({
          type: TransactionType.INCOME,
          category: TransactionCategory.MEMBER_TOPUP,
          amount: parsedAmount,
          payment_method: resolvedMethod,
          status: TransactionStatusEnum.COMPLETED,
          txn_code: trimmedRef,
          description: safeDesc || `[Tự động nạp tiền] Nạp ${parsedAmount.toLocaleString('vi-VN')}đ cho hội viên #${parsedMemberId} (${member.userInfo ? member.userInfo.full_name : ''})`,
          notes: safeNotes,
          used_by: parsedMemberId,
          processed_by: null,
          created_at: new Date()
        }, { transaction: t });

        console.info(`[AutoTopUp] Success #${newTxn.transaction_id} | ref=${trimmedRef} | member=${parsedMemberId} | amount=${parsedAmount}`);
        return {
          transaction_id: newTxn.transaction_id,
          member_id: member.member_id,
          username: member.userInfo ? member.userInfo.username : '',
          full_name: member.userInfo ? member.userInfo.full_name : '',
          amount_added: parsedAmount,
          new_real_balance: parseFloat(member.real_balance),
          points_added: pointsAdded
        };
      });
    } catch (error) {
      console.error(`[AutoTopUp] Failed for ref=${trimmedRef}:`, error.message);
      throw error;
    }
  }

  async refundTransaction(transactionId, reason) {
    if (transactionId === undefined || transactionId === null || String(transactionId).trim() === '' || isNaN(Number(transactionId)) || Number(transactionId) <= 0) {
      throw new ValidationError('Mã giao dịch hoàn tiền không hợp lệ');
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      throw new ValidationError('Lý do hoàn tiền không được để trống');
    }
    const safeReason = validateSafeText(reason, 'Lý do hoàn tiền');

    try {
      return await this.transactionRepo.runInTransaction(async (t) => {
        const txn = await this.transactionRepo.findByIdWithLock(transactionId, t);

        if (!txn) {
          return null;
        }

        if (txn.status === TransactionStatusEnum.REFUNDED) {
          throw new BusinessLogicError('Giao dịch này đã được hoàn tiền trước đó');
        }

        if (txn.category === TransactionCategory.MEMBER_TOPUP && txn.used_by) {
          const member = await this.memberRepo.findMemberWithLock(txn.used_by, t);

          if (member) {
            const currentBal = parseFloat(member.real_balance || 0);
            const refundAmt = parseFloat(txn.amount || 0);

            if (currentBal < refundAmt) {
              throw new BusinessLogicError(
                `Số dư tài khoản hội viên không đủ để hoàn tiền (Số dư hiện tại: ${currentBal.toLocaleString()}đ, Số tiền cần hoàn: ${refundAmt.toLocaleString()}đ)`
              );
            }

            member.real_balance = currentBal - refundAmt;
            const pointsEarned = Math.floor(refundAmt / this.config.BONUS_POINT_RATE);
            member.point = Math.max(0, (member.point || 0) - pointsEarned);
            await this.memberRepo.saveMember(member, t);
          }
        }

        txn.status = TransactionStatusEnum.REFUNDED;
        txn.notes = txn.notes ? `${txn.notes} | Lý do hoàn: ${safeReason}` : `Lý do hoàn: ${safeReason}`;
        await this.transactionRepo.save(txn, t);

        console.info(`[Transaction] REFUND #${txn.transaction_id} | amount=${txn.amount} | reason=${safeReason}`);
        return txn;
      });
    } catch (error) {
      console.error(`[Transaction] REFUND failed for #${transactionId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new TransactionService();
module.exports.TransactionService = TransactionService;
