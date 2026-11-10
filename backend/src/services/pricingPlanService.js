const db = require('../models');

/**
 * Chuẩn hóa chuỗi thời gian về định dạng HH:mm:ss chuẩn cho MySQL TIME
 */
function sanitizeTime(t) {
  if (!t) return null;
  const s = String(t).trim();
  if (!s || s === 'null') return null;
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':');
    return `${h.padStart(2, '0')}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 8);
  }
  return s;
}

/**
 * Chuẩn hóa và xác thực dữ liệu tên bảng giá
 */
function validatePlanName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new Error('Tên bảng giá không được để trống');
  }
  if (trimmed.length > 100) {
    throw new Error('Tên bảng giá không được vượt quá 100 ký tự');
  }
  return trimmed;
}

/**
 * Chuẩn hóa và xác thực đơn giá mỗi giờ
 */
function validatePricePerHour(price, isCreation = true) {
  if (price === undefined || price === null || price === '') {
    throw new Error('Giá cước mỗi giờ là bắt buộc');
  }
  const parsed = Number(price);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error(
      isCreation
        ? 'Giá cước mỗi giờ phải là một số không âm hợp lệ'
        : 'Giá cước mỗi giờ cập nhật phải là số không âm hợp lệ'
    );
  }
  return parsed;
}

/**
 * Xác thực tính đồng bộ của khung giờ
 */
function validateTimeRange(startTime, endTime) {
  const sanitizedStart = sanitizeTime(startTime);
  const sanitizedEnd = sanitizeTime(endTime);
  if ((sanitizedStart && !sanitizedEnd) || (!sanitizedStart && sanitizedEnd)) {
    throw new Error('Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ');
  }
  return { start: sanitizedStart, end: sanitizedEnd };
}

/**
 * Đồng bộ liên kết khu vực máy (ComputerZone) với PricingPlan (Khử trùng lặp ID)
 */
async function syncZoneAssociations(pricingPlanId, zoneIds, transaction) {
  if (!Array.isArray(zoneIds)) return;

  await db.ZonePricingPlan.destroy({
    where: { pricing_plan_id: pricingPlanId },
    transaction
  });

  const uniqueZoneIds = [...new Set(zoneIds.map(Number))].filter((zid) => !isNaN(zid) && zid > 0);
  if (uniqueZoneIds.length > 0) {
    const zoneAssociations = uniqueZoneIds.map((zoneId) => ({
      zone_id: zoneId,
      pricing_plan_id: pricingPlanId
    }));
    await db.ZonePricingPlan.bulkCreate(zoneAssociations, { transaction });
  }
}

class PricingPlanService {
  /**
   * Lấy danh sách tất cả bảng giá + thống kê KPI metrics
   */
  async getAllPricingPlans(filters = {}) {
    try {
      const where = {};
      if (filters.include_deleted !== true && filters.include_deleted !== 'true') {
        if (filters.is_deleted === true || filters.is_deleted === 'true') {
          where.is_deleted = true;
        } else {
          where.is_deleted = false;
        }
      }

      const plans = await db.PricingPlan.findAll({
        where,
        include: [
          {
            model: db.ComputerZone,
            through: { attributes: [] },
            attributes: ['zone_id', 'zone_name', 'tier_level']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['pricing_plan_id', 'ASC']
        ]
      });

      // Lấy danh sách các zone để frontend tiện chọn khi tạo/sửa
      const zones = await db.ComputerZone.findAll({
        attributes: ['zone_id', 'zone_name', 'tier_level'],
        order: [['zone_id', 'ASC']]
      });

      // Tính toán các chỉ số thống kê
      const totalCount = plans.length;
      const activePlans = plans.filter((p) => p.is_active);
      const activeCount = activePlans.length;
      
      // Chỉ tính các bảng giá giờ vàng đang hoạt động
      const happyHourCount = activePlans.filter((p) => Boolean(p.start_time && p.end_time)).length;
      
      // Mức giá trung bình tính trên các bảng giá đang áp dụng
      const totalActiveRate = activePlans.reduce((sum, p) => sum + Number(p.price_per_hour || 0), 0);
      const avgRate = activeCount > 0 ? Math.round(totalActiveRate / activeCount) : 0;

      const metrics = {
        totalPlans: totalCount,
        activePlans: activeCount,
        happyHourPlans: happyHourCount,
        avgRate: avgRate
      };

      return {
        plans,
        zones,
        metrics
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách bảng giá:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết 1 bảng giá theo ID
   */
  async getPricingPlanById(id) {
    try {
      return await db.PricingPlan.findByPk(id, {
        include: [
          {
            model: db.ComputerZone,
            through: { attributes: [] },
            attributes: ['zone_id', 'zone_name', 'tier_level']
          }
        ]
      });
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết bảng giá:', error);
      throw error;
    }
  }

  /**
   * Tạo bảng giá / giờ vàng mới
   */
  async createPricingPlan(planData) {
    const transaction = await db.sequelize.transaction();
    try {
      const {
        name,
        price_per_hour,
        plan_type = 'LOCAL',
        priority = 0,
        start_time = null,
        end_time = null,
        apply_date = null,
        is_active = true,
        zone_ids = []
      } = planData;

      const trimmedName = validatePlanName(name);
      const parsedPrice = validatePricePerHour(price_per_hour, true);
      const { start: sanitizedStartTime, end: sanitizedEndTime } = validateTimeRange(start_time, end_time);

      const newPlan = await db.PricingPlan.create(
        {
          name: trimmedName,
          price_per_hour: parsedPrice,
          plan_type,
          priority: Number(priority || 0),
          start_time: sanitizedStartTime,
          end_time: sanitizedEndTime,
          apply_date: apply_date || null,
          is_active: Boolean(is_active)
        },
        { transaction }
      );

      // Gán liên kết với ComputerZone nếu có (đã khử trùng lặp ID)
      if (Array.isArray(zone_ids) && zone_ids.length > 0) {
        await syncZoneAssociations(newPlan.pricing_plan_id, zone_ids, transaction);
      }

      await transaction.commit();

      return await this.getPricingPlanById(newPlan.pricing_plan_id);
    } catch (error) {
      await transaction.rollback();
      console.error('Lỗi khi tạo bảng giá mới:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin bảng giá
   */
  async updatePricingPlan(id, updateData) {
    const transaction = await db.sequelize.transaction();
    try {
      const plan = await db.PricingPlan.findByPk(id, { transaction });
      if (!plan) {
        throw new Error(`Không tìm thấy bảng giá với ID: ${id}`);
      }

      const {
        name,
        price_per_hour,
        plan_type,
        priority,
        start_time,
        end_time,
        apply_date,
        is_active,
        zone_ids
      } = updateData;

      const validatedName = name !== undefined ? validatePlanName(name) : plan.name;
      const validatedPrice = price_per_hour !== undefined ? validatePricePerHour(price_per_hour, false) : plan.price_per_hour;

      const checkStart = start_time !== undefined ? start_time : plan.start_time;
      const checkEnd = end_time !== undefined ? end_time : plan.end_time;
      const { start: finalStartTime, end: finalEndTime } = validateTimeRange(checkStart, checkEnd);

      await plan.update(
        {
          name: validatedName,
          price_per_hour: validatedPrice,
          plan_type: plan_type !== undefined ? plan_type : plan.plan_type,
          priority: priority !== undefined ? Number(priority) : plan.priority,
          start_time: finalStartTime,
          end_time: finalEndTime,
          apply_date: apply_date !== undefined ? (apply_date || null) : plan.apply_date,
          is_active: is_active !== undefined ? Boolean(is_active) : plan.is_active
        },
        { transaction }
      );

      // Cập nhật lại zone nếu danh sách zone_ids được truyền lên
      if (Array.isArray(zone_ids)) {
        await syncZoneAssociations(id, zone_ids, transaction);
      }

      await transaction.commit();

      return await this.getPricingPlanById(id);
    } catch (error) {
      await transaction.rollback();
      console.error('Lỗi khi cập nhật bảng giá:', error);
      throw error;
    }
  }

  /**
   * Bật / Tắt trạng thái kích hoạt bảng giá
   */
  async togglePricingPlanStatus(id, isActive) {
    try {
      const plan = await db.PricingPlan.findByPk(id);
      if (!plan) {
        throw new Error(`Không tìm thấy bảng giá với ID: ${id}`);
      }

      plan.is_active = isActive !== undefined ? Boolean(isActive) : !plan.is_active;
      await plan.save();

      return plan;
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái bảng giá:', error);
      throw error;
    }
  }

  /**
   * Xóa mềm bảng giá (Soft Delete)
   * Đánh dấu is_deleted = true, ghi nhận deleted_at, is_active = false
   * Bảo toàn dữ liệu liên kết và lịch sử phiên chơi
   */
  async deletePricingPlan(id) {
    try {
      const plan = await db.PricingPlan.findByPk(id);
      if (!plan) {
        throw new Error(`Không tìm thấy bảng giá với ID: ${id}`);
      }

      await plan.softDelete();
      return { success: true, message: 'Đã chuyển bảng giá vào thùng rác thành công', data: plan };
    } catch (error) {
      console.error('Lỗi khi xóa bảng giá:', error);
      throw error;
    }
  }

  /**
   * Khôi phục bảng giá đã xóa mềm (Restore)
   */
  async restorePricingPlan(id) {
    try {
      const plan = await db.PricingPlan.findByPk(id);
      if (!plan) {
        throw new Error(`Không tìm thấy bảng giá với ID: ${id}`);
      }

      await plan.restore();
      return { success: true, message: 'Khôi phục bảng giá thành công', data: plan };
    } catch (error) {
      console.error('Lỗi khi khôi phục bảng giá:', error);
      throw error;
    }
  }
}

module.exports = new PricingPlanService();
