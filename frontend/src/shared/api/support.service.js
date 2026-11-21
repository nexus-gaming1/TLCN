import { apiClient } from './client';

class SupportService {
  async createRequest(payload) {
    const response = await apiClient.post('/support', payload);
    return response?.data;
  }

  async getMyRequests() {
    const response = await apiClient.get('/support/my-requests');
    return response?.data || [];
  }

  async getStaffRequests(params = {}) {
    const response = await apiClient.get('/support', { params });
    return response?.data || { count: 0, rows: [] };
  }

  async processRequest(id, payload) {
    const response = await apiClient.patch(`/support/${id}/process`, payload);
    return response?.data;
  }

  async getStats() {
    const response = await apiClient.get('/support/stats');
    return response?.data || { averageRating: '0.0', totalReviews: 0, pendingRequests: 0 };
  }
}

export default new SupportService();