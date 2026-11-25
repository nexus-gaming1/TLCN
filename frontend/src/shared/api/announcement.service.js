import { apiClient } from './client';

class AnnouncementService {
  async getActiveAnnouncements() {
    try {
      const response = await apiClient.get('/announcements/active');
      return response?.data || [];
    } catch (error) {
      console.error('[AnnouncementService] Lỗi khi lấy banner active:', error);
      return [];
    }
  }

  async getAllAnnouncements() {
    const response = await apiClient.get('/announcements');
    return response?.data || [];
  }

  async createAnnouncement(payload) {
    const response = await apiClient.post('/announcements', payload);
    return response?.data;
  }

  async toggleActive(id) {
    const response = await apiClient.patch(`/announcements/${id}/toggle`);
    return response?.data;
  }

  async deleteAnnouncement(id) {
    const response = await apiClient.delete(`/announcements/${id}`);
    return response?.data;
  }
}

export default new AnnouncementService();