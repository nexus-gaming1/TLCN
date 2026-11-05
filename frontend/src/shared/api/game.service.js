import { apiClient } from './client';

class GameService {
  /**
   * Lấy danh sách game và số liệu KPI
   */
  async getGames(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.category_id && params.category_id !== 'all') query.append('category_id', params.category_id);
      if (params.is_remote_supported !== undefined && params.is_remote_supported !== 'all') {
        query.append('is_remote_supported', params.is_remote_supported);
      }
      if (params.is_available !== undefined && params.is_available !== 'all') {
        query.append('is_available', params.is_available);
      }

      const queryString = query.toString() ? `?${query.toString()}` : '';
      const response = await apiClient.get(`/games${queryString}`);
      
      return {
        games: response?.data || [],
        metrics: response?.metrics || null
      };
    } catch (error) {
      console.error('Lỗi khi tải danh sách game:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết game theo ID
   */
  async getGameById(id) {
    try {
      const response = await apiClient.get(`/games/${id}`);
      return response?.data || null;
    } catch (error) {
      console.error(`Lỗi khi tải chi tiết game #${id}:`, error);
      throw error;
    }
  }

  /**
   * Tạo game mới
   */
  async createGame(data) {
    try {
      const response = await apiClient.post('/games', data);
      return response?.data || null;
    } catch (error) {
      console.error('Lỗi khi tạo game mới:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin game
   */
  async updateGame(id, data) {
    try {
      const response = await apiClient.put(`/games/${id}`, data);
      return response?.data || null;
    } catch (error) {
      console.error(`Lỗi khi cập nhật game #${id}:`, error);
      throw error;
    }
  }

  /**
   * Bật/Tắt trạng thái hoạt động của game
   */
  async toggleAvailability(id) {
    try {
      const response = await apiClient.patch(`/games/${id}/toggle`, {});
      return response?.data || null;
    } catch (error) {
      console.error(`Lỗi khi đổi trạng thái game #${id}:`, error);
      throw error;
    }
  }

  /**
   * Xóa mềm game khỏi kho (Soft Delete)
   */
  async deleteGame(id) {
    try {
      const response = await apiClient.delete(`/games/${id}`);
      return response;
    } catch (error) {
      console.error(`Lỗi khi xóa game #${id}:`, error);
      throw error;
    }
  }

  /**
   * Khôi phục game đã bị xóa mềm (Restore)
   */
  async restoreGame(id) {
    try {
      const response = await apiClient.patch(`/games/${id}/restore`, {});
      return response?.data || null;
    } catch (error) {
      console.error(`Lỗi khi khôi phục game #${id}:`, error);
      throw error;
    }
  }

  /**
   * Lấy danh mục thể loại game
   */
  async getCategories() {
    try {
      const response = await apiClient.get('/games/categories');
      return response?.data || [];
    } catch (error) {
      console.error('Lỗi khi tải danh mục game:', error);
      throw error;
    }
  }

  /**
   * Tạo thể loại game mới
   */
  async createCategory(name) {
    try {
      const response = await apiClient.post('/games/categories', { name });
      return response?.data || null;
    } catch (error) {
      console.error('Lỗi khi tạo thể loại game mới:', error);
      throw error;
    }
  }

  /**
   * Lấy số liệu metrics
   */
  async getMetrics() {
    try {
      const response = await apiClient.get('/games/metrics');
      return response?.data || null;
    } catch (error) {
      console.error('Lỗi khi tải metrics game:', error);
      throw error;
    }
  }
}

export default new GameService();
