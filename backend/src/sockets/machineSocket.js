const machineStore = require('../stores/machineStore');

const HEARTBEAT_TIMEOUT_MS = 15000;
const HEARTBEAT_CHECK_INTERVAL_MS = 5000;

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
    const timeoutInterval = setInterval(() => {
        try {
            const timedOutMachines = machineStore.checkHeartbeatTimeout(HEARTBEAT_TIMEOUT_MS);
            if (timedOutMachines.length > 0) {
                for (const m of timedOutMachines) {
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

    io.on('connection', (socket) => {

        console.log(
            `[Socket.IO] New connection established: ${socket.id}`
        );

        // ========================================
        // 1. Agent Registration
        // ========================================

        socket.on('register', (data) => {
            if (!data || !data.machineId) {
                console.warn(`[Socket.IO] Invalid register payload from socket ${socket.id}`);
                return;
            }

            console.log(
                `[Socket.IO] Register received from machine: ` +
                `${data.machineId} (IP: ${data.localIp})`
            );

            const machine =
                machineStore.register(
                    socket.id,
                    data
                );

            if (!machine) {
                return;
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

        socket.on('status:update', (data) => {
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

            if (updated) {
                broadcastUpdate();
            }
        });


        // ========================================
        // 4. Login ACK
        // ========================================

        socket.on('login:ack', (data) => {
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

                    broadcastUpdate();
                }
            }
        });


        // ========================================
        // 5. Logout ACK
        // ========================================

        socket.on('logout:ack', (data) => {
            if (!data || !data.machineId) return;

            console.log(
                `[Socket.IO] Logout ACK from ` +
                `${data.machineId}: ` +
                `Success=${data.success}` +
                (data.error ? `, Error=${data.error}` : '')
            );

            if (data.success) {
                const machine =
                    machineStore.get(
                        data.machineId
                    );

                // Chỉ cho phép cập nhật nếu ACK gửi từ đúng socket hiện tại của machine
                if (machine && machine.socketId === socket.id) {
                    machine.status = 'ONLINE';
                    machine.currentUser = null;
                    machine.lastStatusChange = new Date().toISOString();

                    broadcastUpdate();
                }
            }
        });


        // ========================================
        // 6. Command ACK
        // ========================================

        socket.on('command:ack', (data) => {
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

        socket.on('disconnect', (reason) => {

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

                broadcastUpdate();
            }
        });

    });
}

module.exports = registerMachineSocket;