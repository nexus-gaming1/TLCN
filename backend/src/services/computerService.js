const defaultDb = require('../models');
const { formatStationDTO } = require('../utils/stationFormatter');
const { ComputerStatus } = require('../constants/enums');

const HardwareProfileService = require('./hardwareProfileService');
const TelemetryService = require('./telemetryService');
const { SessionType } = require('../constants/enums');


class ComputerService {
  constructor(
    models = defaultDb,
    hardwareProfileService = new HardwareProfileService(models),
    telemetryService = new TelemetryService(models)
  ) {
    this.models = models;
    this.hardwareProfileService = hardwareProfileService;
    this.telemetryService = telemetryService;
  }

  /**
   * Fetch all computers with ComputerZone details & latest status logs
   * Optimized 2-query batching to eliminate Sequelize N+1 and subquery issues
   */
  async getAllComputers() {
    try {
      const db = this.models;
      const computers = await db.Computer.findAll({
        include: [
          {
            model: db.ComputerZone,
            include: [{ model: db.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }]
          }
        ],
        order: [['computer_id', 'ASC']]
      });

      // Avoid Sequelize N+1 limit subquery: Fetch latest logs in a single batch query
      const computerIds = computers.map((c) => c.computer_id);
      if (computerIds.length > 0 && db.ComputerStatusLog) {
        const recentLogs = await db.ComputerStatusLog.findAll({
          where: { computer_id: computerIds },
          order: [['recorded_at', 'DESC']],
          include: [
            {
              model: db.Member,
              include: [{ model: db.User, as: 'userInfo', attributes: ['username', 'full_name'] }]
            }
          ]
        });

        const latestLogMap = new Map();
        for (const log of recentLogs) {
          if (!latestLogMap.has(log.computer_id)) {
            latestLogMap.set(log.computer_id, log);
          }
        }

        // Attach ComputerStatusLogs directly without internal Sequelize row mutation
        for (const comp of computers) {
          const log = latestLogMap.get(comp.computer_id);
          comp.ComputerStatusLogs = log ? [log] : [];
        }
      }

      return computers;
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Fetch computer by ID
   */
  async getComputerById(computerId) {
    try {
      return await this.models.Computer.findByPk(computerId, {
        include: [
          { model: this.models.ComputerZone },
          { model: this.models.ComputerStatusLog, required: false, limit: 1, order: [['recorded_at', 'DESC']] }
        ]
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Create a new computer station with concurrency protection & atomic ID allocation
   */
  async createComputer(computerData) {
    try {
      const { computer_name, zone_id, status, ip_address, mac_address, is_remote_enabled } = computerData;
      const db = this.models;

      return await db.sequelize.transaction(async (t) => {
        // If computer_name, ip_address, mac_address are fully provided
        if (computer_name && ip_address && mac_address) {
          return await db.Computer.create({
            computer_name: computer_name.trim(),
            ip_address: ip_address.trim(),
            mac_address: mac_address.trim(),
            zone_id: Number(zone_id) || 1,
            status: status || ComputerStatus.OFFLINE,
            is_remote_enabled: Boolean(is_remote_enabled)
          }, { transaction: t });
        }

        // Auto-increment atomic creation to avoid race condition on computer_id / IP / MAC
        const tempName = computer_name ? computer_name.trim() : `PC-PENDING-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newComputer = await db.Computer.create({
          computer_name: tempName,
          ip_address: ip_address ? ip_address.trim() : null,
          mac_address: mac_address ? mac_address.trim() : null,
          zone_id: Number(zone_id) || 1,
          status: status || ComputerStatus.OFFLINE,
          is_remote_enabled: Boolean(is_remote_enabled)
        }, { transaction: t });

        const nextId = newComputer.computer_id;
        const hexId = (nextId * 3).toString(16).padStart(2, '0').toUpperCase();

        let updated = false;
        if (!computer_name) {
          newComputer.computer_name = `PC-${String(nextId).padStart(3, '0')}`;
          updated = true;
        }
        if (!ip_address) {
          const subnet = Math.floor(nextId / 250);
          const host = (nextId % 250) + 1;
          newComputer.ip_address = `192.168.${1 + subnet}.${host}`;
          updated = true;
        }
        if (!mac_address) {
          const octet4 = String(nextId % 100).padStart(2, '0');
          newComputer.mac_address = `F4:D4:88:5A:${octet4}:${hexId}`;
          updated = true;
        }

        if (updated) {
          await newComputer.save({ transaction: t });
        }

        return newComputer;
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Update computer status or zone
   */
  async updateComputer(computerId, updateData) {
    try {
      const db = this.models;
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
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Delete computer station
   */
  async deleteComputer(computerId) {
    try {
      const computer = await this.models.Computer.findByPk(computerId);
      if (!computer) return false;
      await computer.destroy();
      return true;
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Fetch all zones with pricing plans
   */
  async getAllZones() {
    try {
      return await this.models.ComputerZone.findAll({
        include: [{ model: this.models.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }]
      });
    } catch (error) {
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  /**
   * Fetch full Room Layout Grid grouped by Computer Zones with standardized Station DTOs
   * Open/Closed Principle (OCP): Dynamically summarizes statuses without hardcoded switch-cases.
   */
  async getRoomLayoutGrid() {
    try {
      const db = this.models;
      const [zones, computers] = await Promise.all([
        db.ComputerZone.findAll({
          include: [{ model: db.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }],
          order: [['zone_id', 'ASC']]
        }),
        this.getAllComputers()
      ]);

      const formattedStations = computers.map((comp) => formatStationDTO(comp));

      // Open/Closed Principle (OCP): Dynamically initialize summary counters from ComputerStatus enum values
      const summary = {
        total: formattedStations.length
      };
      for (const statusVal of Object.values(ComputerStatus)) {
        summary[statusVal.toLowerCase()] = 0;
      }

      for (const s of formattedStations) {
        const rawStatus = (s.rawStatus || s.status || '').toLowerCase();
        if (summary[rawStatus] !== undefined) {
          summary[rawStatus]++;
        } else {
          summary[rawStatus] = 1;
        }
      }

      // Group stations by zone
      const zoneGrids = zones.map((zone) => {
        const zoneStations = formattedStations.filter((s) => s.zone_id === zone.zone_id);
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
      if (!error.statusCode) error.statusCode = 500;
      throw error;
    }
  }

  // =========================================================================
  // Delegated Hardware Profile Methods (Single Responsibility Principle)
  // Maintains 100% backward compatibility for existing controllers and tests
  // =========================================================================

  async getHardwareSpecs() {
    return await this.hardwareProfileService.getHardwareSpecs();
  }

  async createHardwareSpec(specData) {
    return await this.hardwareProfileService.createHardwareSpec(specData);
  }

  async updateHardwareSpec(specId, updateData) {
    return await this.hardwareProfileService.updateHardwareSpec(specId, updateData);
  }

  async deleteHardwareSpec(specId) {
    return await this.hardwareProfileService.deleteHardwareSpec(specId);
  }
}

const computerServiceInstance = new ComputerService();
module.exports = computerServiceInstance;
module.exports.ComputerService = ComputerService;
