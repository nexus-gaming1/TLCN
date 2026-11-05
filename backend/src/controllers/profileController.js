const ProfileService = require('../services/profileService');

/**
 * ProfileController
 * Express Controller for managing Customer Profile endpoints.
 * Includes IDOR Protection and Auth-based Identity Resolution.
 */
class ProfileController {
  /**
   * @param {ProfileService} profileService 
   */
  constructor(profileService = new ProfileService()) {
    this.profileService = profileService;
  }

  /**
   * Helper method to resolve target memberId and enforce strict IDOR security checks.
   * Server NEVER trusts client-supplied IDs without validating requester authorization.
   */
  resolveMemberIdAndAuthorize(req) {
    const requesterId = req.user?.member_id || req.user?.id || req.user?.user_id;
    const requestedParamId = req.params.id && req.params.id !== 'me' ? Number(req.params.id) : null;

    if (requestedParamId !== null && (isNaN(requestedParamId) || requestedParamId <= 0)) {
      const err = new Error('Mã thành viên không hợp lệ. ID phải là một số nguyên dương.');
      err.statusCode = 400;
      throw err;
    }

    const targetMemberId = requestedParamId || requesterId;

    if (!targetMemberId) {
      const err = new Error('Chưa xác thực người dùng hoặc thiếu mã thành viên.');
      err.statusCode = 401;
      throw err;
    }

    // IDOR Security Check: Non-staff users can ONLY access/update their own profile
    if (requesterId && Number(targetMemberId) !== Number(requesterId)) {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'EMPLOYEE' && role !== 'STAFF' && role !== 'MANAGER') {
        const err = new Error('Bạn không có quyền truy cập hoặc chỉnh sửa hồ sơ của người dùng khác.');
        err.statusCode = 403;
        throw err;
      }
    }

    return Number(targetMemberId);
  }

  /**
   * GET /api/profile/:id? or /api/profile/me
   */
  async getProfile(req, res, _next) {
    try {
      const memberId = this.resolveMemberIdAndAuthorize(req);
      const profile = await this.profileService.getProfile(memberId);
      if (!profile) {
        return res.status(404).json({
          status: 'error',
          message: 'Hồ sơ hội viên không tồn tại trên hệ thống.'
        });
      }
      return res.status(200).json({
        status: 'success',
        data: profile,
        message: 'Lấy thông tin hồ sơ cá nhân thành công'
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/profile/:id?
   */
  async updateProfile(req, res, _next) {
    try {
      const memberId = this.resolveMemberIdAndAuthorize(req);
      const updatedProfile = await this.profileService.updateProfileInfo(memberId, req.body);
      return res.status(200).json({
        status: 'success',
        data: updatedProfile,
        message: 'Cập nhật thông tin hồ sơ cá nhân thành công'
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message
      });
    }
  }

  /**
   * POST /api/profile/:id/avatar
   */
  async updateAvatar(req, res, _next) {
    try {
      const memberId = this.resolveMemberIdAndAuthorize(req);
      const { avatar_url } = req.body;
      if (!avatar_url) {
        return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp đường dẫn ảnh đại diện avatar_url' });
      }
      const updatedProfile = await this.profileService.updateAvatar(memberId, avatar_url);
      return res.status(200).json({
        status: 'success',
        data: updatedProfile,
        message: 'Cập nhật ảnh đại diện thành công'
      });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      return res.status(statusCode).json({
        status: 'error',
        message: error.message
      });
    }
  }
}

module.exports = new ProfileController();

