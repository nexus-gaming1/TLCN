const db = require('../models');
const { Op } = require('sequelize');
const {
  ComboTimeStatus,
  ComputerStatus,
  SessionType,
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionCategory,
  TransactionStatusEnum
} = require('../constants/enums');
const machineStore = require('../stores/machineStore');
const computerSocketService = require('./computerSocketService');

class ComboTimeService {
  /**
   * 1. Get all Combo Packages
   */
  async getAllPackages({ includeInactive = false } = {}) {
    const where = {};
    if (!includeInactive) {
      where.is_active = true;
    }
    return await db.ComboPackage.findAll({
      where,
      include: [
        {
          model: db.ComboItem,
          as: 'comboItems',
          include: [{ model: db.ServiceItem, as: 'serviceItem' }]
        }
      ],
      order: [['price', 'ASC']]
    });
  }

  /**
   * 2. Get Combo Package by ID
   */
  async getPackageById(comboId) {
    const pkg = await db.ComboPackage.findByPk(comboId, {
      include: [
        {
          model: db.ComboItem,
          as: 'comboItems',
          include: [{ model: db.ServiceItem, as: 'serviceItem' }]
        }
      ]
    });
    if (!pkg) {
      const err = new Error(`Không tìm thấy gói Combo với ID: ${comboId}`);
      err.statusCode = 404;
      throw err;
    }
    return pkg;
  }

  /**
   * 3. Create Combo Package
   */
  async createPackage(data) {
    const {
      name,
      description,
      price,
      duration_minutes,
      start_time_limit,
      end_time_limit,
      allowed_tier = 1,
      is_active = true,
      items = []
    } = data;

    if (!name || !name.trim()) {
      const err = new Error('Tên gói combo không được để trống');
      err.statusCode = 400;
      throw err;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      const err = new Error('Giá gói combo phải là số không âm');
      err.statusCode = 400;
      throw err;
    }

    const parsedDuration = parseInt(duration_minutes, 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      const err = new Error('Thời lượng combo phải lớn hơn 0 phút');
      err.statusCode = 400;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      const pkg = await db.ComboPackage.create({
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parsedPrice,
        duration_minutes: parsedDuration,
        start_time_limit: start_time_limit || null,
        end_time_limit: end_time_limit || null,
        allowed_tier: allowed_tier ? parseInt(allowed_tier, 10) : 1,
        is_active: is_active !== false
      }, { transaction });

      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const serviceItemId = item.service_item_id;
          const qty = parseInt(item.quantity, 10) || 1;
          if (qty < 1) continue;

          const sItem = await db.ServiceItem.findByPk(serviceItemId, { transaction });
          if (!sItem) {
            throw new Error(`Không tìm thấy dịch vụ với ID: ${serviceItemId}`);
          }

          await db.ComboItem.create({
            combo_id: pkg.combo_id,
            service_item_id: serviceItemId,
            quantity: qty
          }, { transaction });
        }
      }

      await transaction.commit();
      return await this.getPackageById(pkg.combo_id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 4. Update Combo Package
   */
  async updatePackage(comboId, data) {
    const pkg = await db.ComboPackage.findByPk(comboId);
    if (!pkg) {
      const err = new Error(`Không tìm thấy gói Combo với ID: ${comboId}`);
      err.statusCode = 404;
      throw err;
    }

    const {
      name,
      description,
      price,
      duration_minutes,
      start_time_limit,
      end_time_limit,
      allowed_tier,
      is_active,
      items
    } = data;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        const err = new Error('Tên gói combo không được để trống');
        err.statusCode = 400;
        throw err;
      }
      pkg.name = name.trim();
    }

    if (price !== undefined) {
      const p = parseFloat(price);
      if (isNaN(p) || p < 0) {
        const err = new Error('Giá gói combo phải là số không âm');
        err.statusCode = 400;
        throw err;
      }
      pkg.price = p;
    }

    if (duration_minutes !== undefined) {
      const d = parseInt(duration_minutes, 10);
      if (isNaN(d) || d <= 0) {
        const err = new Error('Thời lượng combo phải lớn hơn 0 phút');
        err.statusCode = 400;
        throw err;
      }
      pkg.duration_minutes = d;
    }

    if (description !== undefined) pkg.description = description ? description.trim() : null;
    if (start_time_limit !== undefined) pkg.start_time_limit = start_time_limit || null;
    if (end_time_limit !== undefined) pkg.end_time_limit = end_time_limit || null;
    if (allowed_tier !== undefined) pkg.allowed_tier = parseInt(allowed_tier, 10) || 1;
    if (is_active !== undefined) pkg.is_active = Boolean(is_active);

    const transaction = await db.sequelize.transaction();
    try {
      await pkg.save({ transaction });

      if (Array.isArray(items)) {
        await db.ComboItem.destroy({ where: { combo_id: comboId }, transaction });
        for (const item of items) {
          const qty = parseInt(item.quantity, 10) || 1;
          if (qty < 1) continue;
          await db.ComboItem.create({
            combo_id: comboId,
            service_item_id: item.service_item_id,
            quantity: qty
          }, { transaction });
        }
      }

      await transaction.commit();
      return await this.getPackageById(comboId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 5. Toggle Combo Package Status
   */
  async togglePackageStatus(comboId, isActive) {
    const pkg = await db.ComboPackage.findByPk(comboId);
    if (!pkg) {
      const err = new Error(`Không tìm thấy gói Combo với ID: ${comboId}`);
      err.statusCode = 404;
      throw err;
    }
    pkg.is_active = Boolean(isActive);
    await pkg.save();
    return pkg;
  }

  /**
   * 6. Delete Combo Package (Prevent hard delete if historical usage exists)
   */
  async deletePackage(comboId) {
    const pkg = await db.ComboPackage.findByPk(comboId);
    if (!pkg) {
      const err = new Error(`Không tìm thấy gói Combo với ID: ${comboId}`);
      err.statusCode = 404;
      throw err;
    }

    // Check purchase history
    const orderCount = await db.ServiceOrder.count({ where: { combo_id: comboId } });
    const comboTimeCount = await db.ComboTime.count({ where: { combo_id: comboId } });

    if (orderCount > 0 || comboTimeCount > 0) {
      const err = new Error('Không thể xóa vĩnh viễn combo đã có lịch sử giao dịch. Vui lòng tắt kích hoạt (ngừng kinh doanh) thay thế.');
      err.statusCode = 400;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      await db.ComboItem.destroy({ where: { combo_id: comboId }, transaction });
      await pkg.destroy({ transaction });
      await transaction.commit();
      return { success: true, message: 'Đã xóa gói combo thành công' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 7. Add or update items inside combo
   */
  async setComboItems(comboId, items = []) {
    const pkg = await db.ComboPackage.findByPk(comboId);
    if (!pkg) {
      const err = new Error(`Không tìm thấy gói Combo với ID: ${comboId}`);
      err.statusCode = 404;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      await db.ComboItem.destroy({ where: { combo_id: comboId }, transaction });
      for (const item of items) {
        const qty = parseInt(item.quantity, 10) || 1;
        if (qty < 1) continue;
        const sItem = await db.ServiceItem.findByPk(item.service_item_id, { transaction });
        if (!sItem) {
          throw new Error(`Món dịch vụ ID ${item.service_item_id} không tồn tại`);
        }
        await db.ComboItem.create({
          combo_id: comboId,
          service_item_id: item.service_item_id,
          quantity: qty
        }, { transaction });
      }
      await transaction.commit();
      return await this.getPackageById(comboId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 8. Purchase Combo Time for a Member
   * Thời gian đếm ngay khi mua. Hỗ trợ kích hoạt trực tiếp nếu có computerId hoặc gán máy sau.
   */
  async purchaseCombo({ memberId, comboId, paymentMethod = 'WALLET', computerId = null, staffUserId = null }) {
    if (!memberId) {
      const err = new Error('Mã hội viên (memberId) là bắt buộc. Khách vãng lai không được mua Combo Time.');
      err.statusCode = 400;
      throw err;
    }

    const member = await db.Member.findByPk(memberId, {
      include: [{ model: db.User, as: 'userInfo' }]
    });

    if (!member) {
      const err = new Error(`Không tìm thấy tài khoản hội viên với ID: ${memberId}`);
      err.statusCode = 404;
      throw err;
    }

    if (member.userInfo && member.userInfo.status !== 'ACTIVE') {
      const err = new Error(`Tài khoản hội viên đang ở trạng thái ${member.userInfo.status}, không được phép mua dịch vụ.`);
      err.statusCode = 403;
      throw err;
    }

    const comboPackage = await db.ComboPackage.findByPk(comboId, {
      include: [
        {
          model: db.ComboItem,
          as: 'comboItems',
          include: [{ model: db.ServiceItem, as: 'serviceItem' }]
        }
      ]
    });

    if (!comboPackage) {
      const err = new Error(`Không tìm thấy gói Combo với ID: ${comboId}`);
      err.statusCode = 404;
      throw err;
    }

    if (!comboPackage.is_active) {
      const err = new Error('Gói Combo này hiện đã ngừng kinh doanh.');
      err.statusCode = 400;
      throw err;
    }

    if (!comboPackage.isTimeValid(new Date())) {
      const err = new Error(`Gói Combo chỉ được phép mua trong khung giờ: ${comboPackage.start_time_limit || '00:00'} - ${comboPackage.end_time_limit || '23:59'}`);
      err.statusCode = 400;
      throw err;
    }

    // ACID Transaction for Purchase Flow
    const transaction = await db.sequelize.transaction();
    try {
      // 🔒 Lock member record
      const lockedMember = await db.Member.findByPk(memberId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const comboPrice = parseFloat(comboPackage.price);

      // Handle payment deduction
      if (paymentMethod === 'WALLET') {
        const totalBalance = parseFloat(lockedMember.real_balance || 0);
        if (totalBalance < comboPrice) {
          const err = new Error(`Số dư tài khoản (${totalBalance.toLocaleString('vi-VN')}đ) không đủ để thanh toán gói combo (${comboPrice.toLocaleString('vi-VN')}đ).`);
          err.statusCode = 400;
          throw err;
        }

        let remaining = comboPrice;
        const realBal = parseFloat(lockedMember.real_balance || 0);
        if (realBal >= remaining) {
          lockedMember.real_balance = realBal - remaining;
          remaining = 0;
        } else {
          remaining -= realBal;
          lockedMember.real_balance = 0;
          lockedMember.bonus_balance = Math.max(0, parseFloat(lockedMember.bonus_balance || 0) - remaining);
        }
        await lockedMember.save({ transaction });
      }

      // Validate computer if computerId is passed
      let targetComputer = null;
      if (computerId) {
        targetComputer = await db.Computer.findByPk(computerId, {
          include: [{ model: db.ComputerZone }],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!targetComputer) {
          const err = new Error(`Không tìm thấy máy trạm với ID: ${computerId}`);
          err.statusCode = 404;
          throw err;
        }
        if (targetComputer.status === ComputerStatus.IN_USE) {
          const err = new Error(`Máy trạm ${targetComputer.computer_name} hiện đang có người sử dụng.`);
          err.statusCode = 400;
          throw err;
        }
        if (targetComputer.status === ComputerStatus.MAINTENANCE) {
          const err = new Error(`Máy trạm ${targetComputer.computer_name} hiện đang bảo trì.`);
          err.statusCode = 400;
          throw err;
        }
        const targetZoneTier = targetComputer.ComputerZone ? targetComputer.ComputerZone.tier_level : 1;
        if (comboPackage.allowed_tier && Number(targetZoneTier) > Number(comboPackage.allowed_tier)) {
          const err = new Error(
            `Máy trạm ${targetComputer.computer_name} thuộc phân khu ${targetComputer.ComputerZone?.zone_name || ''} (Cấp độ ${targetZoneTier}), ` +
            `vượt quá cấp độ cho phép của Combo này (Cấp tối đa: ${comboPackage.allowed_tier}).`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // Check for ACTIVE ComboTime for this member
      const activeCombo = await db.ComboTime.findOne({
        include: [{
          model: db.ServiceOrder,
          as: 'serviceOrder',
          where: { used_by: memberId }
        }],
        where: {
          status: ComboTimeStatus.ACTIVE,
          end_time: { [Op.gt]: new Date() }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      // 1. Create ServiceOrder
      const serviceOrder = await db.ServiceOrder.create({
        used_by: memberId,
        processed_by: staffUserId || null,
        status: OrderStatus.COMPLETED,
        payment_status: PaymentStatus.PAID,
        combo_id: comboPackage.combo_id,
        total_amount: comboPrice
      }, { transaction });

      // 2. Add included services as ServiceOrderItems (price: 0, is_combo_item: true)
      if (comboPackage.comboItems && comboPackage.comboItems.length > 0) {
        for (const cItem of comboPackage.comboItems) {
          const itemName = cItem.serviceItem ? cItem.serviceItem.name : `Dịch vụ #${cItem.service_item_id}`;
          await db.ServiceOrderItem.create({
            order_id: serviceOrder.order_id,
            service_item_id: cItem.service_item_id,
            quantity: cItem.quantity || 1,
            item_name: itemName,
            price: 0.00,
            is_combo_item: true
          }, { transaction });
        }
      }

      // 3. Record FinancialTransaction
      const txnCode = `CMB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const finTxn = await db.FinancialTransaction.create({
        txn_code: txnCode,
        type: TransactionType.INCOME,
        category: TransactionCategory.COMBO_PURCHASE,
        amount: comboPrice,
        payment_method: paymentMethod,
        status: TransactionStatusEnum.COMPLETED,
        description: `Mua gói combo: ${comboPackage.name} (${comboPackage.duration_minutes} phút)`,
        used_by: memberId,
        processed_by: staffUserId || null,
        order_id: serviceOrder.order_id,
        created_at: new Date()
      }, { transaction });

      let resultComboTime = null;

      if (activeCombo) {
        // --- Extension Flow (Rule 2.4) ---
        // newExpiresAt = currentExpiresAt + purchasedDurationMinutes
        const currentEnd = new Date(activeCombo.end_time);
        const addMs = comboPackage.duration_minutes * 60 * 1000;
        activeCombo.end_time = new Date(currentEnd.getTime() + addMs);
        activeCombo.duration_minutes = (activeCombo.duration_minutes || 0) + comboPackage.duration_minutes;
        await activeCombo.save({ transaction });
        resultComboTime = activeCombo;
      } else {
        // --- Fresh Purchase Flow ---
        // Thời gian đếm ngay khi mua: startedAt = now, expiresAt = startedAt + duration
        const now = new Date();
        const durationMin = comboPackage.duration_minutes || 60;
        const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000);

        resultComboTime = await db.ComboTime.create({
          order_id: serviceOrder.order_id,
          combo_id: comboPackage.combo_id,
          allowed_tier: comboPackage.allowed_tier,
          duration_minutes: durationMin,
          status: ComboTimeStatus.ACTIVE,
          start_time: now,
          end_time: expiresAt,
          computer_id: targetComputer ? targetComputer.computer_id : null
        }, { transaction });

        if (targetComputer) {
          targetComputer.status = ComputerStatus.IN_USE;
          await targetComputer.save({ transaction });

          await db.ComputerStatusLog.create({
            computer_id: targetComputer.computer_id,
            member_id: memberId,
            status: ComputerStatus.IN_USE,
            session_type: SessionType.MEMBER,
            start_time: now,
            notes: `Kích hoạt Combo Time: ${comboPackage.name} (#${resultComboTime.combo_time_id})`
          }, { transaction });
        }
      }

      await transaction.commit();

      if (targetComputer) {
        const username = lockedMember.userInfo ? lockedMember.userInfo.username : 'Member';
        try {
          computerSocketService.login(targetComputer.computer_name, username);
        } catch (sockErr) {
          console.warn(`[Socket Warning] NetClient login signal skipped for ${targetComputer.computer_name}:`, sockErr.message);
        }
      }

      return {
        isExtension: Boolean(activeCombo),
        comboTime: resultComboTime,
        order: serviceOrder,
        transaction: finTxn,
        package: comboPackage
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 9. Activate Session on a Computer Station (Rule 2.1 & 2.2)
   */
  async activateSession({ comboTimeId, memberId, computerId }) {
    if (!comboTimeId || !computerId) {
      const err = new Error('Thiếu thông tin kích hoạt (comboTimeId và computerId là bắt buộc)');
      err.statusCode = 400;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 🔒 Pessimistic Lock on ComboTime
      const comboTime = await db.ComboTime.findByPk(comboTimeId, {
        include: [
          { model: db.ServiceOrder, as: 'serviceOrder' },
          { model: db.ComboPackage, as: 'comboPackage' }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!comboTime) {
        const err = new Error(`Không tìm thấy phiên ComboTime với ID: ${comboTimeId}`);
        err.statusCode = 404;
        throw err;
      }

      // Verify payment
      if (!comboTime.serviceOrder || comboTime.serviceOrder.payment_status !== PaymentStatus.PAID) {
        const err = new Error('Combo chưa thanh toán không được kích hoạt.');
        err.statusCode = 400;
        throw err;
      }

      // Verify ownership
      if (memberId && Number(comboTime.serviceOrder.used_by) !== Number(memberId)) {
        const err = new Error('Bạn không có quyền kích hoạt gói Combo của hội viên khác.');
        err.statusCode = 403;
        throw err;
      }

      // Verify status: must be ACTIVE or PENDING
      if (comboTime.status !== ComboTimeStatus.ACTIVE && comboTime.status !== ComboTimeStatus.PENDING) {
        const err = new Error(`Gói Combo không ở trạng thái hợp lệ để gán máy (Trạng thái hiện tại: ${comboTime.status}).`);
        err.statusCode = 400;
        throw err;
      }

      // If status is ACTIVE, check if already expired or already assigned to a computer
      if (comboTime.status === ComboTimeStatus.ACTIVE) {
        if (new Date() >= new Date(comboTime.end_time)) {
          const err = new Error('Gói Combo này đã hết hạn sử dụng.');
          err.statusCode = 400;
          throw err;
        }
        if (comboTime.computer_id) {
          const err = new Error(`Gói Combo đang hoạt động trên máy trạm khác hoặc đã được gán máy.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // 🔒 Pessimistic Lock on Computer
      const computer = await db.Computer.findByPk(computerId, {
        include: [{ model: db.ComputerZone }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!computer) {
        const err = new Error(`Không tìm thấy máy trạm với ID: ${computerId}`);
        err.statusCode = 404;
        throw err;
      }

      // Station must be available (ONLINE or OFFLINE, but not IN_USE or MAINTENANCE)
      if (computer.status === ComputerStatus.IN_USE) {
        const err = new Error(`Máy trạm ${computer.computer_name} hiện đang có người sử dụng.`);
        err.statusCode = 400;
        throw err;
      }

      if (computer.status === ComputerStatus.MAINTENANCE) {
        const err = new Error(`Máy trạm ${computer.computer_name} hiện đang bảo trì.`);
        err.statusCode = 400;
        throw err;
      }

      // Verify Zone hierarchy (Rule 2.2: targetZone.level <= comboZone.level)
      const targetZoneTier = computer.ComputerZone ? computer.ComputerZone.tier_level : 1;
      const comboAllowedTier = comboTime.allowed_tier;
      if (comboAllowedTier && Number(targetZoneTier) > Number(comboAllowedTier)) {
        const err = new Error(
          `Máy trạm ${computer.computer_name} thuộc phân khu ${computer.ComputerZone?.zone_name || ''} (Cấp độ ${targetZoneTier}), ` +
          `vượt quá cấp độ cho phép của Combo này (Cấp tối đa: ${comboAllowedTier}).`
        );
        err.statusCode = 400;
        throw err;
      }

      // Check if this member already has an active session on another computer
      const existingMemberSession = await db.ComboTime.findOne({
        include: [{
          model: db.ServiceOrder,
          as: 'serviceOrder',
          where: { used_by: comboTime.serviceOrder.used_by }
        }],
        where: {
          combo_time_id: { [Op.ne]: comboTimeId },
          status: ComboTimeStatus.ACTIVE,
          computer_id: { [Op.ne]: null },
          end_time: { [Op.gt]: new Date() }
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existingMemberSession) {
        const err = new Error('Hội viên hiện đang có một phiên Combo Time khác đang chạy trên máy trạm.');
        err.statusCode = 400;
        throw err;
      }

      // Preserve original start_time and end_time (time starts counting from purchase!)
      const now = new Date();
      const durationMin = comboTime.duration_minutes || 60;
      let startedAt = comboTime.start_time || now;
      let expiresAt = comboTime.end_time;
      if (!expiresAt) {
        expiresAt = new Date(startedAt.getTime() + durationMin * 60 * 1000);
      }

      comboTime.start_time = startedAt;
      comboTime.end_time = expiresAt;
      comboTime.status = ComboTimeStatus.ACTIVE;
      comboTime.computer_id = computerId;
      await comboTime.save({ transaction });

      // Update computer status to IN_USE
      const prevCompStatus = computer.status;
      computer.status = ComputerStatus.IN_USE;
      await computer.save({ transaction });

      // Record status change log
      await db.ComputerStatusLog.create({
        computer_id: computerId,
        member_id: comboTime.serviceOrder.used_by,
        status: ComputerStatus.IN_USE,
        session_type: SessionType.MEMBER,
        start_time: now,
        notes: `Kích hoạt Combo Time: ${comboTime.comboPackage?.name || ''} (#${comboTime.combo_time_id})`
      }, { transaction });

      await transaction.commit();

      // Dispatch NetClient unlock overlay
      const memberUser = await db.User.findByPk(comboTime.serviceOrder.used_by);
      const username = memberUser ? memberUser.username : 'Member';
      try {
        computerSocketService.login(computer.computer_name, username);
      } catch (sockErr) {
        console.warn(`[Socket Warning] NetClient login signal skipped for ${computer.computer_name}:`, sockErr.message);
      }

      return {
        success: true,
        comboTime,
        computer,
        startedAt,
        expiresAt,
        durationMinutes: durationMin
      };
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 10. Switch Station (Rule 2.7)
   */
  async switchStation({ comboTimeId, memberId, targetComputerId }) {
    if (!comboTimeId || !targetComputerId) {
      const err = new Error('Thiếu thông tin chuyển máy (comboTimeId và targetComputerId là bắt buộc)');
      err.statusCode = 400;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 🔒 Lock comboTime
      const comboTime = await db.ComboTime.findByPk(comboTimeId, {
        include: [
          { model: db.ServiceOrder, as: 'serviceOrder' },
          { model: db.ComboPackage, as: 'comboPackage' }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!comboTime) {
        const err = new Error(`Không tìm thấy ComboTime với ID: ${comboTimeId}`);
        err.statusCode = 404;
        throw err;
      }

      if (comboTime.status !== ComboTimeStatus.ACTIVE || !comboTime.end_time || new Date() >= new Date(comboTime.end_time)) {
        const err = new Error('Chỉ có thể chuyển máy khi phiên Combo Time đang hoạt động và còn thời gian.');
        err.statusCode = 400;
        throw err;
      }

      if (memberId && Number(comboTime.serviceOrder.used_by) !== Number(memberId)) {
        const err = new Error('Bạn không có quyền chuyển máy cho phiên chơi của người khác.');
        err.statusCode = 403;
        throw err;
      }

      const sourceComputerId = comboTime.computer_id;
      if (!sourceComputerId) {
        const err = new Error('Phiên combo này chưa được kích hoạt trên máy nào.');
        err.statusCode = 400;
        throw err;
      }

      if (Number(sourceComputerId) === Number(targetComputerId)) {
        const err = new Error('Máy nguồn và máy đích không được trùng nhau');
        err.statusCode = 400;
        throw err;
      }

      // 🔒 Lock source and target computers
      const sourceComp = await db.Computer.findByPk(sourceComputerId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const targetComp = await db.Computer.findByPk(targetComputerId, {
        include: [{ model: db.ComputerZone }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!sourceComp) throw new Error(`Không tìm thấy máy nguồn ID: ${sourceComputerId}`);
      if (!targetComp) throw new Error(`Không tìm thấy máy đích ID: ${targetComputerId}`);

      // Target computer must be available
      if (targetComp.status === ComputerStatus.IN_USE || targetComp.status === ComputerStatus.MAINTENANCE) {
        const err = new Error(`Máy đích ${targetComp.computer_name} hiện không ở trạng thái sẵn sàng để chuyển sang (${targetComp.status})`);
        err.statusCode = 400;
        throw err;
      }

      // Verify Zone hierarchy (Rule 2.2: targetZone.level <= comboZone.level)
      const targetZoneTier = targetComp.ComputerZone ? targetComp.ComputerZone.tier_level : 1;
      const comboAllowedTier = comboTime.allowed_tier;
      if (comboAllowedTier && Number(targetZoneTier) > Number(comboAllowedTier)) {
        const err = new Error(
          `Không thể chuyển lên phân khu cấp ${targetZoneTier} (${targetComp.ComputerZone?.zone_name || ''}). ` +
          `Gói Combo của bạn chỉ áp dụng tối đa cho phân khu cấp ${comboAllowedTier}.`
        );
        err.statusCode = 400;
        throw err;
      }

      // Release source computer
      const sourceMachine = machineStore.get(sourceComp.computer_name) || machineStore.get(sourceComp.ip_address);
      const isSourceConnected = Boolean(sourceMachine && sourceMachine.socketId);
      sourceComp.status = isSourceConnected ? ComputerStatus.ONLINE : ComputerStatus.OFFLINE;
      await sourceComp.save({ transaction });

      await db.ComputerStatusLog.create({
        computer_id: sourceComputerId,
        status: sourceComp.status,
        session_type: SessionType.SYSTEM,
        notes: `Đã chuyển phiên Combo sang máy ${targetComp.computer_name}`
      }, { transaction });

      // Claim target computer
      targetComp.status = ComputerStatus.IN_USE;
      await targetComp.save({ transaction });

      await db.ComputerStatusLog.create({
        computer_id: targetComputerId,
        member_id: comboTime.serviceOrder.used_by,
        status: ComputerStatus.IN_USE,
        session_type: SessionType.MEMBER,
        start_time: new Date(),
        notes: `Chuyển phiên Combo từ máy ${sourceComp.computer_name}`
      }, { transaction });

      // Update ComboTime computer link (Keep start_time and end_time intact!)
      comboTime.computer_id = targetComputerId;
      await comboTime.save({ transaction });

      await transaction.commit();

      // NetClient Signals
      try {
        // Lock source machine overlay
        computerSocketService.logout(sourceComp.computer_name);
      } catch (e) {
        console.warn(`[Socket Warning] Logout signal to source ${sourceComp.computer_name} failed:`, e.message);
      }

      try {
        // Unlock target machine overlay
        const memberUser = await db.User.findByPk(comboTime.serviceOrder.used_by);
        const username = memberUser ? memberUser.username : 'Member';
        computerSocketService.login(targetComp.computer_name, username);
      } catch (e) {
        console.warn(`[Socket Warning] Login signal to target ${targetComp.computer_name} failed:`, e.message);
      }

      return {
        success: true,
        message: `Đã chuyển phiên chơi từ máy ${sourceComp.computer_name} sang máy ${targetComp.computer_name} thành công.`,
        fromComputer: sourceComp,
        toComputer: targetComp,
        comboTime
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 11. Early Session Termination (Rule 2.5)
   * No refund for remaining time. Void and lock immediately.
   */
  async endSessionEarly({ comboTimeId, memberId }) {
    if (!comboTimeId) {
      const err = new Error('Thiếu comboTimeId để kết thúc phiên');
      err.statusCode = 400;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 🔒 Lock comboTime
      const comboTime = await db.ComboTime.findByPk(comboTimeId, {
        include: [{ model: db.ServiceOrder, as: 'serviceOrder' }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!comboTime) {
        const err = new Error(`Không tìm thấy ComboTime với ID: ${comboTimeId}`);
        err.statusCode = 404;
        throw err;
      }

      if (comboTime.status !== ComboTimeStatus.ACTIVE) {
        const err = new Error(`Phiên không ở trạng thái ACTIVE (Trạng thái hiện tại: ${comboTime.status})`);
        err.statusCode = 400;
        throw err;
      }

      if (memberId && Number(comboTime.serviceOrder.used_by) !== Number(memberId)) {
        const err = new Error('Bạn không có quyền kết thúc phiên của hội viên khác.');
        err.statusCode = 403;
        throw err;
      }

      // Mark cancelled immediately
      comboTime.status = ComboTimeStatus.CANCELLED;
      await comboTime.save({ transaction });

      let releasedComp = null;
      if (comboTime.computer_id) {
        const computer = await db.Computer.findByPk(comboTime.computer_id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (computer) {
          const machine = machineStore.get(computer.computer_name) || machineStore.get(computer.ip_address);
          const isConnected = Boolean(machine && machine.socketId);
          computer.status = isConnected ? ComputerStatus.ONLINE : ComputerStatus.OFFLINE;
          await computer.save({ transaction });
          releasedComp = computer;

          await db.ComputerStatusLog.create({
            computer_id: computer.computer_id,
            member_id: comboTime.serviceOrder.used_by,
            status: computer.status,
            session_type: SessionType.SYSTEM,
            notes: 'Khách chủ động kết thúc phiên Combo sớm (Không bảo lưu/hoàn tiền thời gian dư)'
          }, { transaction });
        }
      }

      await transaction.commit();

      if (releasedComp) {
        try {
          computerSocketService.logout(releasedComp.computer_name);
        } catch (e) {
          console.warn(`[Socket Warning] Logout to ${releasedComp.computer_name} failed:`, e.message);
        }
      }

      return {
        success: true,
        message: 'Phiên chơi đã kết thúc sớm. Thời gian dư đã bị hủy theo quy định.',
        comboTime
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 12. Idempotent Expiration Execution for a single ComboTime (Rule 2.6)
   */
  async expireComboTime(comboTimeId) {
    const transaction = await db.sequelize.transaction();
    let releasedComp = null;
    let comboRecord = null;

    try {
      const comboTime = await db.ComboTime.findByPk(comboTimeId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!comboTime || comboTime.status !== ComboTimeStatus.ACTIVE) {
        // Idempotency: Already expired or cancelled
        await transaction.rollback();
        return false;
      }

      comboTime.status = ComboTimeStatus.EXPIRED;
      await comboTime.save({ transaction });
      comboRecord = comboTime;

      if (comboTime.computer_id) {
        const computer = await db.Computer.findByPk(comboTime.computer_id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (computer) {
          const machine = machineStore.get(computer.computer_name) || machineStore.get(computer.ip_address);
          const isConnected = Boolean(machine && machine.socketId);
          computer.status = isConnected ? ComputerStatus.ONLINE : ComputerStatus.OFFLINE;
          await computer.save({ transaction });
          releasedComp = computer;

          await db.ComputerStatusLog.create({
            computer_id: computer.computer_id,
            member_id: null,
            status: computer.status,
            session_type: SessionType.SYSTEM,
            notes: 'Combo Time hết giờ - Tự động kết thúc phiên và khóa máy trạm'
          }, { transaction });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error(`[ComboTime] Lỗi khi xử lý hết hạn combo #${comboTimeId}:`, error);
      return false;
    }

    // Hardware Lock Execution via Socket.IO
    if (releasedComp) {
      try {
        computerSocketService.logout(releasedComp.computer_name);
        computerSocketService.sendNotification(
          releasedComp.computer_name,
          'Hết giờ chơi',
          'Thời gian Combo đã kết thúc. Máy trạm đã được tự động khóa.',
          5
        );
      } catch (sockErr) {
        console.warn(`[Socket Warning] Khóa máy ${releasedComp.computer_name} thất bại:`, sockErr.message);
      }
    }

    return true;
  }

  /**
   * 13. Scheduler Expiration Sweeper (Rule 2.6)
   * Scans all ACTIVE combos where end_time <= now. Idempotent & concurrency-safe.
   */
  async checkAndExpireCombos() {
    try {
      const now = new Date();
      const expiredCombos = await db.ComboTime.findAll({
        where: {
          status: ComboTimeStatus.ACTIVE,
          end_time: { [Op.lte]: now }
        },
        attributes: ['combo_time_id']
      });

      if (expiredCombos.length === 0) return 0;

      let processedCount = 0;
      for (const item of expiredCombos) {
        const handled = await this.expireComboTime(item.combo_time_id);
        if (handled) processedCount++;
      }

      return processedCount;
    } catch (error) {
      console.error('[ComboTime Sweeper] Lỗi quét combo hết hạn:', error);
      return 0;
    }
  }

  /**
   * 14. Get Active / Current ComboTime by Member ID
   */
  async getActiveComboByMember(memberId) {
    if (!memberId) return null;

    // First auto-expire any overdue combos
    await this.checkAndExpireCombos();

    // Look for ACTIVE combo first
    let comboTime = await db.ComboTime.findOne({
      include: [
        {
          model: db.ServiceOrder,
          as: 'serviceOrder',
          where: { used_by: memberId }
        },
        { model: db.ComboPackage, as: 'comboPackage' },
        {
          model: db.Computer,
          as: 'computer',
          include: [{ model: db.ComputerZone }]
        }
      ],
      where: {
        status: ComboTimeStatus.ACTIVE,
        end_time: { [Op.gt]: new Date() }
      },
      order: [['combo_time_id', 'DESC']]
    });

    if (comboTime) {
      return {
        ...comboTime.toJSON(),
        remainingMinutes: comboTime.calculateRemainingMinutes()
      };
    }

    // Look for PENDING combo (purchased, not yet started)
    const pendingCombo = await db.ComboTime.findOne({
      include: [
        {
          model: db.ServiceOrder,
          as: 'serviceOrder',
          where: { used_by: memberId }
        },
        { model: db.ComboPackage, as: 'comboPackage' }
      ],
      where: {
        status: ComboTimeStatus.PENDING
      },
      order: [['combo_time_id', 'DESC']]
    });

    if (pendingCombo) {
      return {
        ...pendingCombo.toJSON(),
        remainingMinutes: pendingCombo.duration_minutes || 0
      };
    }

    return null;
  }

  /**
   * 15. Get Member Combo History
   */
  async getMemberComboHistory(memberId) {
    return await db.ComboTime.findAll({
      include: [
        {
          model: db.ServiceOrder,
          as: 'serviceOrder',
          where: { used_by: memberId }
        },
        { model: db.ComboPackage, as: 'comboPackage' },
        { model: db.Computer, as: 'computer' }
      ],
      order: [['combo_time_id', 'DESC']]
    });
  }
}

module.exports = new ComboTimeService();
