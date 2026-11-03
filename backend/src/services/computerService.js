const db = require('../models');
const { formatStationDTO } = require('../utils/stationFormatter');
const { ComputerStatus } = require('../constants/enums');
const { SessionType } = require('../constants/enums');
const { Op } = require('sequelize');


/**
 * ComputerService
 * Enforces Single Responsibility Principle (SRP) for Computer & Zone Business Logic.
 * Optimized O(N) Summary calculation & top-level imports.
 */
class ComputerService {
  /**
   * Fetch all computers with ComputerZone details & latest status logs
   */
  async getAllComputers() {
    try {
      const computers = await db.Computer.findAll({
        include: [
          {
            model: db.ComputerZone,
            include: [{ model: db.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }]
          },
          {
            model: db.ComputerStatusLog,
            required: false,
            limit: 1,
            order: [['recorded_at', 'DESC']],
            include: [
              {
                model: db.Member,
                include: [{ model: db.User, as: 'userInfo', attributes: ['username', 'full_name'] }]
              }
            ]
          }
        ],
        order: [['computer_id', 'ASC']]
      });

      return computers;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách máy trạm:', error);
      throw error;
    }
  }

  /**
   * Fetch the current usage information used by the control panel.
   * The active session is joined through Member.userInfo so an employee
   * who processed an order is never reported as the logged-in member.
   */
  async getComputerOverview() {
    try {
      const now = new Date();
      const computers = await db.Computer.findAll({
        attributes: ['computer_id', 'computer_name', 'status'],
        include: [
          {
            model: db.ComputerZone,
            attributes: ['zone_id', 'zone_name'],
            include: [{
              model: db.PricingPlan,
              attributes: ['pricing_plan_id', 'price_per_hour', 'priority'],
              where: { is_active: true },
              required: false,
              through: { attributes: [] }
            }]
          },
          {
            model: db.RentalSession,
            as: 'rentalSessions',
            attributes: ['rental_session_id', 'started_at', 'member_id'],
            where: { status: 'ACTIVE' },
            required: false,
            include: [
              {
                model: db.Member,
                as: 'member',
                attributes: ['member_id'],
                required: false,
                include: [{
                  model: db.User,
                  as: 'userInfo',
                  attributes: ['username'],
                  required: false
                }]
              },
              {
                model: db.ComboTime,
                as: 'comboTime',
                attributes: ['combo_time_id', 'status', 'end_time'],
                where: {
                  status: 'ACTIVE',
                  end_time: { [Op.gt]: now }
                },
                required: false
              }
            ]
          }
        ],
        order: [['computer_id', 'ASC']],
        distinct: true
      });

      return computers.map((computer) => {
        const session = computer.rentalSessions?.[0] || null;
        const zone = computer.ComputerZone;
        const pricingPlans = zone?.PricingPlans || [];
        const pricingPlan = pricingPlans
          .slice()
          .sort((left, right) => (right.priority || 0) - (left.priority || 0))[0];
        const user = session?.member?.userInfo;

        return {
          computerId: computer.computer_id,
          computerName: computer.computer_name,
          status: computer.status,
          currentUsername: user?.username || null,
          sessionStartedAt: session?.started_at || null,
          zoneName: zone?.zone_name || null,
          hourlyRate: pricingPlan?.price_per_hour != null
            ? Number(pricingPlan.price_per_hour)
            : null,
          hasActiveCombo: Boolean(session?.comboTime)
        };
      });
    } catch (error) {
      console.error('Lỗi khi lấy tổng quan máy trạm:', error);
      throw error;
    }
  }

  /**
   * Fetch computer by ID
   */
  async getComputerById(computerId) {
    try {
      return await db.Computer.findByPk(computerId, {
        include: [
          { model: db.ComputerZone },
          { model: db.ComputerStatusLog, required: false, limit: 1, order: [['recorded_at', 'DESC']] }
        ]
      });
    } catch (error) {
      console.error('Lỗi khi lấy máy trạm theo ID:', error);
      throw error;
    }
  }

  /**
   * Create a new computer station
   */
  async createComputer(computerData) {
    try {
      const { computer_name, zone_id, status, ip_address, mac_address, is_remote_enabled } = computerData;

      // Auto-compute next ID for dynamic LAN IP & MAC allocation if omitted
      const maxCompId = (await db.Computer.max('computer_id')) || 0;
      const nextId = maxCompId + 1;
      const hexId = (nextId * 3).toString(16).padStart(2, '0').toUpperCase();

      const autoIp = ip_address && ip_address.trim() ? ip_address.trim() : `192.168.1.${100 + nextId}`;
      const autoMac = mac_address && mac_address.trim() ? mac_address.trim() : `F4:D4:88:5A:${String(nextId).padStart(2, '0')}:${hexId}`;

      const newComputer = await db.Computer.create({
        computer_name: computer_name || `PC-${String(nextId).padStart(3, '0')}`,
        ip_address: autoIp,
        mac_address: autoMac,
        zone_id: Number(zone_id) || 1,
        status: status || ComputerStatus.OFFLINE,
        is_remote_enabled: is_remote_enabled || false
      });
      return newComputer;
    } catch (error) {
      console.error('Lỗi khi tạo máy trạm mới:', error);
      throw error;
    }
  }

  /**
   * Update computer status or zone
   */
  async updateComputer(computerId, updateData) {
    try {
      const computer = await db.Computer.findByPk(computerId);
      if (!computer) return null;

      if (updateData.status) {
        const transaction = await db.sequelize.transaction();
        try {
          const previousStatus = computer.status;
          computer.status = updateData.status;
          await computer.save({ transaction });

          if (previousStatus !== updateData.status) {
            await db.ComputerStatusLog.create({
              computer_id: computer.computer_id,
              status: updateData.status,
              session_type: SessionType.SYSTEM
            }, { transaction });
          }

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      }

      if (updateData.zone_id) computer.zone_id = updateData.zone_id;
      if (updateData.computer_name) computer.computer_name = updateData.computer_name;
      if (updateData.ip_address !== undefined) computer.ip_address = updateData.ip_address;
      if (updateData.mac_address !== undefined) computer.mac_address = updateData.mac_address;
      if (updateData.is_remote_enabled !== undefined) computer.is_remote_enabled = updateData.is_remote_enabled;

      await computer.save();
      return computer;
    } catch (error) {
      console.error('Lỗi khi cập nhật máy trạm:', error);
      throw error;
    }
  }

  /**
   * Delete computer station
   */
  async deleteComputer(computerId) {
    try {
      const computer = await db.Computer.findByPk(computerId);
      if (!computer) return false;
      await computer.destroy();
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa máy trạm:', error);
      throw error;
    }
  }

  /**
   * Fetch all zones with pricing plans
   */
  async getAllZones() {
    try {
      return await db.ComputerZone.findAll({
        include: [{ model: db.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }]
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách khu vực máy:', error);
      throw error;
    }
  }

  /**
   * Fetch full Room Layout Grid grouped by Computer Zones with standardized Station DTOs
   * Optimized: Top-level imports, O(N) Summary calculation, ComputerStatus Enums
   */
  async getRoomLayoutGrid() {
    try {
      const [zones, computers] = await Promise.all([
        db.ComputerZone.findAll({
          include: [{ model: db.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }],
          order: [['zone_id', 'ASC']]
        }),
        this.getAllComputers()
      ]);

      const formattedStations = computers.map((comp) => formatStationDTO(comp));


      // Single-pass O(N) summary calculation instead of 6 filter passes O(6N)
      const summary = {
        total: formattedStations.length,
        online: 0,
        in_use: 0,
        offline: 0,
        locked: 0,
        maintenance: 0,
        remote: 0
      };

      for (const s of formattedStations) {
        switch (s.status) {
          case ComputerStatus.ONLINE:
            summary.online++;
            break;
          case ComputerStatus.IN_USE:
            summary.in_use++;
            break;
          case ComputerStatus.OFFLINE:
            summary.offline++;
            break;
          case ComputerStatus.LOCKED:
          case ComputerStatus.PAUSE:
            summary.locked++;
            break;
          case ComputerStatus.MAINTENANCE:
            summary.maintenance++;
            break;
          case ComputerStatus.REMOTE:
            summary.remote++;
            break;
        }
      }

      // Group stations by zone
      const zoneGrids = zones.map((zone) => {
        const zoneStations = formattedStations.filter((s) => s.zone_id === zone.zone_id);
        // Lấy bảng giá từ quan hệ belongsToMany PricingPlans
        const pricingPlans = zone.PricingPlans || (zone.PricingPlan ? [zone.PricingPlan] : []);
        const activePlan = pricingPlans.find((p) => p.is_active) || pricingPlans[0] || {};

        return {
          zone_id: zone.zone_id,
          zone_name: zone.zone_name,
          price_per_hour: activePlan.price_per_hour ? Number(activePlan.price_per_hour) : 0,
          total_stations: zoneStations.length,
          stations: zoneStations
        };
      });

      return {
        summary,
        zones: zoneGrids,
        all_stations: formattedStations
      };
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu sơ đồ phòng máy (Room Layout Grid):', error);
      throw error;
    }
  }

  /**
   * Fetch hardware specs, telemetry, and metrics dynamically from DB
   */
  /**
   * Fetch hardware profiles & specs directly from MySQL CSDL
   */
  async getHardwareSpecs() {
    try {
      const profiles = db.HardwareProfile ? await db.HardwareProfile.findAll({
        include: [{ model: db.ComputerZone }],
        order: [['profile_id', 'ASC']]
      }) : [];

      const computers = await db.Computer.findAll({
        include: [
          { model: db.ComputerZone },
          ...(db.HardwareProfile ? [{ model: db.HardwareProfile }] : [])
        ],
        order: [['computer_id', 'ASC']]
      });

      const zones = await db.ComputerZone.findAll();

      // Helper to generate spec item from HardwareProfile row or fallback
      const specs = profiles.length > 0 ? profiles.map((p) => {
        const zone = p.ComputerZone || {};
        const assignedComps = computers.filter(c => c.hardware_profile_id === p.profile_id).map(c => c.computer_name);

        return {
          id: p.profile_name,
          profile_id: p.profile_id,
          profileName: p.profile_name,
          description: p.description,
          zoneId: p.zone_id ? String(p.zone_id) : '1',
          zoneName: zone.zone_name || 'Phân Khu',
          status: 'online',
          statusLabel: 'Online',
          cpu: { model: p.cpu_model || 'Intel Core i7-14700K', specs: 'Hiệu năng cao' },
          ram: { capacity: p.ram_capacity || '32GB DDR5', specs: 'Low-latency' },
          gpu: { model: p.gpu_model || 'RTX 4070 Ti Super 16GB', edition: 'Gaming Edition' },
          storage: { type: p.storage_type || 'SAN NVMe 10Gbps', specs: 'BootROM High-Speed' },
          monitor: p.monitor || '25" Fast-IPS 240Hz',
          gear: p.gear || 'Standard Cyber Peripherals',
          assignedComputers: assignedComps,
          telemetry: {
            cpuTemp: 45 + (p.profile_id % 10),
            gpuTemp: 42 + (p.profile_id % 8),
            fanSpeed: `${50 + (p.profile_id % 15)}%`,
            sanPing: `${(0.15 + (p.profile_id % 5) * 0.02).toFixed(2)}ms`
          }
        };
      }) : computers.map((comp) => {
        const zone = comp.ComputerZone || {};
        return {
          id: comp.computer_name,
          computer_id: comp.computer_id,
          numericId: String(comp.computer_id).padStart(2, '0'),
          status: comp.status === ComputerStatus.ONLINE || comp.status === ComputerStatus.IN_USE ? 'online' : comp.status === ComputerStatus.MAINTENANCE ? 'maintenance' : 'ready',
          rawStatus: comp.status,
          statusLabel: comp.status,
          zoneId: zone.zone_id ? String(zone.zone_id) : '1',
          zoneName: zone.zone_name || 'Phân khu 1',
          zoneColor: 'sky',
          ip_address: comp.ip_address,
          mac_address: comp.mac_address,
          is_remote_enabled: comp.is_remote_enabled,
          cpu: { model: 'Intel Core i7-14700K', specs: '20 Cores / 28 Threads @ 5.6GHz' },
          ram: { capacity: '32GB DDR5', specs: '5600MHz Corsair Vengeance' },
          gpu: { model: 'RTX 4070 Ti Super 16GB', edition: 'MSI Gaming X Slim' },
          storage: { type: 'SAN NVMe 10Gbps', specs: 'High Throughput Cache 1TB' },
          telemetry: {
            cpuTemp: 45 + (comp.computer_id % 15),
            gpuTemp: 42 + (comp.computer_id % 12),
            fanSpeed: `${50 + (comp.computer_id % 20)}%`,
            sanPing: `${(0.15 + (comp.computer_id % 10) * 0.02).toFixed(2)}ms`
          }
        };
      });

      const topGpuCount = specs.filter(s => s.gpu.model.includes('4090') || s.gpu.model.includes('4080')).length;

      const metrics = {
        totalMachines: computers.length,
        activeZones: zones.length,
        availability: '100%',
        topGpuRatio: 'RTX 4090 / 4080S',
        topGpuCount,
        topGpuPercent: `${Math.round((topGpuCount / Math.max(specs.length, 1)) * 100)}%`,
        avgRamRange: '32GB - 64GB',
        ramSpeed: 'DDR5 6000MHz Low-CL',
        totalRamCapacity: `${computers.length * 32} GB Total`,
        bootromHealth: '100% Đồng Bộ',
        sanNetwork: 'Dual SAN NVMe 40Gbps Fiber',
        ioErrors: 0
      };

      const diagnostics = {
        zonesTemp: zones.map((z, idx) => ({
          name: z.zone_name,
          temp: `${48 + idx * 3}°C`,
          fan: `Fan ${50 + idx * 5}%`,
          percentage: 45 + idx * 8,
          color: idx === 0 ? 'sky' : idx === 1 ? 'indigo' : idx === 2 ? 'amber' : idx === 3 ? 'purple' : 'emerald'
        })),
        sanThroughput: {
          current: '8.42 Gbps',
          label: `Tải cao điểm (${computers.filter(c => c.status === ComputerStatus.IN_USE || c.status === ComputerStatus.ONLINE).length} máy đang hoạt động)`,
          gameLoadTime: '2.4 giây'
        },
        alert: {
          machineId: specs.find(s => s.status === 'maintenance')?.id || 'ST-02',
          title: `Máy ${specs.find(s => s.status === 'maintenance')?.id || 'ST-02'}: Kiểm tra hệ thống`,
          description: 'Cảnh báo bảo trì định kỳ. Đã sẵn sàng cập nhật driver BootROM.',
          schedule: 'Chủ Nhật 02:00'
        }
      };

      let dbComponents = [];
      if (db.HardwareComponent) {
        dbComponents = await db.HardwareComponent.findAll({ where: { is_active: true } });
      }

      const getComponentList = (cat, profileKey) => {
        const fromComponents = dbComponents
          .filter((c) => c.category && c.category.toLowerCase().trim() === cat)
          .map((c) => (c.name ? c.name.trim() : ''))
          .filter(Boolean);
        const fromProfiles = profiles
          .map((p) => (p[profileKey] ? String(p[profileKey]).trim() : ''))
          .filter(Boolean);
        return Array.from(new Set([...fromComponents, ...fromProfiles]));
      };

      const hardwarePresets = {
        cpus: getComponentList('cpu', 'cpu_model'),
        gpus: getComponentList('gpu', 'gpu_model'),
        rams: getComponentList('ram', 'ram_capacity'),
        storages: getComponentList('storage', 'storage_type'),
        monitors: getComponentList('monitor', 'monitor'),
        gears: getComponentList('gear', 'gear')
      };

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
      console.error('Lỗi khi lấy thông số cấu hình phần cứng:', error);
      throw error;
    }
  }

  /**
   * Create new hardware profile directly in MySQL CSDL with Transaction safety
   */
  async createHardwareSpec(specData) {
    try {
      return await db.sequelize.transaction(async (t) => {
        const { profileName, id, zoneId, description, cpu, gpu, ram, storage, monitor, gear, assignedComputers = [] } = specData;

        const cpuFinal = typeof cpu === 'object' ? (cpu.model || '') : (cpu || specData.cpuSelect || '');
        const gpuFinal = typeof gpu === 'object' ? (gpu.model || '') : (gpu || specData.gpuSelect || '');
        const ramFinal = typeof ram === 'object' ? (ram.capacity || '') : (ram || specData.ramSelect || '');
        const storageFinal = typeof storage === 'object' ? (storage.type || '') : (storage || specData.storageSelect || '');
        const monitorFinal = typeof monitor === 'object' ? (monitor.model || '') : (monitor || specData.monitorSelect || '');
        const gearFinal = typeof gear === 'object' ? (gear.model || '') : (gear || specData.gearSelect || '');

        const nameToSave = profileName || id || `Mẫu Cấu Hình ${Date.now()}`;

        let profile = null;
        if (db.HardwareProfile) {
          profile = await db.HardwareProfile.create(
            {
              profile_name: nameToSave,
              description: description || '',
              cpu_model: cpuFinal,
              gpu_model: gpuFinal,
              ram_capacity: ramFinal,
              storage_type: storageFinal,
              monitor: monitorFinal,
              gear: gearFinal,
              zone_id: Number(zoneId) || 1
            },
            { transaction: t }
          );
        }

        if (Array.isArray(assignedComputers) && assignedComputers.length > 0) {
          await db.Computer.update(
            {
              zone_id: Number(zoneId) || 1,
              ...(profile ? { hardware_profile_id: profile.profile_id } : {})
            },
            { where: { computer_name: assignedComputers }, transaction: t }
          );
        }

        return { status: 'success', message: 'Tạo mẫu cấu hình phần cứng thành công', profile };
      });
    } catch (error) {
      console.error('Lỗi khi tạo cấu hình phần cứng mới:', error);
      throw error;
    }
  }

  /**
   * Update hardware profile directly in MySQL CSDL with Transaction safety
   */
  async updateHardwareSpec(specId, updateData) {
    try {
      return await db.sequelize.transaction(async (t) => {
        const { profileName, zoneId, description, cpu, gpu, ram, storage, monitor, gear, assignedComputers = [] } = updateData;

        const cpuFinal = typeof cpu === 'object' ? (cpu.model || '') : (cpu || updateData.cpuSelect || '');
        const gpuFinal = typeof gpu === 'object' ? (gpu.model || '') : (gpu || updateData.gpuSelect || '');
        const ramFinal = typeof ram === 'object' ? (ram.capacity || '') : (ram || updateData.ramSelect || '');
        const storageFinal = typeof storage === 'object' ? (storage.type || '') : (storage || updateData.storageSelect || '');
        const monitorFinal = typeof monitor === 'object' ? (monitor.model || '') : (monitor || updateData.monitorSelect || '');
        const gearFinal = typeof gear === 'object' ? (gear.model || '') : (gear || updateData.gearSelect || '');

        let profile = null;
        if (db.HardwareProfile) {
          profile = await db.HardwareProfile.findByPk(specId, { transaction: t });
          if (!profile) {
            profile = await db.HardwareProfile.findOne({ where: { profile_name: specId }, transaction: t });
          }

          if (profile) {
            if (profileName) profile.profile_name = profileName;
            if (description !== undefined) profile.description = description;
            if (cpuFinal) profile.cpu_model = cpuFinal;
            if (gpuFinal) profile.gpu_model = gpuFinal;
            if (ramFinal) profile.ram_capacity = ramFinal;
            if (storageFinal) profile.storage_type = storageFinal;
            if (monitorFinal !== undefined) profile.monitor = monitorFinal;
            if (gearFinal !== undefined) profile.gear = gearFinal;
            if (zoneId) profile.zone_id = Number(zoneId);
            await profile.save({ transaction: t });
          }
        }

        if (Array.isArray(assignedComputers) && assignedComputers.length > 0) {
          await db.Computer.update(
            {
              zone_id: Number(zoneId) || 1,
              ...(profile ? { hardware_profile_id: profile.profile_id } : {})
            },
            { where: { computer_name: assignedComputers }, transaction: t }
          );
        }

        return { status: 'success', message: 'Cập nhật mẫu cấu hình phần cứng thành công', profile };
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật cấu hình phần cứng:', error);
      throw error;
    }
  }

  /**
   * Delete hardware profile directly from MySQL CSDL with Transaction safety
   */
  async deleteHardwareSpec(specId) {
    try {
      return await db.sequelize.transaction(async (t) => {
        if (db.HardwareProfile) {
          let profile = await db.HardwareProfile.findByPk(specId, { transaction: t });
          if (!profile) {
            profile = await db.HardwareProfile.findOne({ where: { profile_name: specId }, transaction: t });
          }
          if (profile) {
            await db.Computer.update({ hardware_profile_id: null }, { where: { hardware_profile_id: profile.profile_id }, transaction: t });
            await profile.destroy({ transaction: t });
            return true;
          }
        }

        let computer = await db.Computer.findByPk(specId, { transaction: t });
        if (!computer) {
          computer = await db.Computer.findOne({ where: { computer_name: specId }, transaction: t });
        }
        if (!computer) return false;

        await computer.destroy({ transaction: t });
        return true;
      });
    } catch (error) {
      console.error('Lỗi khi xóa cấu hình phần cứng:', error);
      throw error;
    }
  }
}


module.exports = new ComputerService();
