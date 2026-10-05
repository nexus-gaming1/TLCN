class MachineStore {
    constructor() {
        // machineId -> MachineData
        this.machines = new Map();

        // socketId -> machineId
        this.socketMap = new Map();
    }

    register(socketId, data) {
        const machineId = data?.machineId;

        if (!machineId) {
            return null;
        }

        const existing = this.machines.get(machineId) || {};

        // Nếu machine trước đó đang gắn với socket khác (reconnect),
        // xoá ánh xạ của socket cũ khỏi socketMap để socket cũ không thể thao tác nữa
        if (existing.socketId && existing.socketId !== socketId) {
            this.socketMap.delete(existing.socketId);
        }

        const now = new Date().toISOString();
        const updated = {
            ...existing,
            machineId: data.machineId,
            hostname: data.hostname || existing.hostname || 'Unknown',
            localIp: data.localIp || existing.localIp || '127.0.0.1',
            macAddress: data.macAddress || existing.macAddress || null,
            windowsUser: data.windowsUser || existing.windowsUser || null,
            status: data.status || 'ONLINE',
            currentUser: existing.currentUser || null,
            performance: existing.performance || null,
            socketId,
            connectedAt:
                existing.connectedAt || now,
            lastHeartbeat: now
        };

        this.machines.set(machineId, updated);
        this.socketMap.set(socketId, machineId);

        return updated;
    }

    updateHeartbeat(socketId, data) {
        const machineId =
            data?.machineId || this.socketMap.get(socketId);

        if (
            !machineId ||
            !this.machines.has(machineId)
        ) {
            return null;
        }

        const machine = this.machines.get(machineId);

        // Chỉ chấp nhận heartbeat từ socket hiện tại của machine
        if (!machine.socketId || machine.socketId !== socketId) {
            return null;
        }

        machine.status =
            data.status || machine.status;

        machine.currentUser =
            data.username !== undefined
                ? (data.username || null)
                : machine.currentUser;

        machine.performance =
            data.performance || machine.performance;

        // Cập nhật lastHeartbeat theo server time để tính timeout chuẩn xác
        machine.lastHeartbeat = new Date().toISOString();

        this.machines.set(machineId, machine);

        return machine;
    }

    updateStatus(socketIdOrMachineId, statusOrData, previousStatus) {
        let socketId = null;
        let machineId = null;
        let status = null;
        let prevStatus = null;

        if (typeof statusOrData === 'object' && statusOrData !== null) {
            socketId = socketIdOrMachineId;
            machineId = statusOrData.machineId || this.socketMap.get(socketId);
            status = statusOrData.status;
            prevStatus = statusOrData.previousStatus;
        } else {
            machineId = socketIdOrMachineId;
            status = statusOrData;
            prevStatus = previousStatus;
        }

        if (!machineId || !this.machines.has(machineId)) {
            return null;
        }

        const machine = this.machines.get(machineId);

        // Chỉ chấp nhận cập nhật từ socket hiện tại của machine (nếu có socketId)
        if (socketId && machine.socketId && machine.socketId !== socketId) {
            return null;
        }

        const now = new Date().toISOString();
        machine.previousStatus = prevStatus || machine.status;
        machine.status = status || machine.status;
        machine.lastStatusChange = now;
        machine.lastHeartbeat = now;

        if (machine.status === 'ONLINE') {
            machine.currentUser = null;
        }

        this.machines.set(machineId, machine);

        return machine;
    }

    handleDisconnect(socketId) {
        const machineId =
            this.socketMap.get(socketId);

        this.socketMap.delete(socketId);

        if (
            machineId &&
            this.machines.has(machineId)
        ) {
            const machine =
                this.machines.get(machineId);

            // Chỉ set OFFLINE nếu socket hiện tại đúng là socket đã disconnect
            if (machine.socketId === socketId) {
                machine.previousStatus = machine.status;
                machine.status = 'OFFLINE';
                machine.socketId = null;
                machine.disconnectedAt =
                    new Date().toISOString();

                this.machines.set(
                    machineId,
                    machine
                );

                return {
                    machineId,
                    machine
                };
            }
        }

        return null;
    }

    checkHeartbeatTimeout(timeoutMs = 15000) {
        const now = Date.now();
        const timedOutMachines = [];

        for (const [machineId, machine] of this.machines.entries()) {
            if (machine.status !== 'OFFLINE') {
                const lastHeartbeatTime = machine.lastHeartbeat
                    ? new Date(machine.lastHeartbeat).getTime()
                    : 0;

                if (now - lastHeartbeatTime > timeoutMs) {
                    machine.previousStatus = machine.status;
                    machine.status = 'OFFLINE';
                    machine.disconnectedAt = new Date().toISOString();

                    this.machines.set(machineId, machine);
                    timedOutMachines.push(machine);
                }
            }
        }

        return timedOutMachines;
    }

    get(machineId) {
        return this.machines.get(machineId);
    }

    getAll() {
        const obj = {};

        for (const [id, data] of this.machines.entries()) {
            obj[id] = data;
        }

        return obj;
    }
}

module.exports = new MachineStore();