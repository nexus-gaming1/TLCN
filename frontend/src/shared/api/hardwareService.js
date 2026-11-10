import { apiClient } from './client';

class HardwareService {
  /**
   * Fetch hardware specs & telemetry from backend /api/computers/specs
   * Graceful fallback to mock data if backend server is starting
   */
  async getHardwareSpecs() {
    try {
      const response = await apiClient.get('/computers/specs');
      if (response && response.status === 'success' && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('⚠️ Lỗi khi tải /api/computers/specs từ CSDL API:', error);
      throw error;
    }
  }

  /**
   * Create new hardware station spec via POST /api/computers/specs
   */
  async createHardwareSpec(data) {
    try {
      const response = await apiClient.post('/computers/specs', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo cấu hình phần cứng mới:', error);
      throw error;
    }
  }

  /**
   * Update hardware station spec via PUT /api/computers/specs/:id
   */
  async updateHardwareSpec(id, data) {
    try {
      const response = await apiClient.put(`/computers/specs/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật cấu hình phần cứng:', error);
      throw error;
    }
  }

  /**
   * Toggle active status of hardware profile via PATCH /api/computers/specs/:id/toggle
   */
  async toggleHardwareSpec(id, isActive) {
    try {
      const response = await apiClient.patch(`/computers/specs/${id}/toggle`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi chuyển đổi trạng thái cấu hình phần cứng:', error);
      throw error;
    }
  }

  /**
   * Delete hardware station spec via DELETE /api/computers/specs/:id
   */
  async deleteHardwareSpec(id) {
    try {
      const response = await apiClient.delete(`/computers/specs/${id}`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi xóa cấu hình phần cứng:', error);
      throw error;
    }
  }
}

export default new HardwareService();
