const defaultDb = require('../models');

/**
 * ComputerZoneService
 * Dedicated service for Computer Zone business logic, capacity validation, and pricing plan bindings.
 * Enforces Single Responsibility Principle (SRP) and separation of concerns.
 */
class ComputerZoneService {
  constructor(models = defaultDb) {
    this.models = models;
  }

  /**
   * Fetch all zones with pricing plans and live computer counts
   */
  async getAllZones() {
    try {
      const db = this.models;
      const zones = await db.ComputerZone.findAll({
        where: { is_deleted: false },
        include: [
          {
            model: db.PricingPlan,
            required: false,
            attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active']
          }
        ],
        order: [['zone_id', 'ASC']]
      });

      // Lấy số lượng máy thực tế chưa xóa cho mỗi zone
      const zoneCounts = await db.Computer.findAll({
        attributes: [
          'zone_id',
          [db.sequelize.fn('COUNT', db.sequelize.col('computer_id')), 'count']
        ],
        where: { is_deleted: false },
        group: ['zone_id'],
        raw: true
      });

      const countMap = {};
      for (const item of zoneCounts) {
        countMap[item.zone_id] = Number(item.count) || 0;
      }

      // Lấy số lượng máy đang trong phiên sử dụng (IN_USE) cho mỗi zone
      const inUseCounts = await db.Computer.findAll({
        attributes: [
          'zone_id',
          [db.sequelize.fn('COUNT', db.sequelize.col('computer_id')), 'count']
        ],
        where: { is_deleted: false, status: 'IN_USE' },
        group: ['zone_id'],
        raw: true
      });

      const inUseMap = {};
      for (const item of inUseCounts) {
        inUseMap[item.zone_id] = Number(item.count) || 0;
      }

      return zones.map((z) => {
        const plain = z.toJSON ? z.toJSON() : { ...z };
        plain.computer_count = countMap[plain.zone_id] || 0;
        plain.in_use_count = inUseMap[plain.zone_id] || 0;
        return plain;
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Validate zone existence and capacity limit
   * Throws 400 Bad Request if zone doesn't exist or capacity is exceeded
   */
  async validateCapacity(zoneId) {
    const db = this.models;
    const zoneExists = (typeof db.ComputerZone.findOne === 'function')
      ? await db.ComputerZone.findOne({ where: { zone_id: Number(zoneId), is_deleted: false } })
      : await db.ComputerZone.findByPk(Number(zoneId));
    if (!zoneExists || zoneExists.is_deleted) {
      const err = new Error('Phân khu máy trạm không tồn tại');
      err.statusCode = 400;
      throw err;
    }

    if (zoneExists.max_capacity !== null && zoneExists.max_capacity !== undefined && zoneExists.max_capacity > 0) {
      const currentCount = await db.Computer.count({
        where: { zone_id: Number(zoneId), is_deleted: false }
      });
      if (currentCount >= zoneExists.max_capacity) {
        const err = new Error(`Phân khu '${zoneExists.zone_name}' đã đạt giới hạn sức chứa (${currentCount}/${zoneExists.max_capacity} máy). Vui lòng kiểm tra lại hoặc mở rộng sức chứa phân khu.`);
        err.statusCode = 400;
        err.code = 'ZONE_CAPACITY_EXCEEDED';
        err.details = {
          zone_id: zoneExists.zone_id,
          zone_name: zoneExists.zone_name,
          current_count: currentCount,
          max_capacity: zoneExists.max_capacity
        };
        throw err;
      }
    }

    return zoneExists;
  }

  /**
   * Helper: Parse & validate max capacity
   */
  _validateCapacityValue(capacity) {
    if (capacity === undefined || capacity === '' || capacity === null) {
      return null;
    }
    const parsed = Number(capacity);
    if (isNaN(parsed) || parsed < 1) {
      const err = new Error('Sức chứa tối đa phải là số nguyên dương lớn hơn 0');
      err.statusCode = 400;
      throw err;
    }
    return parsed;
  }

  /**
   * Create a new ComputerZone
   */
  async createZone(zoneData) {
    try {
      const db = this.models;
      const { zone_name, description, tier_level, max_capacity, code_prefix, pricing_plan_ids } = zoneData;

      if (!zone_name || !zone_name.trim()) {
        const err = new Error('Tên phân khu không được để trống');
        err.statusCode = 400;
        throw err;
      }

      const parsedCapacity = this._validateCapacityValue(max_capacity);

      const newZone = await db.ComputerZone.create({
        zone_name: zone_name.trim(),
        description: description ? description.trim() : '',
        tier_level: Number(tier_level) || 1,
        max_capacity: parsedCapacity,
        code_prefix: code_prefix ? code_prefix.trim().toUpperCase() : 'PC-'
      });

      // Liên kết với bảng giá nếu có
      if (Array.isArray(pricing_plan_ids) && pricing_plan_ids.length > 0 && db.ZonePricingPlan) {
        await db.ZonePricingPlan.bulkCreate(
          pricing_plan_ids.map((pid) => ({
            zone_id: newZone.zone_id,
            pricing_plan_id: Number(pid)
          })),
          { ignoreDuplicates: true }
        );
      }

      return await db.ComputerZone.findByPk(newZone.zone_id, {
        include: [{ model: db.PricingPlan, required: false }]
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Update an existing ComputerZone
   */
  async updateZone(zoneId, updateData) {
    try {
      const db = this.models;
      const zone = await db.ComputerZone.findByPk(Number(zoneId));
      if (!zone) {
        const err = new Error('Phân khu máy trạm không tồn tại');
        err.statusCode = 404;
        throw err;
      }

      const { zone_name, description, tier_level, max_capacity, code_prefix, pricing_plan_ids } = updateData;

      if (zone_name !== undefined) {
        if (!zone_name.trim()) {
          const err = new Error('Tên phân khu không được để trống');
          err.statusCode = 400;
          throw err;
        }
        zone.zone_name = zone_name.trim();
      }

      if (description !== undefined) zone.description = description ? description.trim() : '';
      if (tier_level !== undefined) zone.tier_level = Number(tier_level) || 1;
      if (code_prefix !== undefined) zone.code_prefix = code_prefix ? code_prefix.trim().toUpperCase() : 'PC-';

      if (max_capacity !== undefined) {
        zone.max_capacity = this._validateCapacityValue(max_capacity);
      }

      await zone.save();

      // Cập nhật liên kết bảng giá nếu được truyền
      if (Array.isArray(pricing_plan_ids) && db.ZonePricingPlan) {
        await db.ZonePricingPlan.destroy({ where: { zone_id: zone.zone_id } });
        if (pricing_plan_ids.length > 0) {
          await db.ZonePricingPlan.bulkCreate(
            pricing_plan_ids.map((pid) => ({
              zone_id: zone.zone_id,
              pricing_plan_id: Number(pid)
            }))
          );
        }
      }

      return await db.ComputerZone.findByPk(zone.zone_id, {
        include: [{ model: db.PricingPlan, required: false }]
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Delete a ComputerZone (Xóa mềm - Soft Delete)
   * Quy trình 3 bước chuẩn:
   * Bước 1: Chặn xóa nếu còn máy trạm bên trong (count > 0)
   * Bước 2: Chặn xóa nếu đang có máy trong khu vực đó "Đang sử dụng" (IN_USE)
   * Bước 3: Thực thi Xóa mềm (khi số máy = 0): cập nhật is_deleted = true, deleted_at = NOW()
   */
  async deleteZone(zoneId) {
    try {
      const db = this.models;
      const zone = (typeof db.ComputerZone.findOne === 'function')
        ? await db.ComputerZone.findOne({ where: { zone_id: Number(zoneId), is_deleted: false } })
        : await db.ComputerZone.findByPk(Number(zoneId));

      if (!zone || zone.is_deleted) {
        const err = new Error('Phân khu máy trạm không tồn tại hoặc đã bị xóa');
        err.statusCode = 404;
        throw err;
      }

      // Bước 2: Chặn xóa nếu đang có máy trong khu vực đó "Đang sử dụng" (IN_USE)
      const inUseCount = await db.Computer.count({
        where: {
          zone_id: Number(zoneId),
          is_deleted: false,
          status: 'IN_USE'
        }
      });

      if (inUseCount > 0) {
        const err = new Error(`Không thể xóa phân khu vì đang có ${inUseCount} máy trạm đang trong phiên sử dụng. Vui lòng kết thúc phiên chơi trước khi thực hiện.`);
        err.statusCode = 400;
        err.code = 'ZONE_HAS_IN_USE_COMPUTERS';
        throw err;
      }

      // Bước 1: Chặn xóa nếu vẫn còn máy trạm bên trong
      const activeCount = await db.Computer.count({
        where: { zone_id: Number(zoneId), is_deleted: false }
      });

      if (activeCount > 0) {
        const err = new Error(`Không thể xóa phân khu vì đang có ${activeCount} máy trạm trực thuộc. Vui lòng chuyển các máy sang phân khu khác trước khi xóa.`);
        err.statusCode = 400;
        err.code = 'ZONE_HAS_COMPUTERS';
        throw err;
      }

      // Bước 3: Thực thi Xóa mềm (khi số máy = 0)
      if (typeof zone.softDelete === 'function') {
        await zone.softDelete();
      } else {
        zone.is_deleted = true;
        zone.deleted_at = new Date();
        if (typeof zone.save === 'function') {
          await zone.save();
        } else if (typeof zone.destroy === 'function') {
          await zone.destroy();
        }
      }

      // Xóa liên kết bảng giá nếu có
      if (db.ZonePricingPlan && typeof db.ZonePricingPlan.destroy === 'function') {
        await db.ZonePricingPlan.destroy({ where: { zone_id: zone.zone_id } });
      }

      return true;
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }
}

const computerZoneServiceInstance = new ComputerZoneService();
module.exports = computerZoneServiceInstance;
module.exports.ComputerZoneService = ComputerZoneService;
