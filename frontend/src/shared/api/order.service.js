import { apiClient } from './client';

//OrderService : Đóng gói toàn bộ các cuộc gọi API liên quan đến đơn hàng F&B
//Tuân thủ Single Responsibility Principle (SRP)
class OrderService {
  // Lấy danh sách lịch sử đơn hàng phân trang và bộ lọc (Dành cho Web Admin)
  /* @param {Object} filters - Các tiêu chí lọc (status, paymentStatus, startDate, endDate, search)
   * @param {Object} pagination - Phân trang (page, limit)
   * @param {AbortSignal} signal - Truyền signal để hủy request nếu cần ( chống memory leak )
   */
  async getOrderHistory(filters = {}, pagination = {}, signal = null) {
    const { status, paymentStatus, startDate, endDate, search } = filters;
    const { page = 1, limit = 20 } = pagination;

    // Xây dựng query parameters
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (paymentStatus && paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (search && search.trim()) params.append('search', search.trim());
    params.append('page', page);
    params.append('limit', limit);

    try {
      // Gọi qua apiClient.request để truyền được AbortSignal vào fetch native
      const response = await apiClient.request(`/orders/admin/history?${params.toString()}`, {
        method: 'GET',
        signal
      });

      if (response && response.status === 'success') {
        return {
          orders: response.data || [],
          pagination: response.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 }
        };
      }
      return { orders: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
    } catch (error) {
      if (error.name === 'AbortError') throw error; // Cho phép ném AbortError để component nhận biết
      console.error('Lỗi khi tải lịch sử đơn hàng F&B:', error);
      throw error;
    }
  }

  // Xem chi tiết một đơn hàng kèm danh sách món và giao dịch 
  // @param {number|string} orderId - ID đơn hàng
  //@param {AbortSignal} signal - Tín hiệu hủy request
  async getOrderById(orderId, signal = null) {
    try {
      const response = await apiClient.request(`/orders/${orderId}`, {
        method: 'GET',
        signal
      });

      if (response && response.status === 'success') {
        return response.data;
      }
      return null;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error(`Lỗi khi tải chi tiết đơn hàng #${orderId}:`, error);
      throw error;
    }
  }
}

export default new OrderService();