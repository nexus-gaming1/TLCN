import { apiClient } from './client';

/**
 * ComboService (Frontend API Client)
 * Giao tiếp trực tiếp với Backend API /api/catalog/combos và /api/combos
 */
class ComboService {
  /**
   * Lấy danh sách các gói Combo
   * @param {boolean} all - true nếu lấy cả combo ngừng kinh doanh (dành cho Admin/Staff)
   */
  async getCombos(all = false) {
    try {
      const endpoint = all ? '/catalog/combos?all=true' : '/catalog/combos';
      const res = await apiClient.get(endpoint);
      return res?.data || [];
    } catch (error) {
      console.error('Lỗi khi tải danh sách gói Combo:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết gói Combo theo ID
   */
  async getComboById(id) {
    try {
      const res = await apiClient.get(`/catalog/combos/${id}`);
      return res?.data || null;
    } catch (error) {
      console.error(`Lỗi khi lấy chi tiết gói Combo #${id}:`, error);
      throw error;
    }
  }

  /**
   * Tạo gói Combo mới (Admin / Staff)
   */
  async createCombo(data) {
    try {
      const res = await apiClient.post('/catalog/combos', data);
      return res?.data;
    } catch (error) {
      console.error('Lỗi khi tạo gói Combo mới:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin gói Combo (Admin / Staff)
   */
  async updateCombo(id, data) {
    try {
      const res = await apiClient.put(`/catalog/combos/${id}`, data);
      return res?.data;
    } catch (error) {
      console.error(`Lỗi khi cập nhật gói Combo #${id}:`, error);
      throw error;
    }
  }

  /**
   * Bật / tắt kinh doanh gói Combo (Admin / Staff)
   */
  async toggleComboStatus(id, isActive) {
    try {
      const res = await apiClient.patch(`/catalog/combos/${id}/status`, { is_active: isActive });
      return res?.data;
    } catch (error) {
      console.error(`Lỗi khi thay đổi trạng thái gói Combo #${id}:`, error);
      throw error;
    }
  }

  /**
   * Xóa gói Combo (Admin / Staff)
   */
  async deleteCombo(id) {
    try {
      const res = await apiClient.delete(`/catalog/combos/${id}`);
      return res;
    } catch (error) {
      console.error(`Lỗi khi xóa gói Combo #${id}:`, error);
      throw error;
    }
  }

  /**
   * Cập nhật danh sách dịch vụ đi kèm gói Combo (Admin / Staff)
   * @param {number} id - combo_id
   * @param {Array<{service_item_id: number, quantity: number}>} items
   */
  async setComboItems(id, items) {
    try {
      const res = await apiClient.put(`/catalog/combos/${id}/items`, { items });
      return res?.data;
    } catch (error) {
      console.error(`Lỗi khi cập nhật dịch vụ đi kèm cho Combo #${id}:`, error);
      throw error;
    }
  }

  /**
   * Mua gói Combo Time (hoặc gia hạn nếu đang có phiên hoạt động)
   * @param {Object} payload - { combo_id, payment_method: 'WALLET'|'CASH'|'VIETQR', member_id? }
   */
  async purchaseCombo(payload) {
    try {
      const res = await apiClient.post('/catalog/combos/purchase', payload);
      return res;
    } catch (error) {
      console.error('Lỗi khi mua gói Combo:', error);
      throw error;
    }
  }

  /**
   * Kích hoạt Combo Time vào máy trạm cụ thể (Bắt đầu tính giờ thực)
   * @param {Object} payload - { combo_time_id, computer_id, member_id? }
   */
  async activateSession(payload) {
    try {
      const res = await apiClient.post('/catalog/combos/activate', payload);
      return res;
    } catch (error) {
      console.error('Lỗi khi kích hoạt phiên chơi Combo:', error);
      throw error;
    }
  }

  /**
   * Chuyển trạm máy trong phân khu Zone hợp lệ (targetZone.level <= comboZone.level)
   * @param {Object} payload - { combo_time_id, target_computer_id, member_id? }
   */
  async switchStation(payload) {
    try {
      const res = await apiClient.post('/catalog/combos/switch-station', payload);
      return res;
    } catch (error) {
      console.error('Lỗi khi chuyển trạm máy:', error);
      throw error;
    }
  }

  /**
   * Kết thúc sớm phiên chơi Combo Time (Không hoàn tiền)
   * @param {Object} payload - { combo_time_id, member_id? }
   */
  async endSessionEarly(payload) {
    try {
      const res = await apiClient.post('/catalog/combos/end-session', payload);
      return res;
    } catch (error) {
      console.error('Lỗi khi kết thúc phiên sớm:', error);
      throw error;
    }
  }

  /**
   * Lấy ComboTime đang hoạt động hoặc đang chờ kích hoạt của Member
   */
  async getActiveCombo(memberId) {
    try {
      const query = memberId ? `?member_id=${encodeURIComponent(memberId)}` : '';
      const res = await apiClient.get(`/catalog/combos/active-time${query}`);
      return res?.data || null;
    } catch (error) {
      console.error('Lỗi khi lấy phiên Combo đang hoạt động:', error);
      throw error;
    }
  }

  /**
   * Lấy toàn bộ lịch sử mua và sử dụng Combo của Member
   */
  async getComboHistory(memberId) {
    try {
      const query = memberId ? `?member_id=${encodeURIComponent(memberId)}` : '';
      const res = await apiClient.get(`/catalog/combos/history${query}`);
      return res?.data || [];
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử Combo:', error);
      throw error;
    }
  }
}

const comboService = new ComboService();
export default comboService;
