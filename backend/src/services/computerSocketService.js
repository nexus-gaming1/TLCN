const machineStore = require('../stores/machineStore');
const db = require('../models');

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
     * Đồng bộ và phát socket cập nhật thời gian chơi còn lại & số dư của hội viên
     * Phục vụ cập nhật real-time trên Web Admin Dashboard và NexusControl sau khi nạp / rút tiền
     * @param {number|string} memberId
     */
    async syncMemberSessionTime(memberId) {
        if (!memberId) return null;
        try {
            const parsedMemberId = parseInt(memberId, 10);
            if (isNaN(parsedMemberId)) return null;

            const member = await db.Member.findByPk(parsedMemberId, {
                include: [{
                    model: db.User,
                    as: 'userInfo',
                    attributes: ['user_id', 'username', 'full_name']
                }]
            });
            if (!member) return null;

            const activeSessions = await db.RentalSession.findAll({
                where: {
                    member_id: parsedMemberId,
                    status: db.RentalSession.Status.ACTIVE
                },
                include: [
                    {
                        model: db.Computer,
                        as: 'computer',
                        include: [{
                            model: db.ComputerZone,
                            include: [{
                                model: db.PricingPlan,
                                where: { is_active: true },
                                required: false
                            }]
                        }]
                    },
                    {
                        model: db.ComboTime,
                        as: 'comboTime'
                    }
                ]
            });

            const updatedSessions = [];
            const now = new Date();
            const realBal = Number(member.real_balance || 0);
            const bonusBal = Number(member.bonus_balance || 0);
            const totalBal = realBal + bonusBal;

            for (const session of activeSessions) {
                const computer = session.computer;
                if (!computer) continue;

                const zone = computer.ComputerZone;
                const pricingPlans = (zone?.PricingPlans || [])
                    .slice()
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
                const pricingPlan = pricingPlans[0];
                const hourlyRate = pricingPlan?.price_per_hour != null ? Number(pricingPlan.price_per_hour) : null;

                const comboEndTime = session.comboTime?.end_time
                    ? new Date(session.comboTime.end_time)
                    : null;

                const remainingMinutes = comboEndTime
                    ? Math.max(0, Math.ceil((comboEndTime.getTime() - now.getTime()) / 60000))
                    : hourlyRate && hourlyRate > 0
                        ? Math.max(0, Math.floor((totalBal / hourlyRate) * 60))
                        : null;

                let machine = machineStore.get(computer.computer_name);
                if (!machine) {
                    for (const m of machineStore.machines.values()) {
                        if (
                            m.localIp === computer.ip_address ||
                            m.macAddress === computer.mac_address ||
                            m.machineId === computer.computer_name
                        ) {
                            machine = m;
                            break;
                        }
                    }
                }

                const machineData = {
                    machineId: machine?.machineId || computer.computer_name,
                    computerId: computer.computer_id,
                    computerName: computer.computer_name,
                    localIp: machine?.localIp || computer.ip_address,
                    macAddress: machine?.macAddress || computer.mac_address,
                    status: computer.status || 'IN_USE',
                    currentUser: member.userInfo?.username || machine?.currentUser,
                    memberId: member.member_id,
                    sessionStartedAt: session.started_at,
                    remainingMinutes,
                    hasActiveCombo: Boolean(session.comboTime),
                    realBalance: realBal,
                    bonusBalance: bonusBal,
                    totalBalance: totalBal,
                    hourlyRate
                };

                if (machine) {
                    Object.assign(machine, machineData);
                    machineStore.machines.set(machine.machineId, machine);
                }

                if (this.io) {
                    this.io.emit('machine:updated', machineData);
                    this.io.emit('session:time_updated', {
                        computerId: computer.computer_id,
                        machineId: computer.computer_name,
                        memberId: member.member_id,
                        remainingMinutes,
                        realBalance: realBal,
                        bonusBalance: bonusBal,
                        totalBalance: totalBal,
                        hasActiveCombo: Boolean(session.comboTime)
                    });
                }

                updatedSessions.push(machineData);
            }

            if (this.io) {
                this.io.emit('member:balance_updated', {
                    memberId: member.member_id,
                    realBalance: realBal,
                    bonusBalance: bonusBal,
                    totalBalance: totalBal
                });
            }

            return updatedSessions;
        } catch (error) {
            console.error('[ComputerSocketService] Lỗi khi syncMemberSessionTime:', error);
            return null;
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