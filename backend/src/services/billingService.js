const db = require('../models');
const { Op } = require('sequelize');
const { ComboTimeStatus, ComputerStatus } = require('../constants/enums');
const computerSocketService = require('./computerSocketService');

const RentalSession = db.RentalSession;
const { Status, BillingMode } = RentalSession;

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

class BillingService {
  async findPricingPlan(computer, at = new Date()) {
    const zone = computer.ComputerZone || await db.ComputerZone.findByPk(computer.zone_id);
    if (!zone) throw new Error(`Không tìm thấy khu vực của máy ${computer.computer_id}`);

    const plans = await zone.getPricingPlans({
      where: { is_active: true },
      order: [['priority', 'DESC'], ['pricing_plan_id', 'ASC']]
    });
    const time = at.toTimeString().slice(0, 8);
    const date = at.toISOString().slice(0, 10);
    const applicable = plans.filter((plan) => {
      if (!plan.isApplicable('LOCAL', time, zone.zone_id)) return false;
      return !plan.apply_date || String(plan.apply_date).slice(0, 10) === date;
    });
    return applicable[0] || null;
  }

  async getActiveCombo(memberId, computer, transaction = null, at = new Date()) {
    const combos = await db.ComboTime.findAll({
      include: [{
        model: db.ServiceOrder,
        as: 'serviceOrder',
        where: { used_by: memberId, payment_status: 'PAID' }
      }],
      where: {
        status: ComboTimeStatus.ACTIVE,
        end_time: { [Op.gt]: at }
      },
      order: [['combo_time_id', 'DESC']],
      transaction
    });
    const tier = computer.ComputerZone?.tier_level || 1;
    return combos.find((combo) => !combo.allowed_tier || tier <= Number(combo.allowed_tier)) || null;
  }

  async authorizeLogin({ username, computerId }) {
    const transaction = await db.sequelize.transaction();
    try {
      const computer = await db.Computer.findByPk(computerId, {
        include: [{ model: db.ComputerZone }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!computer) {
        await transaction.rollback();
        return { allowed: false, code: 'MACHINE_NOT_FOUND', message: 'Không tìm thấy máy trạm.' };
      }
      if ([ComputerStatus.IN_USE, ComputerStatus.MAINTENANCE].includes(computer.status)) {
        await transaction.rollback();
        return { allowed: false, code: 'MACHINE_UNAVAILABLE', message: 'Máy trạm hiện không khả dụng.' };
      }

      const user = await db.User.findOne({
        where: { username },
        include: [{ model: db.Member, as: 'memberProfile' }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const member = user?.memberProfile;
      if (!member) {
        await transaction.rollback();
        return { allowed: false, code: 'MEMBER_REQUIRED', message: 'Tài khoản chưa có hồ sơ hội viên.' };
      }
      const existingSession = await RentalSession.findOne({
        where: { member_id: member.member_id, status: Status.ACTIVE },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (existingSession) {
        await transaction.rollback();
        return { allowed: false, code: 'MEMBER_ALREADY_IN_USE', message: 'Hội viên đang có một phiên sử dụng máy khác.' };
      }

      const combo = await this.getActiveCombo(member.member_id, computer, transaction);
      if (combo) {
        await transaction.commit();
        return { allowed: true, memberId: member.member_id, combo, computer };
      }

      const plan = await this.findPricingPlan(computer);
      if (!plan) {
        await transaction.rollback();
        return { allowed: false, code: 'PRICING_PLAN_NOT_FOUND', message: 'Không tìm thấy bảng giá áp dụng.' };
      }
      const minutePrice = money(Number(plan.price_per_hour) / 60);
      const balance = Number(member.bonus_balance || 0) + Number(member.real_balance || 0);
      await transaction.commit();
      if (balance < minutePrice) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_BALANCE',
          message: 'Số dư không đủ để sử dụng máy. Vui lòng nạp thêm tiền hoặc mua Combo.'
        };
      }
      return { allowed: true, memberId: member.member_id, combo: null, computer, plan };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async startSession({ memberId, computerId, combo = null, startedAt = new Date() }) {
    const existing = await RentalSession.findOne({
      where: { computer_id: computerId, status: Status.ACTIVE }
    });
    if (existing) return existing;
    return RentalSession.create({
      member_id: memberId,
      computer_id: computerId,
      combo_time_id: combo?.combo_time_id || null,
      billing_mode: combo ? BillingMode.COMBO : BillingMode.PAY_AS_YOU_GO,
      status: Status.ACTIVE,
      started_at: startedAt,
      last_billed_at: startedAt
    });
  }

  async endSession(session, status = Status.ENDED, endedAt = new Date(), transaction = null) {
    session.status = status;
    session.ended_at = endedAt;
    await session.save(transaction ? { transaction } : undefined);
    return session;
  }

  async billSession(sessionId, now = new Date()) {
    const transaction = await db.sequelize.transaction();
    let shouldLogout = false;
    let computer = null;
    try {
      const session = await RentalSession.findByPk(sessionId, {
        include: [{ model: db.Computer, as: 'computer', include: [{ model: db.ComputerZone }] }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!session || session.status !== Status.ACTIVE) {
        await transaction.rollback();
        return { charged: 0, ended: false };
      }

      const member = await db.Member.findByPk(session.member_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      computer = session.computer;
      let cursor = new Date(session.last_billed_at);
      let charged = 0;
      while (cursor.getTime() + 60000 <= now.getTime()) {
        const nextMinute = new Date(cursor.getTime() + 60000);
        const combo = await this.getActiveCombo(member.member_id, computer, transaction, nextMinute);
        if (combo) {
          session.combo_time_id = combo.combo_time_id;
          session.billing_mode = BillingMode.COMBO;
          cursor = new Date(cursor.getTime() + 60000);
          continue;
        }

        const plan = await this.findPricingPlan(computer, new Date(cursor.getTime() + 60000));
        if (!plan) throw new Error(`Không tìm thấy bảng giá cho máy ${computer.computer_id}`);
        const minutePrice = money(Number(plan.price_per_hour) / 60);
        const bonus = Number(member.bonus_balance || 0);
        const real = Number(member.real_balance || 0);
        if (bonus + real < minutePrice) {
          session.billing_mode = BillingMode.PAY_AS_YOU_GO;
          session.last_billed_at = cursor;
          await this.endSession(session, Status.INSUFFICIENT_BALANCE, now, transaction);
          shouldLogout = true;
          break;
        }

        const fromBonus = Math.min(bonus, minutePrice);
        member.bonus_balance = money(bonus - fromBonus);
        member.real_balance = money(real - (minutePrice - fromBonus));
        session.billing_mode = BillingMode.PAY_AS_YOU_GO;
        session.combo_time_id = null;
        session.total_amount = money(Number(session.total_amount) + minutePrice);
        charged = money(charged + minutePrice);
        cursor = new Date(cursor.getTime() + 60000);
      }

      if (!shouldLogout) session.last_billed_at = cursor;
      await member.save({ transaction });
      await session.save({ transaction });
      await transaction.commit();

      if (shouldLogout && computer) {
        try {
          computerSocketService.logout(computer.computer_name);
          computer.status = ComputerStatus.ONLINE;
          await computer.save();
        } catch (error) {
          console.warn(`[Billing] Không thể khóa máy ${computer.computer_name}:`, error.message);
        }
      }
      return { charged, ended: shouldLogout, session };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async billActiveSessions() {
    const sessions = await RentalSession.findAll({ where: { status: Status.ACTIVE }, attributes: ['rental_session_id'] });
    for (const session of sessions) {
      await this.billSession(session.rental_session_id);
    }
    return sessions.length;
  }
}

module.exports = new BillingService();
