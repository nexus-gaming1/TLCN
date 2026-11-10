import { apiClient } from './client';

/**
 * TransactionService (Frontend API Client)
 * Connects frontend features STRICTLY to /api/transactions backend endpoint.
 */
class TransactionService {
  /**
   * Lấy tất cả giao dịch tài chính & metrics từ CSDL MySQL
   */
  async getTransactions(params = {}) {
    try {
      const response = await apiClient.get('/transactions', { params });
      if (response && response.status === 'success') {
        const transactionsList = Array.isArray(response.data) ? response.data : [];
        return {
          transactions: transactionsList,
          total: response.total || 0,
          page: response.page || 1,
          totalPages: response.totalPages || 1,
          metrics: response.metrics || null
        };
      }
      return { transactions: [], metrics: null, total: 0, page: 1, totalPages: 1 };
    } catch (error) {
      console.error('Lỗi khi tải giao dịch từ backend API /api/transactions:', error);
      throw error;
    }
  }

  /**
   * Nạp tiền tại quầy cho hội viên
   */
  async createTopUp(data) {
    try {
      const response = await apiClient.post('/transactions/topup', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo giao dịch nạp tiền tại quầy:', error);
      throw error;
    }
  }

  /**
   * Rút tiền tại quầy cho hội viên
   */
  async createWithdraw(data) {
    try {
      const response = await apiClient.post('/transactions/withdraw', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo giao dịch rút tiền tại quầy:', error);
      throw error;
    }
  }

  /**
   * Hoàn tiền giao dịch
   */
  async refundTransaction(id, reason) {
    try {
      const response = await apiClient.post(`/transactions/${id}/refund`, { reason });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi hoàn tiền giao dịch:', error);
      throw error;
    }
  }
}

export default new TransactionService();
