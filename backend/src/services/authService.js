const db = require('../models');
const bcrypt = require('bcryptjs');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  hashToken 
} = require('../utils/jwt');

class AuthService {
  /**
   * Xử lý nghiệp vụ Đăng Nhập & Tạo Dual-Token (Access Token 15m + Refresh Token 2d)
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

    // Tạo Dual-Token
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Lưu trữ hashed Refresh Token vào CSDL nếu có bảng RefreshToken
    if (db.RefreshToken) {
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 ngày
      await db.RefreshToken.create({
        user_id: user.user_id,
        token_hash: hashToken(refreshToken),
        expires_at: expiresAt,
        is_revoked: false
      });
    }

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
      accessToken,
      refreshToken,
      token: accessToken, // Tương thích ngược với client cũ
      tokenType: 'Bearer',
      user: userData
    };
  }

  /**
   * Đăng nhập cho Nexus Control dựa trên luồng login hiện có.
   * Chỉ tài khoản quản trị và nhân viên được phép truy cập ứng dụng quản lý.
   */
  async controlLogin({ username, password }) {
    const result = await this.login({ username, password });
    const allowedRoles = ['ADMIN', 'EMPLOYEE'];

    if (!allowedRoles.includes(result.user.role)) {
      await this.logout({ refreshToken: result.refreshToken });
      throw new Error('Tài khoản không có quyền truy cập ứng dụng quản lý.');
    }

    return result;
  }

  /**
   * Cấp mới cặp token (Token Rotation) từ chuỗi Refresh Token hợp lệ
   */
  async refreshToken(oldRefreshToken) {
    if (!oldRefreshToken) {
      throw new Error('Refresh token không được để trống.');
    }

    // 1. Giải mã và kiểm tra chữ ký JWT của Refresh Token
    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch (err) {
      throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }

    const hashedToken = hashToken(oldRefreshToken);

    // 2. Tra cứu trong CSDL để đảm bảo token chưa bị thu hồi (Revocation check)
    if (db.RefreshToken) {
      const storedToken = await db.RefreshToken.findOne({
        where: { token_hash: hashedToken }
      });

      if (!storedToken) {
        throw new Error('Refresh token không tồn tại trong hệ thống.');
      }

      if (storedToken.is_revoked) {
        // Cảnh báo tái sử dụng token đã thu hồi (Token Reuse Attack): thu hồi toàn bộ token của user
        await db.RefreshToken.update(
          { is_revoked: true },
          { where: { user_id: decoded.user_id } }
        );
        throw new Error('Phát hiện cảnh báo bảo mật. Phiên làm việc đã bị vô hiệu hóa.');
      }

      if (new Date() > new Date(storedToken.expires_at)) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      // Vô hiệu hóa token cũ ngay lập tức (Refresh Token Rotation - RTR)
      storedToken.is_revoked = true;
      await storedToken.save();
    }

    // 3. Lấy thông tin tài khoản mới nhất
    const user = await db.User.findByPk(decoded.user_id, {
      attributes: { exclude: ['password_hash'] },
      include: [{
        model: db.Member,
        as: 'memberProfile',
        include: [{ model: db.MembershipRank }]
      }]
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new Error('Tài khoản không tồn tại hoặc đã bị khóa.');
    }

    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    };

    // 4. Phát hành cặp token mới
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    if (db.RefreshToken) {
      const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 ngày
      await db.RefreshToken.create({
        user_id: user.user_id,
        token_hash: hashToken(newRefreshToken),
        expires_at: expiresAt,
        is_revoked: false
      });
    }

    const userData = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      memberProfile: user.memberProfile || null
    };

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      token: newAccessToken,
      tokenType: 'Bearer',
      user: userData
    };
  }

  /**
   * Thu hồi Refresh Token khi người dùng chủ động Đăng Xuất
   */
  async logout({ refreshToken, userId }) {
    if (refreshToken && db.RefreshToken) {
      const hashedToken = hashToken(refreshToken);
      await db.RefreshToken.update(
        { is_revoked: true },
        { where: { token_hash: hashedToken } }
      );
    } else if (userId && db.RefreshToken) {
      await db.RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: userId } }
      );
    }
    return true;
  }

  /**
   * Xác thực lại mật khẩu (Step-up Authentication) khi quá 30 phút không hoạt động
   */
  async verifyStepUp({ userId, password }) {
    if (!userId || !password) {
      throw new Error('Vui lòng nhập mật khẩu xác nhận.');
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    let isPasswordValid = false;
    const currentHash = user.password_hash || '';
    if (currentHash.startsWith('$2a$') || currentHash.startsWith('$2b$')) {
      isPasswordValid = bcrypt.compareSync(password, currentHash);
    } else {
      isPasswordValid = (currentHash === password);
    }

    if (!isPasswordValid) {
      throw new Error('Mật khẩu xác nhận không chính xác.');
    }

    return {
      success: true,
      verifiedAt: Date.now()
    };
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
module.exports.AuthService = AuthService;
