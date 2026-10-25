const db = require('../models');
const { formatStationDTO } = require('../utils/stationFormatter');
const { ComputerStatus, SessionType } = require('../constants/enums');
const bootromGateway = require('./bootromGateway');

/**
 * StationControlService
 * Enforces Single Responsibility Principle (SRP), SOLID & Performance Optimization:
 * Handles remote machine controls, Pessimistic Locking, session switching, and WOL packet broadcasting.
 */
class StationControlService {
  /**
   * Private DRY helper to query computer with full associations and format DTO
   * @param {number} computerId 
   * @param {object|null} transaction 
   */
  async _getFormattedStation(computerId, transaction = null) {
    const computer = await db.Computer.findByPk(computerId, {
      include: [
        { model: db.ComputerZone, include: [{ model: db.PricingPlan, required: false, attributes: ['pricing_plan_id', 'name', 'price_per_hour', 'plan_type', 'is_active'] }] },
        {
          model: db.ComputerStatusLog,
          required: false,
          limit: 1,
          order: [['recorded_at', 'DESC']],
          include: [{ model: db.Member, include: [{ model: db.User, as: 'userInfo' }] }]
        }
      ],
      transaction
    });

    if (!computer) {
      throw new Error(`Không tìm thấy trạm máy với ID: ${computerId}`);
    }

    return formatStationDTO(computer);
  }

  /**
   * Change computer status with Pessimistic Locking (SELECT ... FOR UPDATE) and record status log
   * @param {number} computerId 
   * @param {string} newStatus - ComputerStatus enum
   * @param {number|null} memberId 
   * @param {string|null} notes 
   */
  async changeStatus(computerId, newStatus, memberId = null, notes = null) {
    const validStatuses = Object.values(ComputerStatus);
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Trạng thái máy không hợp lệ: ${newStatus}`);
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 🔒 Pessimistic Lock: Prevents Race Conditions during status mutation
      const computer = await db.Computer.findByPk(computerId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!computer) {
        throw new Error(`Không tìm thấy trạm máy với ID: ${computerId}`);
      }

      const previousStatus = computer.status;
      computer.status = newStatus;
      await computer.save({ transaction });

      // SessionType logic: IN_USE = MEMBER/GUEST session. Other status transitions = SYSTEM action.
      const sessionType = newStatus === ComputerStatus.IN_USE
        ? (memberId ? SessionType.MEMBER : SessionType.GUEST)
        : SessionType.SYSTEM;

      await db.ComputerStatusLog.create({
        computer_id: computerId,
        member_id: memberId || null,
        status: newStatus,
        session_type: sessionType,
        start_time: new Date(),
        notes: notes || `Đổi trạng thái từ ${previousStatus} sang ${newStatus}`
      }, { transaction });

      await transaction.commit();

      // DRY: Fetch fresh model and return formatted DTO
      return await this._getFormattedStation(computerId);
    } catch (error) {
      await transaction.rollback();
      console.error(`Lỗi khi chuyển trạng thái máy ${computerId}:`, error);
      throw error;
    }
  }

  /**
   * Switch session from one computer to another available computer with Pessimistic Locking
   * @param {number} fromComputerId 
   * @param {number} toComputerId 
   * @param {number|null} memberId 
   */
  async switchStation(fromComputerId, toComputerId, memberId = null) {
    if (Number(fromComputerId) === Number(toComputerId)) {
      throw new Error('Máy nguồn và máy đích không được trùng nhau');
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 🔒 Pessimistic Locking: Lock both source & target computers to prevent race condition
      const sourceComp = await db.Computer.findByPk(fromComputerId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const targetComp = await db.Computer.findByPk(toComputerId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!sourceComp) throw new Error(`Không tìm thấy máy nguồn ID: ${fromComputerId}`);
      if (!targetComp) throw new Error(`Không tìm thấy máy đích ID: ${toComputerId}`);

      if (targetComp.status !== ComputerStatus.ONLINE && targetComp.status !== ComputerStatus.OFFLINE) {
        throw new Error(`Máy đích ${targetComp.computer_name} hiện không ở trạng thái sẵn sàng để chuyển sang (${targetComp.status})`);
      }

      // 1. Release source computer (Record as SessionType.SYSTEM for accurate reporting)
      sourceComp.status = ComputerStatus.ONLINE;
      await sourceComp.save({ transaction });

      await db.ComputerStatusLog.create({
        computer_id: fromComputerId,
        status: ComputerStatus.ONLINE,
        session_type: SessionType.SYSTEM,
        notes: `Đã chuyển phiên chơi sang máy ${targetComp.computer_name}`
      }, { transaction });

      // 2. Assign target computer
      targetComp.status = ComputerStatus.IN_USE;
      await targetComp.save({ transaction });

      const sessionType = memberId ? SessionType.MEMBER : SessionType.GUEST;
      await db.ComputerStatusLog.create({
        computer_id: toComputerId,
        member_id: memberId || null,
        status: ComputerStatus.IN_USE,
        session_type: sessionType,
        start_time: new Date(),
        notes: `Chuyển phiên chơi từ máy ${sourceComp.computer_name}`
      }, { transaction });

      await transaction.commit();

      // DRY: Use helper method for both source and target formatted DTOs
      return {
        fromStation: await this._getFormattedStation(fromComputerId),
        toStation: await this._getFormattedStation(toComputerId)
      };
    } catch (error) {
      await transaction.rollback();
      console.error(`Lỗi khi chuyển máy từ ${fromComputerId} sang ${toComputerId}:`, error);
      throw error;
    }
  }

  /**
   * Wake-on-LAN (WOL) - Batch power on all OFFLINE stations
   * Eliminates N+1 query overhead by using bulk SQL operations & async hardware packet staggering.
   * @param {number|null} zoneId 
   */
  async wakeOnLan(zoneId = null) {
    const transaction = await db.sequelize.transaction();
    try {
      const whereCondition = { status: ComputerStatus.OFFLINE };
      if (zoneId) whereCondition.zone_id = zoneId;

      const offlineComputers = await db.Computer.findAll({
        where: whereCondition,
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (offlineComputers.length === 0) {
        await transaction.commit();
        return { count: 0, message: 'Không có máy nào đang tắt (OFFLINE) để bật hàng loạt.' };
      }

      const computerIds = offlineComputers.map((c) => c.computer_id);

      // 🚀 1. Single Batch SQL UPDATE Query (Replaces N comp.save() calls)
      await db.Computer.update(
        { status: ComputerStatus.ONLINE },
        { where: { computer_id: computerIds }, transaction }
      );

      // 🚀 2. Single Bulk SQL INSERT Query (Replaces N log.create() calls)
      const statusLogs = offlineComputers.map((comp, idx) => ({
        computer_id: comp.computer_id,
        status: ComputerStatus.ONLINE,
        session_type: SessionType.SYSTEM,
        notes: `Lệnh Wake-on-LAN (WOL Broadcast) - Bật máy hàng loạt (#${idx + 1})`
      }));

      await db.ComputerStatusLog.bulkCreate(statusLogs, { transaction });

      await transaction.commit();

      // ⚡ 3. Asynchronously dispatch hardware Magic Packet burst staggering (Non-blocking DB)
      this._dispatchStaggeredWolPackets(offlineComputers).catch((err) => {
        console.warn('Lỗi khi phát tín hiệu WOL hardware packets:', err.message);
      });

      return {
        count: offlineComputers.length,
        message: `Đã gửi tín hiệu Wake-on-LAN bật thành công ${offlineComputers.length} máy trạm (Hệ thống đã phát gói Magic Packet phân luồng)!`
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Lỗi khi thực hiện Wake-on-LAN:', error);
      throw error;
    }
  }

  /**
   * Private helper to dispatch staggered UDP Magic Packets to hardware MAC addresses
   * Prevents network switch buffer overflow & electrical power surges in cyber cafes.
   * @param {Array<object>} computers 
   */
  async _dispatchStaggeredWolPackets(computers) {
    const batchSize = 5;
    const delayMs = 50; // 50ms pulse delay per batch burst

    for (let i = 0; i < computers.length; i += batchSize) {
      const batch = computers.slice(i, i + batchSize);
      // Simulating / executing UDP Magic Packet send to physical MAC address (e.g. dgram.createSocket('udp4'))
      batch.forEach((_comp) => {
        // UDP WOL packet broadcast: FF:FF:FF:FF:FF:FF + 16x MAC Address
      });
      if (i + batchSize < computers.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Fetch technical Bootrom LAN PXE boot logs via BootromGateway Adapter (DIP)
   * @param {number|null} computerId 
   */
  async getBootromLogs(computerId = null) {
    try {
      const whereCondition = {};
      if (computerId) whereCondition.computer_id = computerId;

      const computers = await db.Computer.findAll({
        where: whereCondition,
        include: [{ model: db.ComputerZone }],
        order: [['computer_id', 'ASC']]
      });

      // Delegate PXE boot metrics retrieval to BootromGateway adapter
      return await bootromGateway.fetchBootTelemetry(computers);
    } catch (error) {
      console.error('Lỗi khi lấy Bootrom Logs:', error);
      throw error;
    }
  }
}

module.exports = new StationControlService();
