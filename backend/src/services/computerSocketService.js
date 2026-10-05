class ComputerSocketService {
    constructor() {
        this.io = null;
    }

    /**
     * Khởi tạo Socket.IO instance
     */
    init(io) {
        this.io = io;
    }

    /**
     * Kiểm tra Socket.IO đã được khởi tạo chưa
     */
    ensureInitialized() {
        if (!this.io) {
            throw new Error('ComputerSocketService chưa được khởi tạo Socket.IO');
        }
    }

    /**
     * Gửi lệnh đăng nhập đến PC Agent
     */
    login(machineId, username) {
        this.ensureInitialized();

        this.io
            .to(`machine:${machineId}`)
            .emit('session:login', {
                command: 'LOGIN',
                username
            });
    }

    /**
     * Gửi lệnh đăng xuất đến PC Agent
     */
    logout(machineId) {
        this.ensureInitialized();

        this.io
            .to(`machine:${machineId}`)
            .emit('session:logout', {
                command: 'LOGOUT'
            });
    }

    /**
     * Gửi command đến PC Agent
     */
    sendCommand(machineId, command, message = null) {
        this.ensureInitialized();

        this.io
            .to(`machine:${machineId}`)
            .emit('command', {
                command,
                message
            });
    }

    /**
     * Gửi notification đến PC Agent
     */
    sendNotification(
        machineId,
        title,
        message,
        durationSeconds = 5
    ) {
        this.ensureInitialized();

        this.io
            .to(`machine:${machineId}`)
            .emit('notification', {
                title,
                message,
                durationSeconds
            });
    }

    /**
     * Gửi notification đến tất cả PC Agent
     */
    broadcastNotification(
        title,
        message,
        durationSeconds = 5
    ) {
        this.ensureInitialized();

        this.io.emit('notification', {
            title,
            message,
            durationSeconds
        });
    }

    /**
     * Gửi command đến tất cả PC Agent
     */
    broadcastCommand(command, message = null) {
        this.ensureInitialized();

        this.io.emit('command', {
            command,
            message
        });
    }
}

module.exports = new ComputerSocketService();