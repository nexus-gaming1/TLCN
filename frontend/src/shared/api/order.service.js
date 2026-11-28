import { apiClient } from './client';

class OrderService {
  // ==========================================
  // 1. Phân hệ Khách hàng (Customer Web Order)
  // ==========================================

  /**
   * Lấy danh sách thực đơn món ăn/nước uống có sẵn
   */
  async getMenu() {
    try {
      const response = await apiClient.get('/orders/menu');
      return response?.data || [];
    } catch (error) {
      console.error('[OrderService] Lỗi khi lấy thực đơn:', error);
      throw error;
    }
  }

  /**
   * Alias đồng nhất với tên hàm Backend controller: getAvailableMenu()
   */
  async getAvailableMenu() {
    return this.getMenu();
  }

  /**
   * Kiểm tra phiên chơi phòng máy của khách hàng (In-shop vs Remote)
   */
  async checkSessionStatus() {
    try {
      const response = await apiClient.get('/orders/session-status');
      return response?.data || { can_order: false };
    } catch (error) {
      // Fallback nếu server dùng route /orders/session-check
      try {
        const fallback = await apiClient.get('/orders/session-check');
        return fallback?.data || { can_order: false };
      } catch {
        console.error('[OrderService] Lỗi khi kiểm tra phiên chơi:', error);
        throw error;
      }
    }
  }

  /**
   * Khách hàng gửi yêu cầu đặt món F&B
   * @param {{ paymentMethod: 'WALLET'|'CASH', items: Array<{ service_item_id: number, quantity: number }> }} payload
   */
  async createOrder(payload) {
    try {
      const response = await apiClient.post('/orders', payload);
      return response?.data;
    } catch (error) {
      console.error('[OrderService] Lỗi khi gửi đơn đặt món:', error);
      throw error;
    }
  }

  /**
   * Lấy lịch sử đơn hàng của chính khách hàng đăng nhập
   */
  async getMyOrders(params = {}) {
    try {
      const response = await apiClient.get('/orders/my-orders', { params });
      return response?.data || [];
    } catch (error) {
      console.error('[OrderService] Lỗi khi lấy danh sách đơn của tôi:', error);
      throw error;
    }
  }

  /**
   * Khách hàng tự hủy đơn khi đơn còn ở trạng thái PENDING
   */
  async customerCancelOrder(orderId) {
    try {
      const response = await apiClient.post(`/orders/${orderId}/cancel`);
      return response?.data;
    } catch (error) {
      console.error(`[OrderService] Lỗi khi hủy đơn #${orderId}:`, error);
      throw error;
    }
  }

  // ==========================================
  // 2. Phân hệ Nhân viên (Staff Dashboard)
  // ==========================================

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
