const defaultDb = require('../models');
const { formatStationDTO } = require('../utils/stationFormatter');
const { ComputerStatus } = require('../constants/enums');

const HardwareProfileService = require('./hardwareProfileService');
const TelemetryService = require('./telemetryService');
const { SessionType } = require('../constants/enums');
const { Op } = require('sequelize');

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

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
   * Fetch the current usage information used by the control panel.
   * The active session is joined through Member.userInfo so an employee
   * who processed an order is never reported as the logged-in member.
   */
  async getComputerOverview() {
    try {
      const now = new Date();
      const db = this.models;
      const computers = await db.Computer.findAll({
        attributes: ['computer_id', 'computer_name', 'ip_address', 'mac_address', 'status'],
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
          ipAddress: computer.ip_address,
          macAddress: computer.mac_address,
          status: computer.status,
          memberId: session?.member_id || null,
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

      // Validate IP format if provided
      if (ip_address && !IPV4_REGEX.test(ip_address.trim())) {
        const err = new Error('Địa chỉ IP không đúng định dạng IPv4 hợp lệ');
        err.statusCode = 400;
        throw err;
      }

      // Validate MAC format if provided
      if (mac_address && !MAC_REGEX.test(mac_address.trim())) {
        const err = new Error('Địa chỉ MAC không đúng định dạng PXE hợp lệ');
        err.statusCode = 400;
        throw err;
      }

      // Validate zone exists if provided
      if (zone_id) {
        const zoneExists = await db.ComputerZone.findByPk(Number(zone_id));
        if (!zoneExists) {
          const err = new Error('Phân khu máy trạm không tồn tại');
          err.statusCode = 400;
          throw err;
        }
      }

      // Check duplicate computer_name
      if (computer_name && computer_name.trim()) {
        const existingName = await db.Computer.findOne({
          where: { computer_name: computer_name.trim() }
        });
        if (existingName) {
          const err = new Error(`Tên máy trạm '${computer_name.trim()}' đã tồn tại trên hệ thống`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Check duplicate IP
      if (ip_address && ip_address.trim()) {
        const existingIp = await db.Computer.findOne({
          where: { ip_address: ip_address.trim() }
        });
        if (existingIp) {
          const err = new Error(`Địa chỉ IP '${ip_address.trim()}' đã được gán cho máy khác`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Check duplicate MAC
      if (mac_address && mac_address.trim()) {
        const existingMac = await db.Computer.findOne({
          where: { mac_address: mac_address.trim() }
        });
        if (existingMac) {
          const err = new Error(`Địa chỉ MAC '${mac_address.trim()}' đã được gán cho máy khác`);
          err.statusCode = 400;
          throw err;
        }
      }

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

      // Validate zone if changing
      if (updateData.zone_id) {
        const zoneExists = await db.ComputerZone.findByPk(Number(updateData.zone_id));
        if (!zoneExists) {
          const err = new Error('Phân khu máy trạm không tồn tại');
          err.statusCode = 400;
          throw err;
        }
        computer.zone_id = Number(updateData.zone_id);
      }

      // Validate name uniqueness
      if (updateData.computer_name && updateData.computer_name.trim() !== computer.computer_name) {
        const existingName = await db.Computer.findOne({
          where: {
            computer_name: updateData.computer_name.trim(),
            computer_id: { [Op.ne]: computerId }
          }
        });
        if (existingName) {
          const err = new Error(`Tên máy trạm '${updateData.computer_name.trim()}' đã tồn tại`);
          err.statusCode = 400;
          throw err;
        }
        computer.computer_name = updateData.computer_name.trim();
      }

      // Validate IP format & uniqueness
      if (updateData.ip_address !== undefined && updateData.ip_address !== null) {
        const trimmedIp = String(updateData.ip_address).trim();
        if (trimmedIp && !IPV4_REGEX.test(trimmedIp)) {
          const err = new Error('Địa chỉ IP không đúng định dạng IPv4 hợp lệ');
          err.statusCode = 400;
          throw err;
        }
        if (trimmedIp && trimmedIp !== computer.ip_address) {
          const existingIp = await db.Computer.findOne({
            where: {
              ip_address: trimmedIp,
              computer_id: { [Op.ne]: computerId }
            }
          });
          if (existingIp) {
            const err = new Error(`Địa chỉ IP '${trimmedIp}' đã được gán cho máy khác`);
            err.statusCode = 400;
            throw err;
          }
        }
        computer.ip_address = trimmedIp || null;
      }

      // Validate MAC format & uniqueness
      if (updateData.mac_address !== undefined && updateData.mac_address !== null) {
        const trimmedMac = String(updateData.mac_address).trim();
        if (trimmedMac && !MAC_REGEX.test(trimmedMac)) {
          const err = new Error('Địa chỉ MAC không đúng định dạng PXE hợp lệ');
          err.statusCode = 400;
          throw err;
        }
        if (trimmedMac && trimmedMac !== computer.mac_address) {
          const existingMac = await db.Computer.findOne({
            where: {
              mac_address: trimmedMac,
              computer_id: { [Op.ne]: computerId }
            }
          });
          if (existingMac) {
            const err = new Error(`Địa chỉ MAC '${trimmedMac}' đã được gán cho máy khác`);
            err.statusCode = 400;
            throw err;
          }
        }
        computer.mac_address = trimmedMac || null;
      }

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

      if (updateData.is_remote_enabled !== undefined) {
        computer.is_remote_enabled = Boolean(updateData.is_remote_enabled);
      }

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

      if (computer.status === ComputerStatus.IN_USE || computer.status === ComputerStatus.REMOTE) {
        const error = new Error('Không thể xóa máy trạm đang có phiên sử dụng');
        error.statusCode = 400;
        throw error;
      }

      // Delete associated status logs to maintain database integrity
      if (this.models.ComputerStatusLog) {
        await this.models.ComputerStatusLog.destroy({ where: { computer_id: computerId } });
      }

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
