import { apiClient } from './client';

class MemberService {
  async getMembers() {
    try {
      const response = await apiClient.get('/members');
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response)
        ? response
        : [];

      return rawList.map((m) => {
        const rankName = m.rank_name || 'Đồng';

        return {
          id: m.id,
          uid: m.uid || `#MB-${String(m.id).padStart(3, '0')}`,
          name: m.full_name || m.name || 'Hội Viên',
          username: m.username || 'user',
          phone: m.phone || 'Chưa cập nhật',
          email: m.email || 'Chưa cập nhật',
          rankId: m.rank_id,
          rankName,
          rankLevel: m.rank_level || 1,
          discountPercent: Number(m.discount_percent || 0),
          tier: rankName,
          status: m.status || 'ACTIVE',
          realBalance: Number(m.real_balance || 0),
          bonusBalance: Number(m.bonus_balance || 0),
          totalBalance: Number(m.real_balance || 0) + Number(m.bonus_balance || 0),
          pts: Number(m.points || 0),
          station: m.station_name ? `Máy ${m.station_name}` : 'Chưa vào máy',
          stationCode: m.station_name || null,
          stationStatus: m.station_status || null,
          created_at: m.created_at || m.createdAt || null,
          lastLoginTime: m.last_login
            ? new Date(m.last_login).toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : (m.station_name ? 'Đang hoạt động' : 'Chưa đăng nhập')
        };
      });
    } catch (error) {
      console.error('Không thể tải từ backend API /api/members:', error.message);
      return [];
    }
  }

  /**
   * Lấy danh sách tất cả các hạng thành viên từ cơ sở dữ liệu (membership_rank)
   */
  async getRanks() {
    try {
      const response = await apiClient.get('/members/ranks');
      return Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];
    } catch (error) {
      console.error('Lỗi khi tải danh sách hạng thành viên:', error.message);
      return [];
    }
  }

  /**
   * Chỉnh sửa thông tin hồ sơ cơ bản (Họ tên, SĐT, Email)
   */
  async updateMemberInfo(memberId, data) {
    try {
      const response = await apiClient.put(`/members/${memberId}/info`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin hội viên:', error);
      throw error;
    }
  }

  /**
   * Đổi trạng thái tài khoản (ACTIVE, LOCKED, SUSPENDED)
   */
  async updateAccountStatus(memberId, status) {
    try {
      const response = await apiClient.put(`/members/${memberId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi đổi trạng thái tài khoản hội viên:', error);
      throw error;
    }
  }

  /**
   * Tạo tài khoản hội viên mới và lưu vào cơ sở dữ liệu
   */
  async createMember(data) {
    try {
      const response = await apiClient.post('/members', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo tài khoản hội viên:', error);
      throw error;
    }
  }
}

export default new MemberService();
