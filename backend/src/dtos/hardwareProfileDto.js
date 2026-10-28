class HardwareProfileDto {
  /**
   * Helper to extract string representation from either object or string representation
   */
  static #extractComponentValue(val, selectVal, objectProp = 'model') {
    if (typeof val === 'object' && val !== null) {
      return val[objectProp] || '';
    }
    return val || selectVal || '';
  }

  /**
   * Helper to convert string to trimmed string or null
   */
  static #toNullableTrimmed(val) {
    if (!val) return null;
    const trimmed = String(val).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Format HardwareProfile model instance to UI Domain Spec object
   * @param {Object} profile - Sequelize HardwareProfile instance or plain object
   * @param {Array<string>} [assignedComputers=[]] - List of computer names assigned to this profile
   * @returns {Object} Standardized UI Hardware Spec object
   */
  static toDomain(profile, assignedComputers = []) {
    if (!profile) return null;

    const zone = profile.ComputerZone || {};
    const computers = assignedComputers.length > 0 
      ? assignedComputers 
      : (Array.isArray(profile.Computers) ? profile.Computers.map(c => c.computer_name) : []);

    const profileId = profile.profile_id || 0;

    return {
      id: profile.profile_name,
      profile_id: profileId,
      profileName: profile.profile_name,
      description: profile.description || '',
      zoneId: profile.zone_id ? String(profile.zone_id) : '1',
      zoneName: zone.zone_name || 'Phân Khu',
      status: 'online',
      statusLabel: 'Online',
      cpu: {
        model: profile.cpu_model || 'Chưa thiết lập',
        specs: profile.cpu_model ? 'Hiệu năng cao' : 'N/A'
      },
      ram: {
        capacity: profile.ram_capacity || 'Chưa thiết lập',
        specs: profile.ram_capacity ? 'Tốc độ cao' : 'N/A'
      },
      gpu: {
        model: profile.gpu_model || 'Chưa thiết lập',
        edition: profile.gpu_model ? 'Phiên bản đồ họa' : 'N/A'
      },
      storage: {
        type: profile.storage_type || 'Chưa thiết lập',
        specs: profile.storage_type ? 'Bộ nhớ lưu trữ' : 'N/A'
      },
      monitor: profile.monitor || 'Chưa thiết lập',
      gear: profile.gear || 'Chưa thiết lập',
      assignedComputers: computers,
      telemetry: profile.telemetry || {
        cpuTemp: profileId > 0 ? 45 + (profileId % 10) : 0,
        gpuTemp: profileId > 0 ? 42 + (profileId % 8) : 0,
        fanSpeed: profileId > 0 ? `${50 + (profileId % 15)}%` : '0%',
        sanPing: profileId > 0 ? `${(0.15 + (profileId % 5) * 0.02).toFixed(2)}ms` : '0ms'
      }
    };
  }

  /**
   * Extract and normalize persistence fields from incoming DTO / Request Body
   * @param {Object} dto - Incoming payload from frontend / API
   * @returns {Object} Normalized database entity fields (snake_case)
   */
  static toPersistence(dto) {
    if (!dto || typeof dto !== 'object') return {};

    const {
      profileName,
      id,
      description,
      cpu,
      gpu,
      ram,
      storage,
      monitor,
      gear,
      zoneId,
      cpuSelect,
      gpuSelect,
      ramSelect,
      storageSelect,
      monitorSelect,
      gearSelect
    } = dto;

    const nameToSave = profileName || id;

    const cpuFinal = this.#extractComponentValue(cpu, cpuSelect, 'model');
    const gpuFinal = this.#extractComponentValue(gpu, gpuSelect, 'model');
    const ramFinal = this.#extractComponentValue(ram, ramSelect, 'capacity');
    const storageFinal = this.#extractComponentValue(storage, storageSelect, 'type');
    const monitorFinal = this.#extractComponentValue(monitor, monitorSelect, 'model');
    const gearFinal = this.#extractComponentValue(gear, gearSelect, 'model');

    return {
      profile_name: nameToSave ? String(nameToSave).trim() : undefined,
      description: description !== undefined ? String(description).trim() : '',
      cpu_model: this.#toNullableTrimmed(cpuFinal),
      gpu_model: this.#toNullableTrimmed(gpuFinal),
      ram_capacity: this.#toNullableTrimmed(ramFinal),
      storage_type: this.#toNullableTrimmed(storageFinal),
      monitor: this.#toNullableTrimmed(monitorFinal),
      gear: this.#toNullableTrimmed(gearFinal),
      zone_id: zoneId !== undefined && zoneId !== null && zoneId !== '' ? Number(zoneId) : null
    };
  }
}

module.exports = HardwareProfileDto;
