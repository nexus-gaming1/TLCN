const { Op } = require('sequelize');
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
   * @param {boolean} [includeDeleted=false] - Whether to include soft-deleted zones
   */
  async getAllZones(includeDeleted = false) {
    try {
      const db = this.models;
      const whereCondition = includeDeleted ? {} : { is_deleted: false };
      const zones = await db.ComputerZone.findAll({
        where: whereCondition,
        include: [
          {
            model: db.PricingPlan,
            required: false,
            attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active']
          }
        ],
        order: includeDeleted ? [['is_deleted', 'ASC'], ['zone_id', 'ASC']] : [['zone_id', 'ASC']]
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

      // Lấy số lượng mẫu cấu hình phần cứng đang hoạt động liên kết với mỗi zone
      let hpMap = {};
      if (db.HardwareProfile && typeof db.HardwareProfile.findAll === 'function') {
        try {
          const hpCounts = await db.HardwareProfile.findAll({
            attributes: [
              'zone_id',
              [db.sequelize.fn('COUNT', db.sequelize.col('profile_id')), 'count']
            ],
            where: { is_deleted: false },
            group: ['zone_id'],
            raw: true
          });
          for (const item of hpCounts) {
            if (item.zone_id) {
              hpMap[item.zone_id] = Number(item.count) || 0;
            }
          }
        } catch (_hpCountErr) {
          // Graceful fallback if HardwareProfile model is not populated
        }
      }

      return zones.map((z) => {
        const plain = z.toJSON ? z.toJSON() : { ...z };
        plain.computer_count = countMap[plain.zone_id] || 0;
        plain.in_use_count = inUseMap[plain.zone_id] || 0;
        plain.hardware_profile_count = hpMap[plain.zone_id] || 0;
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
   * Tuân thủ quy chuẩn BR-ZONE-DELETE:
   * - Điều kiện tiên quyết: Phân khu phải tồn tại và chưa bị xóa trước đó.
   * - Chặn xóa nếu còn phiên sử dụng (IN_USE / ACTIVE) thuộc phân khu.
   * - Chặn xóa nếu còn máy trạm gán vào phân khu (kể cả máy OFFLINE, bất kể trạng thái).
   * - Chặn xóa nếu còn liên kết với mẫu cấu hình phần cứng (HardwareProfile) đang hoạt động.
   * - Xử lý: Cập nhật is_deleted = true, deleted_at = NOW(). Không xóa vật lý bản ghi.
   *   Bảo toàn lịch sử phiên chơi, giao dịch và dữ liệu kiểm toán.
   */
  async deleteZone(zoneId) {
    try {
      const db = this.models;
      const zone = (typeof db.ComputerZone.findByPk === 'function')
        ? await db.ComputerZone.findByPk(Number(zoneId))
        : (typeof db.ComputerZone.findOne === 'function' ? await db.ComputerZone.findOne({ where: { zone_id: Number(zoneId) } }) : null);

      if (!zone) {
        const err = new Error('Phân khu máy trạm không tồn tại');
        err.statusCode = 404;
        err.code = 'ZONE_NOT_FOUND';
        throw err;
      }

      if (zone.is_deleted) {
        const err = new Error('Phân khu máy trạm đã bị xóa trước đó');
        err.statusCode = 400;
        err.code = 'ZONE_ALREADY_DELETED';
        throw err;
      }

      // 1. Chặn xóa nếu đang có phiên chơi / máy đang sử dụng (IN_USE)
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

      // 2. Chặn xóa nếu vẫn còn bất kỳ máy trạm nào được gán vào phân khu (bất kể trạng thái)
      const activeCount = await db.Computer.count({
        where: { zone_id: Number(zoneId), is_deleted: false }
      });

      if (activeCount > 0) {
        const err = new Error(`Không thể xóa phân khu vì đang có ${activeCount} máy trạm trực thuộc. Vui lòng chuyển các máy sang phân khu khác trước khi xóa.`);
        err.statusCode = 400;
        err.code = 'ZONE_HAS_COMPUTERS';
        throw err;
      }

      // 3. Chặn xóa nếu còn liên kết cấu hình phần cứng (HardwareProfile) đang hoạt động
      if (db.HardwareProfile && typeof db.HardwareProfile.findAll === 'function') {
        const activeProfiles = await db.HardwareProfile.findAll({
          where: { zone_id: Number(zoneId), is_deleted: false }
        });

        if (activeProfiles && activeProfiles.length > 0) {
          const profileNames = activeProfiles.map((p) => `'${p.profile_name || p.id}'`).join(', ');
          const err = new Error(`Không thể xóa phân khu vì vẫn còn liên kết với mẫu cấu hình phần cứng đang hoạt động (${profileNames}). Vui lòng gán lại phân khu hoặc xóa cấu hình trước khi xóa phân khu.`);
          err.statusCode = 400;
          err.code = 'ZONE_HAS_HARDWARE_PROFILES';
          throw err;
        }
      }

      // 4. Thực thi Xóa mềm (Soft Delete) - Cập nhật cờ is_deleted và deleted_at
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

      return true;
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Restore a soft-deleted ComputerZone
   * Admin có thể khôi phục phân khu nếu chưa phát sinh xung đột với dữ liệu hiện tại
   */
  async restoreZone(zoneId) {
    try {
      const db = this.models;
      const zone = (typeof db.ComputerZone.findByPk === 'function')
        ? await db.ComputerZone.findByPk(Number(zoneId))
        : (typeof db.ComputerZone.findOne === 'function' ? await db.ComputerZone.findOne({ where: { zone_id: Number(zoneId) } }) : null);

      if (!zone) {
        const err = new Error('Phân khu máy trạm không tồn tại');
        err.statusCode = 404;
        err.code = 'ZONE_NOT_FOUND';
        throw err;
      }

      if (!zone.is_deleted) {
        const err = new Error('Phân khu máy trạm đang hoạt động, không cần khôi phục');
        err.statusCode = 400;
        err.code = 'ZONE_NOT_DELETED';
        throw err;
      }

      // Kiểm tra xung đột dữ liệu hiện tại trước khi khôi phục
      // 1. Trùng tên với phân khu đang hoạt động khác
      if (typeof db.ComputerZone.findOne === 'function') {
        const duplicateName = await db.ComputerZone.findOne({
          where: {
            zone_name: zone.zone_name,
            zone_id: { [Op.ne]: zone.zone_id },
            is_deleted: false
          }
        });
        if (duplicateName) {
          const err = new Error(`Không thể khôi phục vì tên phân khu '${zone.zone_name}' đang trùng với một phân khu đang hoạt động khác.`);
          err.statusCode = 409;
          err.code = 'ZONE_NAME_CONFLICT';
          throw err;
        }

        // 2. Trùng tiền tố máy (code_prefix) với phân khu đang hoạt động khác
        if (zone.code_prefix) {
          const duplicatePrefix = await db.ComputerZone.findOne({
            where: {
              code_prefix: zone.code_prefix,
              zone_id: { [Op.ne]: zone.zone_id },
              is_deleted: false
            }
          });
          if (duplicatePrefix) {
            const err = new Error(`Không thể khôi phục vì tiền tố máy '${zone.code_prefix}' đang được sử dụng bởi phân khu '${duplicatePrefix.zone_name}'.`);
            err.statusCode = 409;
            err.code = 'ZONE_PREFIX_CONFLICT';
            throw err;
          }
        }
      }

      // Thực thi khôi phục
      if (typeof zone.restore === 'function') {
        await zone.restore();
      } else {
        zone.is_deleted = false;
        zone.deleted_at = null;
        if (typeof zone.save === 'function') {
          await zone.save();
        }
      }

      return zone;
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }
}

const computerZoneServiceInstance = new ComputerZoneService();
module.exports = computerZoneServiceInstance;
module.exports.ComputerZoneService = ComputerZoneService;
