const machineStore = require('../stores/machineStore');
const db = require('../models');
const Computer = db.Computer;
const { Op } = require('sequelize');
const HEARTBEAT_TIMEOUT_MS = 15000;
const HEARTBEAT_CHECK_INTERVAL_MS = 5000;
const ComputerStatus = require('../constants/enums').ComputerStatus;
const { recordStatusChange } = require('../services/computerStatusLogService');
const billingService = require('../services/billingService');

function registerMachineSocket(io) {

    function broadcastUpdate() {
        io.emit(
            'machines:list',
            machineStore.getAll()
        );
    }

    function broadcastMachineUpdate(machine) {
        if (machine) {
            io.emit('machine:updated', machine);
        }
    }

    // ========================================
    // Heartbeat Timeout Checker (Interval)
    // Quá 15s không nhận heartbeat hợp lệ -> OFFLINE
    // ========================================
    const timeoutInterval = setInterval(async () => {
        try {
            const timedOutMachines = machineStore.checkHeartbeatTimeout(HEARTBEAT_TIMEOUT_MS);
            if (timedOutMachines.length > 0) {
                for (const m of timedOutMachines) {
                    const computer = await findComputer(m);
                    if (computer) {
                        await closeActiveSessions(computer.computer_id);
                        await syncComputerStatus(computer, ComputerStatus.OFFLINE);
                    }
                    console.log(
                        `[Socket.IO] Machine ${m.machineId} timed out (no heartbeat for > ${HEARTBEAT_TIMEOUT_MS / 1000}s). Status set to OFFLINE.`
                    );
                }
                timedOutMachines.forEach(broadcastMachineUpdate);
            }
        } catch (err) {
            console.error('[Socket.IO] Error checking heartbeat timeout:', err);
        }
    }, HEARTBEAT_CHECK_INTERVAL_MS);

    if (timeoutInterval.unref) {
        timeoutInterval.unref();
    }

    async function findComputer(machine) {
        if (!machine) return null;
        const orConditions = [];

        if (machine.localIp) {
            orConditions.push({ ip_address: machine.localIp });
        }
        if (machine.macAddress) {
            orConditions.push({ mac_address: machine.macAddress });
        }

        if (orConditions.length === 0) return null;
        return Computer.findOne({
            where: {
                [Op.or]: orConditions
            }
        });
    }

    async function syncComputerStatus(computer, status, memberId = null) {
        if (!computer || !Object.values(ComputerStatus).includes(status)) return;
        const previousStatus = computer.status;
        if (previousStatus === status) return;

        computer.status = status;
        await computer.save();
        await recordStatusChange(computer, previousStatus, status, memberId);
    }

    async function closeActiveSessions(computerId) {
        await db.RentalSession.update(
            {
                status: db.RentalSession.Status.LOGGED_OUT,
                ended_at: new Date()
            },
            {
                where: {
                    computer_id: computerId,
                    status: db.RentalSession.Status.ACTIVE
                }
            }
        );
    }

    io.on('connection', (socket) => {

        console.log(
            `[Socket.IO] New connection established: ${socket.id}`
        );
        socket.emit('machines:list', machineStore.getAll());

        // ========================================
        // 1. Agent Registration
        // ========================================

        socket.on('register', async (data) => {
            if (!data || !data.machineId) {
                console.warn(`[Socket.IO] Invalid register payload from socket ${socket.id}`);
                return;
            }

            console.log(
                `[Socket.IO] Register received from machine: ` +
                `${data.machineId} (IP: ${data.localIp}, MAC: ${data.macAddress})`
            );

            const machine =
                machineStore.register(
                    socket.id,
                    data
                );

            if (!machine) {
                return;
            }
            const computer = await findComputer(machine);
            if (computer) {
                let activeSession = await db.RentalSession.findOne({
                    where: {
                        computer_id: computer.computer_id,
                        status: db.RentalSession.Status.ACTIVE
                    },
                    include: [{
                        model: db.Member,
                        as: 'member',
                        include: [{ model: db.User, as: 'userInfo', attributes: ['username'] }]
                    }]
                });

                const hasActiveLocalSession = data.status === ComputerStatus.IN_USE;
                if (!activeSession && hasActiveLocalSession && data.memberId) {
                    const member = await db.Member.findByPk(data.memberId);
                    if (member) {
                        await billingService.startSession({
                            memberId: data.memberId,
                            computerId: computer.computer_id,
                            startedAt: data.sessionStartedAt
                                ? new Date(data.sessionStartedAt)
                                : new Date()
                        });
                        activeSession = await db.RentalSession.findOne({
                            where: {
                                computer_id: computer.computer_id,
                                status: db.RentalSession.Status.ACTIVE
                            },
                            include: [{
                                model: db.Member,
                                as: 'member',
                                include: [{ model: db.User, as: 'userInfo', attributes: ['username'] }]
                            }]
                        });
                    }
                }
                const previousStatus = computer.status;
                if (activeSession && hasActiveLocalSession) {
                    computer.status = ComputerStatus.IN_USE;
                } else if (computer.status !== ComputerStatus.MAINTENANCE) {
                    if (activeSession) {
                        await closeActiveSessions(computer.computer_id);
                    }
                    computer.status = data.status || ComputerStatus.ONLINE;
                }

                await computer.save();
                await recordStatusChange(
                    computer,
                    previousStatus,
                    computer.status,
                    null
                );
                machine.currentUser = hasActiveLocalSession
                    ? activeSession?.member?.userInfo?.username || null
                    : null;
                machine.memberId = hasActiveLocalSession
                    ? activeSession?.member_id || null
                    : null;
                machine.sessionStartedAt = hasActiveLocalSession
                    ? activeSession?.started_at || null
                    : null;

                // Fail-closed security: if no active session, ensure overlay lock is maintained on agent
                if (!hasActiveLocalSession) {
                    try {
                        const computerSocketService = require('../services/computerSocketService');
                        computerSocketService.logout(data.machineId);
                    } catch (sockErr) {
                        // socket error ignored during initial register
                    }
                }
            }
            socket.join(
                `machine:${data.machineId}`
            );

            broadcastMachineUpdate(machine);

            if (data.status === ComputerStatus.IN_USE && data.memberId) {
                try {
                    const computerSocketService = require('../services/computerSocketService');
                    computerSocketService.syncMemberSessionTime(data.memberId).catch(() => {});
                } catch (syncErr) {
                    // socket error ignored during initial register
                }
            }
        });


        // ========================================
        // 2. Heartbeat
        // ========================================

        socket.on('heartbeat', async (data) => {
            if (!data) return;

            const machine =
                machineStore.updateHeartbeat(
                    socket.id,
                    data
                );

            if (machine) {
                    if (machine.currentUser && !machine.memberId) {
                        const user = await db.User.findOne({
                            where: { username: machine.currentUser },
                            attributes: ['user_id'],
                            include: [{
                                model: db.Member,
                                as: 'memberProfile',
                                attributes: ['member_id'],
                                required: false
                            }]
                        });
                        machine.memberId = user?.memberProfile?.member_id || null;
                    }
                    const computer = await findComputer(machine);
                    if (computer && Object.values(ComputerStatus).includes(data.status)) {
                        if (data.status === ComputerStatus.OFFLINE) {
                            await closeActiveSessions(computer.computer_id);
                        }
                        await syncComputerStatus(computer, data.status);
                    }
                    io.emit(
                    'machine:heartbeat',
                    {
                        machineId: machine.machineId,
                        localIp: machine.localIp,
                        macAddress: machine.macAddress,
                        performance: machine.performance
                    }
                );
                    broadcastMachineUpdate(machine);
            }
        });


        // ========================================
        // 3. Status Update
        // ========================================

        socket.on('status:update', async (data) => {
            if (!data || !data.machineId) return;

            console.log(
                `[Socket.IO] Status update for ` +
                `${data.machineId}: ` +
                `${data.previousStatus} -> ${data.status}`
            );

            const currentMachine = machineStore.get(data.machineId);
            const computer = await findComputer(currentMachine);
            const activeSession = computer
                ? await db.RentalSession.findOne({
                    where: {
                        computer_id: computer.computer_id,
                        status: db.RentalSession.Status.ACTIVE
                    }
                })
                : null;

            if (
                data.status === ComputerStatus.ONLINE &&
                currentMachine?.status === ComputerStatus.IN_USE &&
                activeSession
            ) {
                console.warn(
                    `[Socket.IO] Ignoring stale ONLINE status for ${data.machineId}; ` +
                    `an active rental session still exists.`
                );
                return;
            }

            const updated = machineStore.updateStatus(
                socket.id,
                data
            );
            const updatedComputer = await findComputer(updated);
            if (updatedComputer) {
                if (data.status === ComputerStatus.OFFLINE) {
                    await closeActiveSessions(updatedComputer.computer_id);
                }
                await syncComputerStatus(
                    updatedComputer,
                    data.status || ComputerStatus.ONLINE
                );
            }

            if (updated) {
                broadcastMachineUpdate(updated);
            }
        });


        // ========================================
        // 4. Login ACK
        // ========================================

        socket.on('login:ack', async (data) => {
            if (!data || !data.machineId) return;

            console.log(
                `[Socket.IO] Login ACK from ` +
                `${data.machineId}: ` +
                `Success=${data.success}, ` +
                `User=${data.username}` +
                (data.error ? `, Error=${data.error}` : '')
            );

            if (
                data.success &&
                data.username
            ) {
                const machine =
                    machineStore.get(
                        data.machineId
                    );

                // Chỉ cho phép cập nhật nếu ACK gửi từ đúng socket hiện tại của machine
                if (machine && machine.socketId === socket.id) {
                    const computer = await findComputer(machine);
                    if (!computer) {
                        socket.emit('session:reject', {
                            code: 'MACHINE_NOT_FOUND',
                            message: 'Không tìm thấy máy trạm đã đăng ký.'
                        });
                        return;
                    }
                    const user = await db.User.findOne({
                        where: { username: data.username },
                        include: [{
                            model: db.Member,
                            as: 'memberProfile',
                            attributes: ['member_id'],
                            required: false
                        }]
                    });
                    const memberId = user?.memberProfile?.member_id || null;
                    if (!memberId) {
                        socket.emit('session:reject', {
                            code: 'MEMBER_REQUIRED',
                            message: 'Tài khoản chưa có hồ sơ hội viên.'
                        });
                        return;
                    }

                    const authorization = await billingService.authorizeLogin({
                        username: data.username,
                        computerId: computer.computer_id
                    });
                    if (!authorization.allowed) {
                        socket.emit('session:reject', {
                            code: authorization.code,
                            message: authorization.message
                        });
                        return;
                    }

                    const rentalSession = await billingService.startSession({
                        memberId,
                        computerId: computer.computer_id,
                        combo: authorization.combo
                    });
                    machine.status = 'IN_USE';
                    machine.currentUser =
                        data.username;
                    machine.memberId = memberId;
                    machine.sessionStartedAt = rentalSession.started_at;
                    machine.lastStatusChange = new Date().toISOString();
                    if (computer) {
                        const previousStatus = computer.status;
                        computer.status = ComputerStatus.IN_USE;
                        await computer.save();
                        await recordStatusChange(
                            computer,
                            previousStatus,
                            ComputerStatus.IN_USE,
                            memberId
                        );
                    }
                    broadcastMachineUpdate(machine);
                    try {
                        const computerSocketService = require('../services/computerSocketService');
                        computerSocketService.syncMemberSessionTime(memberId).catch(() => {});
                    } catch (syncErr) {
                        // ignored
                    }
                }
            }
        });


        // ========================================
        // 5. Logout ACK & Client Logout
        // ========================================

        const handleLogout = async (data) => {
            const machineId = data?.machineId || machineStore.socketMap.get(socket.id);
            if (!machineId) return;

            console.log(
                `[Socket.IO] Logout event from ` +
                `${machineId}: ` +
                `Success=${data?.success !== false}` +
                (data?.error ? `, Error=${data.error}` : '')
            );

            if (data?.success !== false) {
                const machine = machineStore.get(machineId);

                // Chỉ cho phép cập nhật nếu gửi từ đúng socket hiện tại của machine
                if (machine && machine.socketId === socket.id) {
                    const computer = await findComputer(machine);
                    if (computer) {
                        // Lấy thông tin user / member trước khi xóa khỏi machine
                        let memberId = null;
                        const usernameToLog = data?.username || machine.currentUser;
                        if (usernameToLog) {
                            const user = await db.User.findOne({
                                where: { username: usernameToLog },
                                attributes: ['user_id'],
                                include: [{
                                    model: db.Member,
                                    as: 'memberProfile',
                                    attributes: ['member_id'],
                                    required: false
                                }]
                            });
                            memberId = user?.memberProfile?.member_id || null;
                        }
                        if (memberId) {
                            await db.RentalSession.update(
                                {
                                    status: db.RentalSession.Status.LOGGED_OUT,
                                    ended_at: new Date()
                                },
                                {
                                    where: {
                                        computer_id: computer.computer_id,
                                        member_id: memberId,
                                        status: db.RentalSession.Status.ACTIVE
                                    }
                                }
                            );
                        }

                        await syncComputerStatus(computer, ComputerStatus.ONLINE, memberId);
                    }
                    machine.status = ComputerStatus.ONLINE;
                    machine.currentUser = null;
                    machine.memberId = null;
                    machine.sessionStartedAt = null;
                    machine.remainingMinutes = null;
                    machine.lastStatusChange = new Date().toISOString();

                    broadcastMachineUpdate(machine);
                }
            }
        };

        socket.on('logout:ack', handleLogout);
        socket.on('client:logout', handleLogout);


        // ========================================
        // 6. Command ACK
        // ========================================

        socket.on('command:ack', async (data) => {
            if (!data) return;

            console.log(
                `[Socket.IO] Command ACK from ` +
                `${data.machineId}: ` +
                `Command=${data.command}, ` +
                `Success=${data.success}` +
                (data.error ? `, Error=${data.error}` : '')
            );
        });


        // ========================================
        // 7. Disconnect
        // ========================================

        socket.on('disconnect', async (reason) => {

            console.log(
                `[Socket.IO] Connection closed: ${socket.id} (Reason: ${reason})`
            );

            const disconnected =
                machineStore.handleDisconnect(
                    socket.id
                );

            if (disconnected) {

                console.log(
                    `[Socket.IO] Machine marked OFFLINE: ` +
                    `${disconnected.machineId}`
                );
                const computer = await findComputer(disconnected.machine);
                if (computer) {
                    await closeActiveSessions(computer.computer_id);
                    await syncComputerStatus(computer, ComputerStatus.OFFLINE);
                }
                broadcastMachineUpdate(disconnected.machine);
            }
        });

    });
}

module.exports = registerMachineSocket;