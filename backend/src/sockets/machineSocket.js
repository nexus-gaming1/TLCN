const machineStore = require('../stores/machineStore');
const db = require('../models');
const Computer = db.Computer;
const { Op } = require('sequelize');
const HEARTBEAT_TIMEOUT_MS = 15000;
const HEARTBEAT_CHECK_INTERVAL_MS = 5000;
const ComputerStatus = require('../constants/enums').ComputerStatus;
const { recordStatusChange } = require('../services/computerStatusLogService');

function registerMachineSocket(io) {

    function broadcastUpdate() {
        io.emit(
            'machines:list',
            machineStore.getAll()
        );
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
                        const previousStatus = computer.status;
                        computer.status = ComputerStatus.OFFLINE;
                        await computer.save();
                        await recordStatusChange(
                            computer,
                            previousStatus,
                            ComputerStatus.OFFLINE,
                            null
                        );
                    }
                    console.log(
                        `[Socket.IO] Machine ${m.machineId} timed out (no heartbeat for > ${HEARTBEAT_TIMEOUT_MS / 1000}s). Status set to OFFLINE.`
                    );
                }
                broadcastUpdate();
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

    io.on('connection', (socket) => {

        console.log(
            `[Socket.IO] New connection established: ${socket.id}`
        );

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
                const activeCombo = await db.ComboTime.findOne({
                    where: {
                        computer_id: computer.computer_id,
                        status: 'ACTIVE',
                        end_time: { [Op.gt]: new Date() }
                    }
                });

                const previousStatus = computer.status;
                if (activeCombo) {
                    computer.status = ComputerStatus.IN_USE;
                } else if (computer.status !== ComputerStatus.MAINTENANCE) {
                    computer.status = data.status || ComputerStatus.ONLINE;
                }

                await computer.save();
                await recordStatusChange(
                    computer,
                    previousStatus,
                    computer.status,
                    null
                );

                // Fail-closed security: if no active session, ensure overlay lock is maintained on agent
                if (!activeCombo) {
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

            broadcastUpdate();
        });


        // ========================================
        // 2. Heartbeat
        // ========================================

        socket.on('heartbeat', (data) => {
            if (!data) return;

            const machine =
                machineStore.updateHeartbeat(
                    socket.id,
                    data
                );

            if (machine) {
                io.emit(
                    'machine:heartbeat',
                    {
                        machineId: machine.machineId,
                        performance: machine.performance
                    }
                );
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

            const updated = machineStore.updateStatus(
                socket.id,
                data
            );
            const computer = await findComputer(updated);
            if (computer) {
                const previousStatus = computer.status;
                computer.status = data.status || ComputerStatus.ONLINE;
                await computer.save();
                await recordStatusChange(
                    computer,
                    previousStatus,
                    computer.status,
                    null
                );
            }

            if (updated) {
                broadcastUpdate();
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
                    machine.status = 'IN_USE';
                    machine.currentUser =
                        data.username;
                    machine.lastStatusChange = new Date().toISOString();
                    const computer = await findComputer(machine);
                    if (computer) {
                        const previousStatus = computer.status;
                        computer.status = ComputerStatus.IN_USE;
                        await computer.save();
                        const user = await db.User.findOne({
                            where: { username: data.username },
                            attributes: ['user_id'],
                            include: [{
                                model: db.Member,
                                as: 'memberProfile',
                                attributes: ['member_id'],
                                required: false
                            }]
                        });
                        const memberId = user?.memberProfile?.member_id || null;
                        await recordStatusChange(
                            computer,
                            previousStatus,
                            ComputerStatus.IN_USE,
                            memberId
                        );
                    }
                    broadcastUpdate();
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
                        const previousStatus = computer.status;
                        computer.status = ComputerStatus.ONLINE;
                        await computer.save();

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

                        await recordStatusChange(
                            computer,
                            previousStatus,
                            ComputerStatus.ONLINE,
                            memberId
                        );
                    }
                    machine.status = ComputerStatus.ONLINE;
                    machine.currentUser = null;
                    machine.lastStatusChange = new Date().toISOString();

                    broadcastUpdate();
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
                    const previousStatus = computer.status;
                    computer.status = ComputerStatus.OFFLINE;
                    await computer.save();
                    await recordStatusChange(
                        computer,
                        previousStatus,
                        ComputerStatus.OFFLINE,
                        null
                    );
                }
                broadcastUpdate();
            }
        });

    });
}

module.exports = registerMachineSocket;