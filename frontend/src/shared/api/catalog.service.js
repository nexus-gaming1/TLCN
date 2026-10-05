import { apiClient } from './client';

/**
 * CatalogService (Frontend API Client)
 * Đảm nhận giao tiếp trực tiếp với Backend API /api/catalog
 */
class CatalogService {
  // ==================== CATEGORY APIS ====================

  /**
   * Lấy danh sách danh mục kèm các món dịch vụ bên trong (Gom nhóm)
   */
  async getCategories() {
    try {
      const response = await apiClient.get('/catalog/categories');
      if (response && response.status === 'success') {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Lỗi khi tải danh sách danh mục dịch vụ:', error);
      throw error;
    }
  }

  /**
   * Tạo mới một danh mục dịch vụ
   */
  async createCategory(data) {
    try {
      const response = await apiClient.post('/catalog/categories', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo danh mục dịch vụ:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin danh mục dịch vụ
   */
  async updateCategory(id, data) {
    try {
      const response = await apiClient.put(`/catalog/categories/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật danh mục dịch vụ:', error);
      throw error;
    }
  }

  /**
   * Xóa danh mục dịch vụ theo ID
   */
  async deleteCategory(id) {
    try {
      const response = await apiClient.delete(`/catalog/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi xóa danh mục dịch vụ:', error);
      throw error;
    }
  }

  // ==================== SERVICE ITEM APIS ====================

  /**
   * Lấy danh sách món dịch vụ (hỗ trợ query filter)
   */
  async getItems(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/catalog/items?${query}` : '/catalog/items';
      const response = await apiClient.get(endpoint);
      if (response && response.status === 'success') {
        return response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Lỗi khi tải danh sách món dịch vụ:', error);
      throw error;
    }
  }

  /**
   * Tạo món dịch vụ mới
   */
  async createItem(data) {
    try {
      const response = await apiClient.post('/catalog/items', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo món dịch vụ mới:', error);
      throw error;
    }
  }

  /**
   * Cập nhật món dịch vụ
   */
  async updateItem(id, data) {
    try {
      const response = await apiClient.put(`/catalog/items/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật món dịch vụ:', error);
      throw error;
    }
  }

  /**
   * Điều chỉnh số lượng tồn kho (Patch /items/:id/stock)
   */
  async adjustItemStock(id, quantityDelta) {
    try {
      const response = await apiClient.patch(`/catalog/items/${id}/stock`, { quantity: quantityDelta });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi điều chỉnh tồn kho:', error);
      throw error;
    }
  }

  /**
   * Xóa món dịch vụ
   */
  async deleteItem(id) {
    try {
      const response = await apiClient.delete(`/catalog/items/${id}`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi xóa món dịch vụ:', error);
      throw error;
    }
  }
}

export default new CatalogService();