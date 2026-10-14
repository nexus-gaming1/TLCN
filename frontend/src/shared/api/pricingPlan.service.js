import { apiClient } from './client';

/**
 * PricingPlanService (Frontend API Client)
 * Quản lý Bảng giá máy & Khung giờ vàng khuyến mãi kết nối trực tiếp với backend /api/pricing-plans.
 */
class PricingPlanService {
  /**
   * Lấy tất cả bảng giá máy, danh sách phân khu (zones) và metrics từ MySQL
   */
  async getPricingPlans() {
    try {
      const response = await apiClient.get('/pricing-plans');
      if (response && response.status === 'success') {
        const plansList = Array.isArray(response.data)
          ? response.data.map((p) => this.mapPricingPlan(p))
          : [];
        return {
          plans: plansList,
          zones: response.zones || [],
          metrics: response.metrics || null
        };
      }
      return { plans: [], zones: [], metrics: null };
    } catch (error) {
      console.error('Lỗi khi tải bảng giá máy từ backend API /api/pricing-plans:', error);
      return { plans: [], zones: [], metrics: null };
    }
  }

  /**
   * Lấy chi tiết bảng giá theo ID
   */
  async getPricingPlanById(id) {
    try {
      const response = await apiClient.get(`/pricing-plans/${id}`);
      if (response && response.status === 'success' && response.data) {
        return this.mapPricingPlan(response.data);
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết bảng giá:', error);
      throw error;
    }
  }

  /**
   * Tạo bảng giá / giờ vàng mới
   */
  async createPricingPlan(data) {
    try {
      const response = await apiClient.post('/pricing-plans', data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo bảng giá mới:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin bảng giá
   */
  async updatePricingPlan(id, data) {
    try {
      const response = await apiClient.put(`/pricing-plans/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật bảng giá:', error);
      throw error;
    }
  }

  /**
   * Bật / Tắt trạng thái kích hoạt bảng giá
   */
  async togglePricingPlanStatus(id, isActive) {
    try {
      const response = await apiClient.patch(`/pricing-plans/${id}/toggle`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái bảng giá:', error);
      throw error;
    }
  }

  /**
   * Xóa bảng giá
   */
  async deletePricingPlan(id) {
    try {
      const response = await apiClient.delete(`/pricing-plans/${id}`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi xóa bảng giá:', error);
      throw error;
    }
  }

  /**
   * Ánh xạ dữ liệu raw từ database sang định dạng frontend
   */
  mapPricingPlan(p) {
    const zones = Array.isArray(p.ComputerZones) ? p.ComputerZones : [];
    return {
      id: p.pricing_plan_id,
      name: p.name || 'Bảng giá máy',
      pricePerHour: Number(p.price_per_hour || 0),
      planType: p.plan_type || 'LOCAL',
      priority: Number(p.priority || 0),
      startTime: p.start_time || null,
      endTime: p.end_time || null,
      applyDate: p.apply_date || null,
      isActive: Boolean(p.is_active),
      zones: zones.map((z) => ({
        id: z.zone_id,
        zone_id: z.zone_id,
        name: z.zone_name,
        zone_name: z.zone_name,
        tierLevel: z.tier_level,
        tier_level: z.tier_level
      })),
      zoneIds: zones.map((z) => Number(z.zone_id))
    };
  }
}

export default new PricingPlanService();
