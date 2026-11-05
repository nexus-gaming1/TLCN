const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Biến lưu trữ Access Token trong React Memory (Chống XSS, không lưu localStorage)
let inMemoryAccessToken = null;

// Biến quản lý Promise làm mới token tránh Race Condition khi nhiều request 401 cùng lúc
let refreshPromise = null;

export const apiClient = {
  /**
   * Lấy Access Token từ Memory
   */
  getToken() {
    return inMemoryAccessToken;
  },

  /**
   * Cập nhật Access Token vào Memory
   */
  setToken(token) {
    inMemoryAccessToken = token || null;
  },

  /**
   * Lấy thông tin user đã cache từ sessionStorage
   */
  getCurrentUser() {
    const raw = sessionStorage.getItem('nexus_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Lưu thông tin user vào sessionStorage
   */
  setCurrentUser(user) {
    if (user) {
      sessionStorage.setItem('nexus_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('nexus_user');
    }
  },

  /**
   * Xóa sạch trạng thái đăng nhập
   */
  clearAuth() {
    inMemoryAccessToken = null;
    sessionStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_token'); // Dọn dẹp cache cũ nếu có
    localStorage.removeItem('nexus_user');
  },

  /**
   * Thực hiện gọi API kèm Access Token trong Memory & Credentials (Cookie HttpOnly)
   */
  async request(endpoint, options = {}, isRetry = false) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
      // credentials: 'include' đảm bảo HttpOnly Cookie nexus_refresh_token được tự động gửi kèm
      const res = await fetch(url, {
        cache: 'no-cache',
        credentials: 'include',
        ...options,
        headers,
      });

      // Nếu gặp lỗi 401 (Access Token hết hạn hoặc không hợp lệ) và chưa từng retry
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh') || endpoint.includes('/auth/logout');
      if (res.status === 401 && !isRetry && !isAuthEndpoint) {
        // Tự động kích hoạt cơ chế Refresh Token ngầm
        try {
          await this.handleTokenRefresh();
          // Gọi lại request ban đầu với Access Token mới
          return await this.request(endpoint, options, true);
        } catch (refreshErr) {
          this.clearAuth();
          throw refreshErr;
        }
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.status === 'error') {
        if (res.status === 401 && isAuthEndpoint) {
          this.clearAuth();
        }
        throw new Error(data.message || `Lỗi yêu cầu HTTP ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * Xử lý cơ chế cấp mới Access Token qua Refresh Token HttpOnly Cookie
   */
  async handleTokenRefresh() {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.status === 'error' || !data.data?.accessToken) {
            throw new Error(data.message || 'Phiên làm việc đã hết hạn.');
          }

          const newAccessToken = data.data.accessToken;
          this.setToken(newAccessToken);
          if (data.data.user) {
            this.setCurrentUser(data.data.user);
          }
          return newAccessToken;
        } finally {
          refreshPromise = null;
        }
      })();
    }
    return refreshPromise;
  },

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  },

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  },
};

export default apiClient;
