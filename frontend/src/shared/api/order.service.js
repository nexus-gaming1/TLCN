import { apiClient } from './client';

class OrderService {
  async getStaffPendingOrders(params = {}) {
    try {
      const response = await apiClient.get('/orders/staff/pending', { params });
      return response?.data || [];
    } catch (error) {
      console.error('[OrderService] Lỗi khi lấy danh sách đơn chờ:', error);
      throw error;
    }
  }

  async confirmCashPayment(orderId) {
    try {
      const response = await apiClient.post(`/orders/staff/${orderId}/confirm-cash`);
      return response?.data;
    } catch (error) {
      console.error(`[OrderService] Lỗi xác nhận thu tiền đơn #${orderId}:`, error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const response = await apiClient.patch(`/orders/staff/${orderId}/status`, { status });
      return response?.data;
    } catch (error) {
      console.error(`[OrderService] Lỗi cập nhật trạng thái đơn #${orderId}:`, error);
      throw error;
    }
  }

  async staffCancelOrder(orderId, reason) {
    try {
      const response = await apiClient.post(`/orders/staff/${orderId}/cancel`, { reason });
      return response?.data;
    } catch (error) {
      console.error(`[OrderService] Lỗi hủy đơn #${orderId}:`, error);
      throw error;
    }
  }

  async refundCompletedOrder(orderId, { amount, reason }) {
    try {
      const response = await apiClient.post(`/orders/staff/${orderId}/refund`, { amount, reason });
      return response?.data;
    } catch (error) {
      console.error(`[OrderService] Lỗi hoàn tiền sự cố đơn #${orderId}:`, error);
      throw error;
    }
  }
}

export default new OrderService();
