const { Op } = require('sequelize');
const defaultDb = require('../models');
const HardwareProfileDto = require('../dtos/hardwareProfileDto');
const defaultValidator = require('../validators/hardwareSpecValidator');
const TelemetryService = require('./telemetryService');

async function executeWithDeadlockRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isDeadlock = err?.parent?.code === 'ER_LOCK_DEADLOCK' ||
                         err?.original?.code === 'ER_LOCK_DEADLOCK' ||
                         (err?.message && err.message.includes('Deadlock'));
      if (isDeadlock && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }
      throw err;
    }
  }
}

class HardwareProfileService {
  constructor(
    models = defaultDb,
    validator = defaultValidator,
    telemetryService = new TelemetryService(models)
  ) {
    this.models = models;
    this.validator = validator;
    this.telemetryService = telemetryService;
  }

  /**
   * Fetch hardware profiles & specs directly from MySQL
   */
  async getHardwareSpecs() {
    try {
      const db = this.models;
      const profiles = db.HardwareProfile ? await db.HardwareProfile.findAll({
        where: { is_deleted: false },
        include: [
          { model: db.ComputerZone },
          { model: db.Computer, attributes: ['computer_id', 'computer_name', 'status'] }
        ],
        order: [['profile_id', 'ASC']]
      }) : [];

      const computers = await db.Computer.findAll({
        where: { is_deleted: false },
        attributes: ['computer_id', 'computer_name', 'status', 'hardware_profile_id', 'zone_id'],
        include: [
          { model: db.ComputerZone, attributes: ['zone_id', 'zone_name'] },
          ...(db.HardwareProfile ? [{ model: db.HardwareProfile, attributes: ['profile_id', 'gpu_model', 'ram_capacity', 'storage_type'] }] : [])
        ],
        order: [['computer_id', 'ASC']]
      });

      const zones = await db.ComputerZone.findAll({
        attributes: ['zone_id', 'zone_name']
      });

      const specs = profiles.length > 0 ? profiles.map((p) => {
        return HardwareProfileDto.toDomain(p);
      }) : computers.map((comp) => {
        const zone = comp.ComputerZone || {};
        const p = comp.HardwareProfile || {};
        return {
          id: comp.computer_name,
          computer_id: comp.computer_id,
          numericId: String(comp.computer_id).padStart(2, '0'),
          status: comp.status,
          statusLabel: comp.status,
          zoneId: zone.zone_id ? String(zone.zone_id) : '',
          zoneName: zone.zone_name || 'Chưa phân khu',
          zoneColor: 'sky',
          ip_address: comp.ip_address,
          mac_address: comp.mac_address,
          is_remote_enabled: comp.is_remote_enabled,
          cpu: { model: p.cpu_model || 'Chưa thiết lập', specs: p.cpu_model ? 'Hiệu năng cao' : 'N/A' },
          ram: { capacity: p.ram_capacity || 'Chưa thiết lập', specs: p.ram_capacity ? 'Tốc độ cao' : 'N/A' },
          gpu: { model: p.gpu_model || 'Chưa thiết lập', edition: p.gpu_model ? 'Phiên bản đồ họa' : 'N/A' },
          storage: { type: p.storage_type || 'Chưa thiết lập', specs: p.storage_type ? 'Bộ nhớ lưu trữ' : 'N/A' },
          monitor: p.monitor || 'Chưa thiết lập',
          gear: p.gear || 'Chưa thiết lập',
          assignedComputers: [comp.computer_name],
          telemetry: {
            cpuTemp: 0,
            gpuTemp: 0,
            fanSpeed: '0%',
            sanPing: '0ms'
          }
        };
      });

      const metrics = this.telemetryService.calculateFleetMetrics(computers, profiles, zones);
      const diagnostics = this.telemetryService.calculateDiagnostics(computers, zones);

      let dbComponents = [];
      if (db.HardwareComponent) {
        dbComponents = await db.HardwareComponent.findAll({ where: { is_active: true } });
      }

      const hardwarePresets = this.telemetryService.extractHardwarePresets(profiles, dbComponents);

      return {
        specs,
        metrics,
        diagnostics,
        zones,
        hardwarePresets,
        computers: computers.map((c) => ({
          computer_id: c.computer_id,
          computer_name: c.computer_name,
          zone_id: c.zone_id,
          status: c.status
        }))
      };
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Helper to find hardware profile by Primary Key or Profile Name
   */
  async findProfileByIdOrName(specId, transaction) {
    const db = this.models;
    if (!db.HardwareProfile) return null;
    let profile = await db.HardwareProfile.findByPk(specId, { transaction });
    if (!profile) {
      profile = await db.HardwareProfile.findOne({ where: { profile_name: specId }, transaction });
    }
    return profile;
  }

  /**
   * Helper to synchronize assigned computers with hardware profile and optional zone
   */
  async syncAssignedComputers(assignedComputers, profileId, zoneId, transaction) {
    if (!Array.isArray(assignedComputers) || assignedComputers.length === 0) return;
    const db = this.models;
    const compUpdateFields = {};
    if (profileId) {
      compUpdateFields.hardware_profile_id = profileId;
    }
    if (zoneId !== null && zoneId !== undefined) {
      compUpdateFields.zone_id = zoneId;
    }
    await db.Computer.update(
      compUpdateFields,
      { where: { computer_name: assignedComputers }, transaction }
    );
  }

  /**
   * Create new hardware profile directly in MySQL with Transaction safety
   */
  async createHardwareSpec(specData) {
    try {
      await this.validator.validateHardwareSpecInput(specData, true, this.models);

      const persistenceData = HardwareProfileDto.toPersistence(specData);
      const nameToSave = persistenceData.profile_name || `Mẫu Cấu Hình ${Date.now()}`;
      persistenceData.profile_name = nameToSave;

      const db = this.models;
      if (db.HardwareProfile) {
        const existing = await db.HardwareProfile.findOne({ where: { profile_name: nameToSave } });
        if (existing) {
          const err = new Error(`Mẫu cấu hình với tên '${nameToSave}' đã tồn tại trong hệ thống`);
          err.statusCode = 409;
          throw err;
        }
      }

      return await executeWithDeadlockRetry(async () => {
        return await db.sequelize.transaction(async (t) => {
          let profile = null;
          if (db.HardwareProfile) {
            profile = await db.HardwareProfile.create(
              persistenceData,
              { transaction: t }
            );
          }

          await this.syncAssignedComputers(
            specData.assignedComputers,
            profile ? profile.profile_id : null,
            persistenceData.zone_id,
            t
          );

          return { status: 'success', message: 'Tạo mẫu cấu hình phần cứng thành công', profile };
        });
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Update hardware profile directly in MySQL with Transaction safety
   */
  async updateHardwareSpec(specId, updateData) {
    try {
      if (!this.validator.isValidSpecId(specId)) {
        const err = new Error('Mã định danh cấu hình (specId) không hợp lệ');
        err.statusCode = 400;
        throw err;
      }

      await this.validator.validateHardwareSpecInput(updateData, false, this.models);
      const persistenceData = HardwareProfileDto.toPersistence(updateData);
      const db = this.models;

      return await db.sequelize.transaction(async (t) => {
        const profile = await this.findProfileByIdOrName(specId, t);

        if (!profile) {
          const err = new Error(`Không tìm thấy mẫu cấu hình phần cứng với mã định danh: ${specId}`);
          err.statusCode = 404;
          throw err;
        }

        if (persistenceData.profile_name && persistenceData.profile_name !== profile.profile_name) {
          const existing = await db.HardwareProfile.findOne({
            where: {
              profile_name: persistenceData.profile_name,
              profile_id: { [Op.ne]: profile.profile_id }
            },
            transaction: t
          });
          if (existing) {
            const err = new Error(`Mẫu cấu hình với tên '${persistenceData.profile_name}' đã tồn tại trong hệ thống`);
            err.statusCode = 409;
            throw err;
          }
          profile.profile_name = persistenceData.profile_name;
        }

        if (persistenceData.description !== undefined) profile.description = persistenceData.description;
        if (persistenceData.cpu_model !== null) profile.cpu_model = persistenceData.cpu_model;
        if (persistenceData.gpu_model !== null) profile.gpu_model = persistenceData.gpu_model;
        if (persistenceData.ram_capacity !== null) profile.ram_capacity = persistenceData.ram_capacity;
        if (persistenceData.storage_type !== null) profile.storage_type = persistenceData.storage_type;
        if (persistenceData.monitor !== null) profile.monitor = persistenceData.monitor;
        if (persistenceData.gear !== null) profile.gear = persistenceData.gear;
        if (persistenceData.zone_id !== null && persistenceData.zone_id !== undefined) {
          profile.zone_id = persistenceData.zone_id;
        }

        await profile.save({ transaction: t });

        await this.syncAssignedComputers(
          updateData.assignedComputers,
          profile.profile_id,
          persistenceData.zone_id,
          t
        );

        return { status: 'success', message: 'Cập nhật mẫu cấu hình phần cứng thành công', profile };
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Delete hardware profile directly from MySQL with Transaction safety
   */
  async deleteHardwareSpec(specId) {
    try {
      if (!this.validator.isValidSpecId(specId)) {
        const err = new Error('Mã định danh cấu hình cần xóa không hợp lệ');
        err.statusCode = 400;
        throw err;
      }

      const db = this.models;
      return await db.sequelize.transaction(async (t) => {
        const profile = await this.findProfileByIdOrName(specId, t);

        if (!profile) {
          const err = new Error(`Không tìm thấy mẫu cấu hình phần cứng để xóa với mã định danh: ${specId}`);
          err.statusCode = 404;
          throw err;
        }

        await db.Computer.update(
          { hardware_profile_id: null },
          { where: { hardware_profile_id: profile.profile_id }, transaction: t }
        );
        // Xóa mềm cấu hình phần cứng (Soft Delete)
        if (typeof profile.softDelete === 'function') {
          await profile.softDelete();
        } else {
          profile.is_deleted = true;
          profile.deleted_at = new Date();
          profile.is_active = false;
          await profile.save({ transaction: t });
        }
        return true;
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Bật / Tắt trạng thái kích hoạt cấu hình máy (Toggle Switch)
   */
  async toggleHardwareSpec(specId, isActive) {
    try {
      const profile = await this.findProfileByIdOrName(specId);
      if (!profile) {
        const err = new Error(`Không tìm thấy mẫu cấu hình phần cứng: ${specId}`);
        err.statusCode = 404;
        throw err;
      }

      profile.is_active = isActive !== undefined ? Boolean(isActive) : !profile.is_active;
      await profile.save();
      return profile;
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }
}

module.exports = HardwareProfileService;
