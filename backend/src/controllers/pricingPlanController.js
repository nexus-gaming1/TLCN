const pricingPlanService = require('../services/pricingPlanService');

/**
 * PricingPlanController
 * Điều hướng request HTTP và phản hồi kết quả nghiệp vụ Bảng giá máy & Khung giờ vàng
 */
class PricingPlanController {
  async getPricingPlans(req, res, next) {
    try {
      const data = await pricingPlanService.getAllPricingPlans(req.query);
      return res.json({
        status: 'success',
        data: data.plans,
        zones: data.zones,
        metrics: data.metrics,
        message: 'Lấy danh sách bảng giá máy thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getPricingPlanById(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await pricingPlanService.getPricingPlanById(id);
      if (!plan) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy bảng giá'
        });
      }
      return res.json({
        status: 'success',
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }

  async createPricingPlan(req, res, next) {
    try {
      const newPlan = await pricingPlanService.createPricingPlan(req.body);
      return res.status(201).json({
        status: 'success',
        data: newPlan,
        message: 'Tạo bảng giá / khung giờ vàng mới thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePricingPlan(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await pricingPlanService.updatePricingPlan(id, req.body);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy bảng giá để cập nhật'
        });
      }
      return res.json({
        status: 'success',
        data: updated,
        message: 'Cập nhật bảng giá thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async togglePricingPlanStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { is_active } = req.body || {};
      const updated = await pricingPlanService.togglePricingPlanStatus(id, is_active);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy bảng giá'
        });
      }
      return res.json({
        status: 'success',
        data: updated,
        message: `Đã ${updated.is_active ? 'bật' : 'tắt'} kích hoạt bảng giá thành công`
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePricingPlan(req, res, next) {
    try {
      const { id } = req.params;
      const result = await pricingPlanService.deletePricingPlan(id);
      return res.json({
        status: 'success',
        data: result.data,
        message: result.message || 'Xóa bảng giá thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async restorePricingPlan(req, res, next) {
    try {
      const { id } = req.params;
      const result = await pricingPlanService.restorePricingPlan(id);
      return res.json({
        status: 'success',
        data: result.data,
        message: result.message || 'Khôi phục bảng giá thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PricingPlanController();
