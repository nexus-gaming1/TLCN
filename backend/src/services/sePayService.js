const { ValidationError } = require('../utils/errors');
const transactionService = require('./transactionService');

/**
 * SePayService (Adapter / Gateway Pattern)
 * Đóng vai trò "Phiên dịch viên" (Anti-Corruption Layer):
 * 1. Tiếp nhận payload webhook từ cổng thanh toán SePay bên thứ 3.
 * 2. Xác thực và bóc tách cú pháp riêng của SePay (cú pháp Regex NEXUS <id>, transferAmount vs amount).
 * 3. Chuyển đổi (Transform) sang DTO chuẩn hóa nội bộ của hệ thống NEXUS Cloud Cyber OS.
 * 4. Bàn giao cho TransactionService.processAutoTopUp xử lý hạch toán tài chính.
 */
class SePayService {
  /**
   * Dependency Injection cho phép hoán đổi hoặc mock TransactionService
   */
  constructor(txService = transactionService) {
    this.transactionService = txService;
  }

  /**
   * Bóc tách member_id từ nội dung chuyển khoản ngân hàng bằng Regex
   * Cú pháp chấp nhận: NEXUS123, NEXUS-123, NEXUS_123, NEXUS 123...
   */
  parseMemberIdFromContent(content) {
    if (!content || typeof content !== 'string') return null;
    const match = content.match(/NEXUS[-_\s]*(\d+)/i);
    if (match && match[1]) {
      const memberId = parseInt(match[1], 10);
      return isNaN(memberId) ? null : memberId;
    }
    return null;
  }

  /**
   * Chuyển đổi và chuẩn hóa dữ liệu SePay sang Internal AutoTopUp DTO
   */
  transformToInternalDto(webhookData = {}) {
    const content = webhookData.content || webhookData.description || webhookData.code || '';
    const rawAmount = webhookData.transferAmount !== undefined ? webhookData.transferAmount : webhookData.amount;
    const amount = parseFloat(rawAmount || 0);
    const referenceCode = webhookData.referenceCode || webhookData.id || webhookData.referenceNumber || `SEPAY-${Date.now()}`;

    if (isNaN(amount) || amount <= 0) {
      throw new ValidationError('Số tiền chuyển khoản không hợp lệ (phải > 0)');
    }

    const memberId = this.parseMemberIdFromContent(content);
    if (!memberId) {
      throw new ValidationError(`Không tìm thấy cú pháp mã hội viên NEXUS hợp lệ trong nội dung: "${content}"`);
    }

    return {
      memberId,
      amount,
      paymentMethod: 'VIETQR',
      referenceCode,
      description: `[SePay Auto Topup] Tự động nạp ${amount.toLocaleString('vi-VN')}đ cho hội viên #${memberId}`,
      notes: content
    };
  }

  /**
   * Xử lý webhook từ SePay (Adapter Endpoint)
   */
  async processWebhook(webhookData) {
    const internalDto = this.transformToInternalDto(webhookData);
    return await this.transactionService.processAutoTopUp(internalDto);
  }
}

module.exports = new SePayService();
module.exports.SePayService = SePayService;
