const bcrypt = require('bcryptjs');
const db = require('../models');
const { UserRole, UserStatus } = require('../constants/enums');

class MemberService {
  /**
   * Lấy danh sách hội viên kèm thông tin User, MembershipRank & Trạng thái máy
   */
  async getAllMembers() {
    try {
      const members = await db.Member.findAll({
        include: [
          {
            model: db.User,
            as: 'userInfo',
            where: { is_deleted: false },
            attributes: ['user_id', 'username', 'full_name', 'role', 'status', 'last_login']
          },
          {
            model: db.MembershipRank,
            attributes: ['rank_id', 'name', 'discount_percent', 'rank_level', 'required_point']
          },
          {
            model: db.ComputerStatusLog,
            required: false,
            order: [['recorded_at', 'DESC']],
            limit: 1,
            include: [
              {
                model: db.Computer,
                attributes: ['computer_id', 'computer_name', 'status']
              }
            ]
          }
        ],
        order: [['member_id', 'ASC']]
      });

      return members.map((m) => {
        const latestLog = m.ComputerStatusLogs && m.ComputerStatusLogs[0];
        const comp = latestLog ? latestLog.Computer : null;

        // Trích xuất thời điểm đăng nhập gần nhất:
        // 1. Từ userInfo.last_login (nếu có bản ghi đăng nhập thực tế)
        // 2. Hoặc từ latestLog.recorded_at / latestLog.start_time khi máy đang được sử dụng
        // 3. Nếu đang ngồi máy (comp) mà chưa có timestamp, fallback thời điểm hiện tại
        const resolvedLastLogin = (m.userInfo && m.userInfo.last_login)
          ? m.userInfo.last_login
          : (latestLog && (latestLog.recorded_at || latestLog.start_time || latestLog.createdAt))
          ? (latestLog.recorded_at || latestLog.start_time || latestLog.createdAt)
          : (comp ? new Date().toISOString() : null);

        return {
          id: m.member_id,
          uid: `#MB-${String(m.member_id).padStart(3, '0')}`,
          name: (m.userInfo && m.userInfo.full_name) ? m.userInfo.full_name : 'Hội Viên',
          username: m.userInfo ? (m.userInfo.username || '') : '',
          full_name: m.userInfo ? (m.userInfo.full_name || '') : '',
          email: `${(m.userInfo && m.userInfo.username) ? m.userInfo.username : 'user'}@cyber.vn`,
          phone: m.phone || 'Chưa cập nhật',
          status: (m.userInfo && m.userInfo.status) ? m.userInfo.status : 'ACTIVE',
          rank_id: m.rank_id,
          rank_name: m.MembershipRank ? m.MembershipRank.name : 'Đồng',
          rank_level: m.MembershipRank ? m.MembershipRank.rank_level : 1,
          discount_percent: m.MembershipRank ? parseFloat(m.MembershipRank.discount_percent || 0) : 0,
          real_balance: parseFloat(m.real_balance || 0),
          bonus_balance: parseFloat(m.bonus_balance || 0),
          points: m.point || 0,
          station_name: comp ? comp.computer_name : null,
          station_status: comp ? comp.status : null,
          created_at: m.created_at || new Date().toISOString(),
          last_login: resolvedLastLogin
        };
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách hội viên:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết hội viên theo ID
   */
  async getMemberById(memberId) {
    try {
      const member = await db.Member.findByPk(memberId, {
        include: [
          {
            model: db.User,
            as: 'userInfo',
            where: { is_deleted: false },
            attributes: ['user_id', 'username', 'full_name', 'role', 'status', 'last_login']
          },
          {
            model: db.MembershipRank
          }
        ]
      });
      return member;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết hội viên:', error);
      throw error;
    }
  }

  /**
   * Chỉnh sửa thông tin hồ sơ cơ bản (Họ tên, Số điện thoại)
   */
  async updateMemberInfo(memberId, { full_name, fullName, phone_number, phone }) {
    try {
      const member = await db.Member.findByPk(memberId);
      if (!member) return null;

      const user = await db.User.findByPk(memberId);
      if (user) {
        let userDirty = false;
        const newName = full_name !== undefined ? full_name : fullName;
        if (newName !== undefined) {
          user.full_name = newName;
          userDirty = true;
        }
        if (userDirty) {
          await user.save();
        }
      }

      const newPhone = phone !== undefined ? phone : phone_number;
      if (newPhone !== undefined) {
        member.phone = newPhone && newPhone.trim() ? newPhone.trim() : null;
        await member.save();
      }

      return {
        ...member.toJSON(),
        full_name: user ? user.full_name : null,
        userInfo: user ? user.toJSON() : null
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin hội viên:', error);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái tài khoản (ACTIVE, INACTIVE, LOCKED, BANNED)
   */
  async updateAccountStatus(memberId, status) {
    try {
      const allowedStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED', 'BANNED'];
      if (!allowedStatuses.includes(status)) {
        throw new Error('Trạng thái tài khoản không hợp lệ');
      }

      const member = await db.Member.findByPk(memberId);
      if (!member) return null;

      const user = await db.User.findByPk(memberId);
      if (!user) return null;

      user.status = status;
      await user.save();

      return {
        ...member.toJSON(),
        status: user.status,
        userInfo: user.toJSON()
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái tài khoản:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả các hạng thành viên từ database (membership_rank)
   */
  async getAllRanks() {
    try {
      return await db.MembershipRank.findAll({
        order: [['rank_level', 'ASC']]
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách hạng hội viên:', error);
      throw error;
    }
  }

  /**
   * Tạo tài khoản hội viên mới và lưu trực tiếp vào CSDL MySQL
   */
  async createMember({ username, fullName, password, phone, tier, deposit, rank_id, rankId }) {
    try {
      if (!username || !username.trim()) {
        throw new Error('Tên đăng nhập không được để trống');
      }
      if (!fullName || !fullName.trim()) {
        throw new Error('Họ và tên hội viên không được để trống');
      }

      const cleanUsername = username.trim();
      const existingUser = await db.User.findOne({
        where: { username: cleanUsername }
      });
      if (existingUser) {
        throw new Error('Tên đăng nhập đã tồn tại trong hệ thống');
      }

      const rawPassword = password && password.trim() ? password.trim() : '123456';
      const hashedPassword = bcrypt.hashSync(rawPassword, 10);

      const newUser = await db.User.create({
        username: cleanUsername,
        password_hash: hashedPassword,
        full_name: fullName.trim(),
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE
      });

      // Tìm thông tin hạng trực tiếp từ database (hỗ trợ rank_id hoặc tên hạng)
      let rank = null;
      const targetRankId = rank_id || rankId;
      if (targetRankId) {
        rank = await db.MembershipRank.findByPk(targetRankId);
      }
      if (!rank && tier) {
        const tierNameMap = {
          diamond: 'Kim Cương',
          gold: 'Vàng',
          silver: 'Bạc',
          normal: 'Đồng'
        };
        const searchName = tierNameMap[tier] || tier;
        rank = await db.MembershipRank.findOne({
          where: db.Sequelize.where(
            db.Sequelize.fn('LOWER', db.Sequelize.col('name')),
            searchName.toLowerCase()
          )
        });
      }
      if (!rank) {
        rank = await db.MembershipRank.findOne({ order: [['rank_level', 'ASC']] }) || {
          rank_id: 1,
          name: 'Đồng',
          discount_percent: 0.00
        };
      }

      const depositAmount = parseFloat(deposit) || 0;
      const bonusRate = parseFloat(rank.discount_percent || 0) / 100;
      const bonusAmount = Math.round(depositAmount * bonusRate);
      const points = Math.floor(depositAmount / 1000);

      const newMember = await db.Member.create({
        member_id: newUser.user_id,
        phone: phone && phone.trim() ? phone.trim() : null,
        real_balance: depositAmount,
        bonus_balance: bonusAmount,
        point: points,
        rank_id: rank.rank_id
      });

      return {
        id: newMember.member_id,
        uid: `#MB-${String(newMember.member_id).padStart(3, '0')}`,
        name: newUser.full_name,
        username: newUser.username,
        full_name: newUser.full_name,
        email: `${newUser.username}@cyber.vn`,
        phone: newMember.phone || 'Chưa cập nhật',
        status: newUser.status,
        rank_id: newMember.rank_id,
        rank_name: rank.name,
        real_balance: parseFloat(newMember.real_balance || 0),
        bonus_balance: parseFloat(newMember.bonus_balance || 0),
        points: newMember.point || 0,
        station_name: null,
        station_status: null,
        created_at: new Date().toISOString(),
        last_login: null
      };
    } catch (error) {
      console.error('Lỗi khi tạo tài khoản hội viên:', error);
      throw error;
    }
  }

  /**
   * Xóa mềm tài khoản hội viên (Soft Delete)
   */
  async deleteMember(memberId) {
    try {
      const user = await db.User.findByPk(memberId);
      if (!user) return false;
      await user.softDelete();
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa hội viên:', error);
      throw error;
    }
  }
}

module.exports = new MemberService();
