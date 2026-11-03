const db = require('../models');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

class AuthService {
  /**
   * Xử lý nghiệp vụ Đăng Nhập & Tạo Bearer Token
   */
  async login({ username, password }) {
    if (!username || !password) {
      throw new Error('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
    }

    // Tìm user theo username
    const user = await db.User.findOne({
      where: { username },
      include: [{
        model: db.Member,
        as: 'memberProfile',
        include: [{ model: db.MembershipRank }]
      }]
    });


    if (!user) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    // Kiểm tra mật khẩu (hỗ trợ cả bcrypt hash và tự động nâng cấp nếu plain-text)
    let isPasswordValid = false;
    const currentHash = user.password_hash || '';
    if (currentHash.startsWith('$2a$') || currentHash.startsWith('$2b$')) {
      isPasswordValid = bcrypt.compareSync(password, currentHash);
    } else {
      isPasswordValid = (currentHash === password);
      if (isPasswordValid) {
        user.password_hash = bcrypt.hashSync(password, 10);
        await user.save();
      }
    }

    if (!isPasswordValid) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    // Payload cho JWT
    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      member_id: user.memberProfile?.member_id || null,
      role: user.role,
    };

    // Tạo JWT Token
    const token = generateToken(tokenPayload);

    // Sanitize thông tin user trả về frontend
    const userData = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      memberProfile: user.memberProfile || null
    };

    return {
      token,
      tokenType: 'Bearer',
      user: userData
    };
  }

  /**
   * Đăng nhập dành riêng cho ứng dụng quản lý Nexus Control
   * Chỉ cho phép nhân viên và quản trị viên (ADMIN, EMPLOYEE), từ chối tài khoản MEMBER
   */
  async controlLogin({ username, password }) {
    const result = await this.login({ username, password });

    if (result.user.role === 'MEMBER') {
      throw new Error('Tài khoản hội viên không được phép đăng nhập vào ứng dụng quản lý Nexus Control.');
    }

    if (result.user.status && result.user.status !== 'ACTIVE') {
      throw new Error('Tài khoản đang bị khóa hoặc không ở trạng thái hoạt động.');
    }

    return result;
  }

  /**
   * Lấy thông tin tài khoản hiện tại từ userId trong Token
   */
  async getUserProfile(userId) {
    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [{
        model: db.Member,
        as: 'memberProfile',
        include: [{ model: db.MembershipRank }]
      }]
    });

    if (!user) {
      throw new Error('Không tìm thấy thông tin người dùng.');
    }

    return user;
  }
}

module.exports = new AuthService();
