const db = require('../models');
const { RemotePairingStatus, ComputerStatus } = require('../constants/enums');
const machineStore = require('../stores/machineStore');
const computerSocketService = require('./computerSocketService');
const billingService = require('./billingService');

class PairingManagementService {
  /**
   * Helper to find connected machine in machineStore by computer_id or address
   */
  findConnectedMachine(computer) {
    if (!computer) return null;
    const allMachines = Object.values(machineStore.getAll() || {});

    // Try matching by IP or MAC
    const normIp = (val) => String(val || '').trim().toLowerCase().replace('::ffff:', '');
    const normMac = (val) => String(val || '').replace(/[:-]/g, '').toUpperCase();

    const targetIp = normIp(computer.ip_address);
    const targetMac = normMac(computer.mac_address);

    const found = allMachines.find((m) => {
      if (!m) return false;
      const mIp = normIp(m.localIp);
      const mMac = normMac(m.macAddress);
      if (targetIp && mIp === targetIp) return true;
      if (targetMac && mMac === targetMac) return true;
      if (String(m.machineId) === String(computer.computer_id) || m.machineId === computer.computer_name) return true;
      return false;
    });

    return found || null;
  }

  /**
   * 1. Create a pairing intent attached to RentalSessionId and ComputerId
   */
  async createPairingIntent({ memberId, computerId, timeoutSeconds = 300 }) {
    if (!computerId) {
      const err = new Error('computerId là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }
    if (!memberId) {
      const err = new Error('memberId là bắt buộc.');
      err.statusCode = 401;
      throw err;
    }

    const transaction = await db.sequelize.transaction();
    try {
      // 1. Lock and verify computer
      const computer = await db.Computer.findByPk(computerId, {
        include: [{ model: db.ComputerZone }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!computer) {
        const err = new Error('Không tìm thấy máy trạm.');
        err.statusCode = 404;
        throw err;
      }

      if (!computer.is_remote_enabled) {
        const err = new Error('Máy trạm chưa được kích hoạt tính năng thuê từ xa.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Lock and verify member
      const member = await db.Member.findByPk(memberId, {
        include: [{ model: db.User, as: 'userInfo' }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!member) {
        const err = new Error('Không tìm thấy thông tin hội viên.');
        err.statusCode = 404;
        throw err;
      }

      // 3. Check / Start active rental session
      let rentalSession = await db.RentalSession.findOne({
        where: {
          computer_id: computerId,
          status: db.RentalSession.Status.ACTIVE
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (rentalSession) {
        if (Number(rentalSession.member_id) !== Number(memberId)) {
          const err = new Error('Máy trạm đang được sử dụng bởi người dùng khác.');
          err.statusCode = 409;
          throw err;
        }
      } else {
        // Authorize and start rental session for this remote user
        const username = member.userInfo?.username;
        if (!username) {
          const err = new Error('Tài khoản không hợp lệ.');
          err.statusCode = 400;
          throw err;
        }

        const authorization = await billingService.authorizeLogin({
          username,
          computerId: computer.computer_id
        }, transaction);

        if (!authorization.allowed) {
          const err = new Error(authorization.message || 'Không đủ điều kiện thuê máy.');
          err.statusCode = 403;
          throw err;
        }

        rentalSession = await billingService.startSession({
          memberId: member.member_id,
          computerId: computer.computer_id,
          combo: authorization.combo
        }, transaction);

        // Update computer status to LOCKED (tạm giữ chỗ để người khác không thuê trùng)
        computer.status = ComputerStatus.LOCKED;
        await computer.save({ transaction });
      }

      // 4. Concurrency & active intent check (strictly at most 1 active intent per machine)
      const existingIntents = await db.RemotePairing.findAll({
        where: {
          computer_id: computerId,
          status: [RemotePairingStatus.PENDING, RemotePairingStatus.CONFIRMING]
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const now = new Date();
      for (const oldIntent of existingIntents) {
        if (new Date(oldIntent.expires_at) < now) {
          oldIntent.status = RemotePairingStatus.EXPIRED;
          oldIntent.failure_reason = 'Hết hạn thời gian ghép nối';
          await oldIntent.save({ transaction });
        } else {
          // If unexpired intent belongs to same session, cancel it to start fresh
          if (String(oldIntent.rental_session_id) === String(rentalSession.rental_session_id)) {
            oldIntent.status = RemotePairingStatus.CANCELLED;
            oldIntent.failure_reason = 'Thay thế bởi yêu cầu ghép nối mới';
            oldIntent.completed_at = now;
            await oldIntent.save({ transaction });
          } else {
            const err = new Error('Máy trạm đang có một yêu cầu ghép nối khác đang chờ xử lý.');
            err.statusCode = 409;
            throw err;
          }
        }
      }

      // 5. Create new pairing intent
      const expiresAt = new Date(Date.now() + Math.max(60, timeoutSeconds) * 1000);
      const newIntent = await db.RemotePairing.create({
        rental_session_id: rentalSession.rental_session_id,
        computer_id: computer.computer_id,
        status: RemotePairingStatus.PENDING,
        expires_at: expiresAt
      }, { transaction });

      await transaction.commit();

      // 6. Notify connected NetClient via Socket to start monitoring Sunshine
      const connectedMachine = this.findConnectedMachine(computer);
      if (connectedMachine && connectedMachine.machineId) {
        computerSocketService.startPairingDetection(connectedMachine.machineId, {
          intentId: newIntent.id,
          computerId: computer.computer_id,
          timeoutSeconds
        });
      }

      // 7. Cập nhật machineStore & phát socket trạng thái LOCKED đến toàn bộ khách khác (Khách B)
      if (connectedMachine && connectedMachine.machineId) {
        machineStore.updateStatus(connectedMachine.machineId, ComputerStatus.LOCKED);
      }
      computerSocketService.broadcastMachineStatus(computer.computer_id, ComputerStatus.LOCKED);
      computerSocketService.broadcastMachineUpdate({
        machineId: connectedMachine?.machineId || computer.computer_name,
        computerId: computer.computer_id,
        status: ComputerStatus.LOCKED,
        currentUser: member.userInfo?.username || null
      });

      // Emit socket event remote:pairing:started
      computerSocketService.broadcastPairingEvent('remote:pairing:started', {
        intentId: newIntent.id,
        computerId: computer.computer_id,
        rentalSessionId: rentalSession.rental_session_id,
        status: RemotePairingStatus.PENDING,
        expiresAt: newIntent.expires_at
      });

      return {
        intent: {
          id: newIntent.id,
          rentalSessionId: newIntent.rental_session_id,
          computerId: newIntent.computer_id,
          status: newIntent.status,
          expiresAt: newIntent.expires_at,
          createdAt: newIntent.created_at,
          ipAddress: connectedMachine?.localIp || computer.ip_address,
          ipv6: connectedMachine?.ipv6 || null
        },
        session: {
          rentalSessionId: rentalSession.rental_session_id,
          status: rentalSession.status,
          startedAt: rentalSession.started_at
        },
        computer: {
          computerId: computer.computer_id,
          computerName: computer.computer_name,
          ipAddress: connectedMachine?.localIp || computer.ip_address,
          ipv6: connectedMachine?.ipv6 || null
        }
      };
    } catch (err) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw err;
    }
  }

  /**
   * 2. Check pairing status
   */
  async getPairingStatus({ intentId, memberId, role }) {
    if (!intentId) {
      const err = new Error('intentId là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    const intent = await db.RemotePairing.findByPk(intentId, {
      include: [
        { model: db.RentalSession, as: 'rentalSession' },
        { model: db.Computer, as: 'computer' }
      ]
    });

    if (!intent) {
      const err = new Error('Không tìm thấy yêu cầu ghép nối.');
      err.statusCode = 404;
      throw err;
    }

    // Authorization
    if (role !== 'ADMIN' && role !== 'EMPLOYEE') {
      if (Number(intent.rentalSession?.member_id) !== Number(memberId)) {
        const err = new Error('Bạn không có quyền xem yêu cầu ghép nối này.');
        err.statusCode = 403;
        throw err;
      }
    }

    // Auto-expire check
    if (intent.status === RemotePairingStatus.PENDING && new Date(intent.expires_at) < new Date()) {
      intent.status = RemotePairingStatus.EXPIRED;
      intent.failure_reason = 'Hết hạn thời gian ghép nối';
      await intent.save();

      if (intent.rental_session_id) {
        await db.RentalSession.update(
          {
            status: db.RentalSession.Status.ENDED,
            ended_at: new Date(),
            total_amount: 0
          },
          {
            where: {
              rental_session_id: intent.rental_session_id,
              status: db.RentalSession.Status.ACTIVE
            }
          }
        );
      }

      if (intent.computer_id) {
        await db.Computer.update(
          { status: ComputerStatus.ONLINE },
          { where: { computer_id: intent.computer_id } }
        );
        const connMachine = this.findConnectedMachine(intent.computer);
        if (connMachine && connMachine.machineId) {
          machineStore.updateStatus(connMachine.machineId, ComputerStatus.ONLINE);
        }
        computerSocketService.broadcastMachineStatus(intent.computer_id, ComputerStatus.ONLINE);
        computerSocketService.broadcastMachineUpdate({
          machineId: connMachine?.machineId || intent.computer?.computer_name,
          computerId: intent.computer_id,
          status: ComputerStatus.ONLINE,
          currentUser: null
        });
      }

      computerSocketService.broadcastPairingEvent('remote:pairing:failed', {
        intentId: intent.id,
        computerId: intent.computer_id,
        rentalSessionId: intent.rental_session_id,
        status: RemotePairingStatus.EXPIRED,
        reason: 'Hết hạn thời gian ghép nối'
      });
    }

    const connectedMachine = this.findConnectedMachine(intent.computer);

    return {
      id: intent.id,
      rentalSessionId: intent.rental_session_id,
      computerId: intent.computer_id,
      deviceName: intent.device_name,
      deviceAddress: intent.device_address,
      status: intent.status,
      expiresAt: intent.expires_at,
      createdAt: intent.created_at,
      completedAt: intent.completed_at,
      failureReason: intent.failure_reason,
      ipAddress: connectedMachine?.localIp || intent.computer?.ip_address,
      ipv6: connectedMachine?.ipv6 || null
    };
  }

  /**
   * 3. Handle pairing detected by NetClient
   */
  async handlePairingDetected({ machineId, computerId, pairingId, deviceName, deviceAddress }) {
    if (!pairingId) return null;

    const transaction = await db.sequelize.transaction();
    try {
      const whereCondition = {
        status: RemotePairingStatus.PENDING
      };

      if (computerId) {
        whereCondition.computer_id = computerId;
      }

      const pendingIntents = await db.RemotePairing.findAll({
        where: whereCondition,
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      const now = new Date();
      const validIntents = pendingIntents.filter(
        (i) => new Date(i.expires_at) > now
      );

      // Do NOT guess if zero or multiple intents match
      if (validIntents.length !== 1) {
        console.warn(`[PairingManagement] Detected pairing ${pairingId} could not be correlated uniquely (matches: ${validIntents.length})`);
        await transaction.commit();
        return null;
      }

      const targetIntent = validIntents[0];
      targetIntent.pairing_id = String(pairingId).trim();
      targetIntent.device_name = deviceName ? String(deviceName).slice(0, 255) : null;
      targetIntent.device_address = deviceAddress ? String(deviceAddress).slice(0, 100) : null;
      await targetIntent.save({ transaction });

      await transaction.commit();

      console.log(`[PairingManagement] Successfully correlated pairing ${pairingId} with intent ${targetIntent.id}`);

      // Broadcast detected event
      computerSocketService.broadcastPairingEvent('remote:pairing:detected', {
        intentId: targetIntent.id,
        computerId: targetIntent.computer_id,
        rentalSessionId: targetIntent.rental_session_id,
        deviceName: targetIntent.device_name,
        deviceAddress: targetIntent.device_address,
        status: targetIntent.status
      });

      return targetIntent;
    } catch (err) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      console.error('[PairingManagement] Error handling detected pairing:', err);
      return null;
    }
  }

  /**
   * 4. Confirm PIN
   */
  async confirmPairing({ intentId, memberId, pin, role }) {
    // PIN Validation (no plaintext PIN logged!)
    const cleanPin = String(pin || '').trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      const err = new Error('Mã PIN không hợp lệ. PIN phải gồm đúng 4 chữ số.');
      err.statusCode = 400;
      throw err;
    }

    if (!intentId) {
      const err = new Error('intentId là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    let intent = null;
    let computer = null;

    const transaction = await db.sequelize.transaction();
    try {
      intent = await db.RemotePairing.findByPk(intentId, {
        include: [
          {
            model: db.RentalSession,
            as: 'rentalSession',
            include: [{
              model: db.Member,
              as: 'member',
              include: [{
                model: db.User,
                as: 'userInfo',
                attributes: ['user_id', 'username', 'full_name']
              }]
            }]
          },
          { model: db.Computer, as: 'computer' }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!intent) {
        const err = new Error('Không tìm thấy yêu cầu ghép nối.');
        err.statusCode = 404;
        throw err;
      }

      // Authorization
      if (role !== 'ADMIN' && role !== 'EMPLOYEE') {
        if (Number(intent.rentalSession?.member_id) !== Number(memberId)) {
          const err = new Error('Bạn không có quyền xác nhận yêu cầu ghép nối này.');
          err.statusCode = 403;
          throw err;
        }
      }

      // Session must still be ACTIVE
      if (intent.rentalSession?.status !== db.RentalSession.Status.ACTIVE) {
        const err = new Error('Phiên thuê máy không còn ở trạng thái hoạt động.');
        err.statusCode = 400;
        throw err;
      }

      // Check current intent status
      if (intent.status === RemotePairingStatus.PAIRED) {
        const err = new Error('Yêu cầu ghép nối này đã hoàn thành trước đó.');
        err.statusCode = 400;
        throw err;
      }

      if (intent.status === RemotePairingStatus.CANCELLED) {
        const err = new Error('Yêu cầu ghép nối đã bị hủy.');
        err.statusCode = 400;
        throw err;
      }

      if (new Date(intent.expires_at) < new Date()) {
        intent.status = RemotePairingStatus.EXPIRED;
        intent.failure_reason = 'Hết hạn thời gian ghép nối';
        await intent.save({ transaction });
        const err = new Error('Yêu cầu ghép nối đã hết hạn.');
        err.statusCode = 400;
        throw err;
      }

      if (intent.status === RemotePairingStatus.CONFIRMING) {
        const err = new Error('Yêu cầu ghép nối đang được xác nhận, vui lòng chờ.');
        err.statusCode = 409;
        throw err;
      }

      if (!intent.pairing_id) {
        const err = new Error('Chưa phát hiện thiết bị Moonlight nào. Vui lòng mở Moonlight và thêm máy tính trước khi bấm Xác nhận PIN.');
        err.statusCode = 400;
        throw err;
      }

      intent.status = RemotePairingStatus.CONFIRMING;
      await intent.save({ transaction });

      computer = intent.computer;
      await transaction.commit();
    } catch (err) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw err;
    }

    // Emit confirming event
    computerSocketService.broadcastPairingEvent('remote:pairing:confirming', {
      intentId: intent.id,
      computerId: intent.computer_id,
      rentalSessionId: intent.rental_session_id,
      status: RemotePairingStatus.CONFIRMING
    });

    // Send confirmation to NetClient
    const connectedMachine = this.findConnectedMachine(computer);
    if (!connectedMachine || !connectedMachine.machineId) {
      await intent.update({
        status: RemotePairingStatus.FAILED,
        failure_reason: 'Máy trạm offline hoặc mất kết nối socket.'
      });

      computerSocketService.broadcastPairingEvent('remote:pairing:failed', {
        intentId: intent.id,
        computerId: intent.computer_id,
        rentalSessionId: intent.rental_session_id,
        status: RemotePairingStatus.FAILED,
        reason: 'Máy trạm offline hoặc mất kết nối socket.'
      });

      const err = new Error('Máy trạm hiện đang offline hoặc mất kết nối.');
      err.statusCode = 503;
      throw err;
    }

    try {
      const confirmResult = await computerSocketService.confirmSunshinePairing(
        connectedMachine.machineId,
        {
          intentId: intent.id,
          pairingId: intent.pairing_id,
          pin: cleanPin,
          deviceName: intent.device_name || 'Moonlight Client'
        },
        15000 // 15s timeout
      );

      if (confirmResult && confirmResult.success) {
        await intent.update({
          status: RemotePairingStatus.PAIRED,
          completed_at: new Date(),
          failure_reason: null
        });

        // Ghép nối thành công -> chính thức chuyển trạng thái máy sang IN_USE
        await db.Computer.update(
          { status: ComputerStatus.IN_USE },
          { where: { computer_id: intent.computer_id } }
        );
        if (connectedMachine && connectedMachine.machineId) {
          machineStore.updateStatus(connectedMachine.machineId, ComputerStatus.IN_USE);
        }
        computerSocketService.broadcastMachineStatus(intent.computer_id, ComputerStatus.IN_USE);
        computerSocketService.broadcastMachineUpdate({
          machineId: connectedMachine?.machineId || intent.computer?.computer_name,
          computerId: intent.computer_id,
          status: ComputerStatus.IN_USE,
          currentUser: intent.rentalSession?.member?.userInfo?.username || null
        });

        computerSocketService.broadcastPairingEvent('remote:pairing:completed', {
          intentId: intent.id,
          computerId: intent.computer_id,
          rentalSessionId: intent.rental_session_id,
          status: RemotePairingStatus.PAIRED,
          completedAt: intent.completed_at
        });

        // Tự động đăng nhập (Auto-login) cho khách thuê từ xa trên máy trạm
        try {
          let username = intent.rentalSession?.member?.userInfo?.username;
          if (!username && intent.rentalSession?.member_id) {
            const member = await db.Member.findByPk(intent.rentalSession.member_id, {
              include: [{ model: db.User, as: 'userInfo', attributes: ['username'] }]
            });
            username = member?.userInfo?.username;
          }

          if (username && connectedMachine.machineId) {
            computerSocketService.login(connectedMachine.machineId, username, true);
            console.log(`[PairingManagement] Auto-login triggered for remote user '${username}' on machine '${connectedMachine.machineId}'`);
          } else {
            console.warn(`[PairingManagement] Cannot trigger auto-login: username=${username}, machineId=${connectedMachine?.machineId}`);
          }
        } catch (autoLoginErr) {
          console.error('[PairingManagement] Error triggering auto-login after pairing:', autoLoginErr);
        }

        return {
          success: true,
          message: 'Ghép nối Moonlight thành công!',
          intent: {
            id: intent.id,
            status: RemotePairingStatus.PAIRED,
            completedAt: intent.completed_at
          }
        };
      } else {
        const failureReason = confirmResult?.error || 'Xác nhận mã PIN với Sunshine thất bại.';
        await intent.update({
          status: RemotePairingStatus.FAILED,
          failure_reason: failureReason
        });

        // Ghép nối thất bại -> hoàn trả trạng thái máy về ONLINE và hủy session
        await db.Computer.update(
          { status: ComputerStatus.ONLINE },
          { where: { computer_id: intent.computer_id } }
        );
        if (intent.rental_session_id) {
          await db.RentalSession.update(
            { status: db.RentalSession.Status.ENDED, ended_at: new Date(), total_amount: 0 },
            { where: { rental_session_id: intent.rental_session_id, status: db.RentalSession.Status.ACTIVE } }
          );
        }
        if (connectedMachine && connectedMachine.machineId) {
          machineStore.updateStatus(connectedMachine.machineId, ComputerStatus.ONLINE);
        }
        computerSocketService.broadcastMachineStatus(intent.computer_id, ComputerStatus.ONLINE);
        computerSocketService.broadcastMachineUpdate({
          machineId: connectedMachine?.machineId || intent.computer?.computer_name,
          computerId: intent.computer_id,
          status: ComputerStatus.ONLINE,
          currentUser: null
        });

        computerSocketService.broadcastPairingEvent('remote:pairing:failed', {
          intentId: intent.id,
          computerId: intent.computer_id,
          rentalSessionId: intent.rental_session_id,
          status: RemotePairingStatus.FAILED,
          reason: failureReason
        });

        const err = new Error(failureReason);
        err.statusCode = 400;
        throw err;
      }
    } catch (execErr) {
      const errorMsg = execErr.message || 'Lỗi giao tiếp với máy trạm khi xác nhận PIN.';
      await intent.update({
        status: RemotePairingStatus.FAILED,
        failure_reason: errorMsg
      }).catch(() => {});

      // Hoàn trả trạng thái máy về ONLINE và hủy session khi lỗi ngoại lệ
      await db.Computer.update(
        { status: ComputerStatus.ONLINE },
        { where: { computer_id: intent.computer_id } }
      ).catch(() => {});
      if (intent.rental_session_id) {
        await db.RentalSession.update(
          { status: db.RentalSession.Status.ENDED, ended_at: new Date(), total_amount: 0 },
          { where: { rental_session_id: intent.rental_session_id, status: db.RentalSession.Status.ACTIVE } }
        ).catch(() => {});
      }
      if (connectedMachine && connectedMachine.machineId) {
        machineStore.updateStatus(connectedMachine.machineId, ComputerStatus.ONLINE);
      }
      computerSocketService.broadcastMachineStatus(intent.computer_id, ComputerStatus.ONLINE);
      computerSocketService.broadcastMachineUpdate({
        machineId: connectedMachine?.machineId || intent.computer?.computer_name,
        computerId: intent.computer_id,
        status: ComputerStatus.ONLINE,
        currentUser: null
      });

      computerSocketService.broadcastPairingEvent('remote:pairing:failed', {
        intentId: intent.id,
        computerId: intent.computer_id,
        rentalSessionId: intent.rental_session_id,
        status: RemotePairingStatus.FAILED,
        reason: errorMsg
      });

      if (!execErr.statusCode) execErr.statusCode = 500;
      throw execErr;
    }
  }

  /**
   * 5. Cancel pairing intent
   */
  async cancelPairingIntent({ intentId, memberId, role }) {
    if (!intentId) {
      const err = new Error('intentId là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    const intent = await db.RemotePairing.findByPk(intentId, {
      include: [
        { model: db.RentalSession, as: 'rentalSession' },
        { model: db.Computer, as: 'computer' }
      ]
    });

    if (!intent) {
      const err = new Error('Không tìm thấy yêu cầu ghép nối.');
      err.statusCode = 404;
      throw err;
    }

    // Authorization
    if (role !== 'ADMIN' && role !== 'EMPLOYEE') {
      const sessionMemberId = intent.rentalSession?.member_id;
      let isOwner = sessionMemberId && (Number(sessionMemberId) === Number(memberId));
      if (!isOwner && sessionMemberId) {
        const memberRec = await db.Member.findByPk(sessionMemberId);
        if (memberRec && Number(memberRec.user_id || memberRec.member_id) === Number(memberId)) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        const err = new Error('Bạn không có quyền hủy yêu cầu ghép nối này.');
        err.statusCode = 403;
        throw err;
      }
    }

    if (intent.status === RemotePairingStatus.PAIRED) {
      // Hủy phiên thuê từ xa đã ghép nối: kết thúc session và logout máy trạm
      intent.status = RemotePairingStatus.CANCELLED;
      intent.completed_at = new Date();
      intent.failure_reason = 'Người dùng đã hủy phiên thuê từ xa';
      await intent.save();

      if (intent.rental_session_id) {
        await db.RentalSession.update(
          {
            status: db.RentalSession.Status.LOGGED_OUT,
            ended_at: new Date()
          },
          {
            where: {
              rental_session_id: intent.rental_session_id,
              status: db.RentalSession.Status.ACTIVE
            }
          }
        );
      }

      // Đặt lại trạng thái máy trạm về ONLINE
      if (intent.computer_id) {
        await db.Computer.update(
          { status: ComputerStatus.ONLINE },
          { where: { computer_id: intent.computer_id } }
        );
        const connMachine = this.findConnectedMachine(intent.computer);
        if (connMachine && connMachine.machineId) {
          machineStore.updateStatus(connMachine.machineId, ComputerStatus.ONLINE);
        }
        computerSocketService.broadcastMachineStatus(intent.computer_id, ComputerStatus.ONLINE);
        computerSocketService.broadcastMachineUpdate({
          machineId: connMachine?.machineId || intent.computer?.computer_name,
          computerId: intent.computer_id,
          status: ComputerStatus.ONLINE,
          currentUser: null
        });
      }

      const connectedMachine = this.findConnectedMachine(intent.computer);
      if (connectedMachine && connectedMachine.machineId) {
        computerSocketService.logout(connectedMachine.machineId);
      }

      computerSocketService.broadcastPairingEvent('remote:pairing:cancelled', {
        intentId: intent.id,
        computerId: intent.computer_id,
        rentalSessionId: intent.rental_session_id,
        status: RemotePairingStatus.CANCELLED,
        reason: 'Người dùng đã hủy phiên thuê từ xa'
      });

      return {
        success: true,
        message: 'Đã hủy phiên thuê từ xa thành công.'
      };
    }

    if (intent.status !== RemotePairingStatus.CANCELLED) {
      intent.status = RemotePairingStatus.CANCELLED;
      intent.completed_at = new Date();
      intent.failure_reason = 'Người dùng đã hủy';
      await intent.save();

      // Hủy RentalSession tương ứng (nếu chưa hoàn tất) để không trừ tiền
      if (intent.rental_session_id) {
        await db.RentalSession.update(
          {
            status: db.RentalSession.Status.ENDED,
            ended_at: new Date(),
            total_amount: 0
          },
          {
            where: {
              rental_session_id: intent.rental_session_id,
              status: db.RentalSession.Status.ACTIVE
            }
          }
        );
      }

      // Đặt lại trạng thái máy trạm về ONLINE vì chưa hoàn tất thuê
      if (intent.computer_id) {
        await db.Computer.update(
          { status: ComputerStatus.ONLINE },
          { where: { computer_id: intent.computer_id } }
        );
        const connMachine = this.findConnectedMachine(intent.computer);
        if (connMachine && connMachine.machineId) {
          machineStore.updateStatus(connMachine.machineId, ComputerStatus.ONLINE);
        }
        computerSocketService.broadcastMachineStatus(intent.computer_id, ComputerStatus.ONLINE);
        computerSocketService.broadcastMachineUpdate({
          machineId: connMachine?.machineId || intent.computer?.computer_name,
          computerId: intent.computer_id,
          status: ComputerStatus.ONLINE,
          currentUser: null
        });
      }

      // Notify NetClient to stop detection
      const connectedMachine = this.findConnectedMachine(intent.computer);
      if (connectedMachine && connectedMachine.machineId) {
        computerSocketService.stopPairingDetection(connectedMachine.machineId, {
          intentId: intent.id
        });
      }

      computerSocketService.broadcastPairingEvent('remote:pairing:cancelled', {
        intentId: intent.id,
        computerId: intent.computer_id,
        rentalSessionId: intent.rental_session_id,
        status: RemotePairingStatus.CANCELLED,
        reason: 'Người dùng đã hủy'
      });
    }

    return {
      success: true,
      message: 'Đã hủy yêu cầu ghép nối thành công.'
    };
  }
}

module.exports = new PairingManagementService();

