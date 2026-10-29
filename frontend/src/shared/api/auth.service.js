import apiClient from './client';

export const authService = {
  /**
   * Đăng nhập hệ thống & lưu Access Token vào Memory
   */
  async login(identity, password) {
    const res = await apiClient.post('/auth/login', { identity, password });
    if (res.data && (res.data.accessToken || res.data.token)) {
      const accessToken = res.data.accessToken || res.data.token;
      apiClient.setToken(accessToken);
      apiClient.setCurrentUser(res.data.user);
    }
    return res.data;
  },

  /**
   * Làm mới Access Token thông qua Refresh Token HttpOnly Cookie
   */
  async refreshToken() {
    try {
      await apiClient.handleTokenRefresh();
      return apiClient.getCurrentUser();
    } catch (err) {
      apiClient.clearAuth();
      throw err;
    }
  },

  /**
   * Lấy thông tin user hiện tại
   */
  async getMe() {
    const res = await apiClient.get('/auth/me');
    if (res.data && res.data.user) {
      apiClient.setCurrentUser(res.data.user);
    }
    return res.data?.user;
  },

  /**
   * Xác thực lại mật khẩu (Step-up Auth) khi session bị khóa sau 30 phút không hoạt động
   */
  async verifyStepUp(password) {
    const res = await apiClient.post('/auth/verify-stepup', { password });
    return res.data;
  },

  /**
   * Đăng xuất hệ thống, dọn dẹp cookie và giải phóng Memory
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (e) {
      console.warn('Logout notification:', e.message);
    } finally {
      apiClient.clearAuth();
    }
  },

  getToken() {
    return apiClient.getToken();
  },

  getCurrentUser() {
    return apiClient.getCurrentUser();
  },
};

export default authService;
