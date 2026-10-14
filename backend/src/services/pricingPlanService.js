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

class PricingPlanService {
  /**
   * Lấy danh sách tất cả bảng giá + thống kê KPI metrics
   */
  async getAllPricingPlans() {
    try {
      const plans = await db.PricingPlan.findAll({
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
      const happyHourCount = activePlans.filter((p) => Boolean(p.start_time && p.end_time)).length;
      const totalHourlyRate = activePlans.reduce((sum, p) => sum + Number(p.price_per_hour || 0), 0);
      const avgRate = activeCount > 0 ? Math.round(totalHourlyRate / activeCount) : 0;

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

      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (!trimmedName) {
        throw new Error('Tên bảng giá không được để trống');
      }
      if (trimmedName.length > 100) {
        throw new Error('Tên bảng giá không được vượt quá 100 ký tự');
      }

      if (price_per_hour === undefined || price_per_hour === null || price_per_hour === '') {
        throw new Error('Giá cước mỗi giờ là bắt buộc');
      }
      const parsedPrice = Number(price_per_hour);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error('Giá cước mỗi giờ phải là một số không âm hợp lệ');
      }

      const sanitizedStartTime = sanitizeTime(start_time);
      const sanitizedEndTime = sanitizeTime(end_time);

      // Kiểm tra tính đồng bộ của khung giờ
      if ((sanitizedStartTime && !sanitizedEndTime) || (!sanitizedStartTime && sanitizedEndTime)) {
        throw new Error('Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ');
      }

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
        const uniqueZoneIds = [...new Set(zone_ids.map(Number))].filter((id) => !isNaN(id) && id > 0);
        if (uniqueZoneIds.length > 0) {
          const zoneAssociations = uniqueZoneIds.map((zoneId) => ({
            zone_id: zoneId,
            pricing_plan_id: newPlan.pricing_plan_id
          }));
          await db.ZonePricingPlan.bulkCreate(zoneAssociations, { transaction });
        }
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

      let validatedName = plan.name;
      if (name !== undefined) {
        const trimmed = typeof name === 'string' ? name.trim() : '';
        if (!trimmed) {
          throw new Error('Tên bảng giá không được để trống');
        }
        if (trimmed.length > 100) {
          throw new Error('Tên bảng giá không được vượt quá 100 ký tự');
        }
        validatedName = trimmed;
      }

      let validatedPrice = plan.price_per_hour;
      if (price_per_hour !== undefined) {
        const parsed = Number(price_per_hour);
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('Giá cước mỗi giờ cập nhật phải là số không âm hợp lệ');
        }
        validatedPrice = parsed;
      }

      const finalStartTime = start_time !== undefined ? sanitizeTime(start_time) : plan.start_time;
      const finalEndTime = end_time !== undefined ? sanitizeTime(end_time) : plan.end_time;
      if ((finalStartTime && !finalEndTime) || (!finalStartTime && finalEndTime)) {
        throw new Error('Khung giờ bắt đầu và kết thúc phải được cấu hình đồng bộ');
      }

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

      // Cập nhật lại zone nếu danh sách zone_ids được truyền lên (khử trùng lặp)
      if (Array.isArray(zone_ids)) {
        await db.ZonePricingPlan.destroy({
          where: { pricing_plan_id: id },
          transaction
        });

        const uniqueZoneIds = [...new Set(zone_ids.map(Number))].filter((zid) => !isNaN(zid) && zid > 0);
        if (uniqueZoneIds.length > 0) {
          const zoneAssociations = uniqueZoneIds.map((zoneId) => ({
            zone_id: zoneId,
            pricing_plan_id: id
          }));
          await db.ZonePricingPlan.bulkCreate(zoneAssociations, { transaction });
        }
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
   * Xóa bảng giá
   */
  async deletePricingPlan(id) {
    const transaction = await db.sequelize.transaction();
    try {
      const plan = await db.PricingPlan.findByPk(id, { transaction });
      if (!plan) {
        throw new Error(`Không tìm thấy bảng giá với ID: ${id}`);
      }

      // Xóa liên kết trước
      await db.ZonePricingPlan.destroy({
        where: { pricing_plan_id: id },
        transaction
      });

      await plan.destroy({ transaction });
      await transaction.commit();

      return { success: true, message: 'Đã xóa bảng giá thành công' };
    } catch (error) {
      await transaction.rollback();
      console.error('Lỗi khi xóa bảng giá:', error);
      throw error;
    }
  }
}

module.exports = new PricingPlanService();
