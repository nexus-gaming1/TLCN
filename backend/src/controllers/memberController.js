const memberService = require('../services/memberService');

class MemberController {
  async getMembers(req, res, next) {
    try {
      const members = await memberService.getAllMembers();
      return res.json({
        status: 'success',
        data: members,
        message: 'Lấy danh sách hội viên thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberById(req, res, next) {
    try {
      const { id } = req.params;
      const member = await memberService.getMemberById(id);
      if (!member) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hội viên'
        });
      }
      return res.json({
        status: 'success',
        data: member
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberInfo(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await memberService.updateMemberInfo(id, req.body);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hội viên để cập nhật'
        });
      }
      return res.json({
        status: 'success',
        data: updated,
        message: 'Cập nhật thông tin hồ sơ hội viên thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAccountStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await memberService.updateAccountStatus(id, status);
      if (!updated) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hội viên để đổi trạng thái'
        });
      }
      return res.json({
        status: 'success',
        data: updated,
        message: `Đã đổi trạng thái tài khoản thành ${status}`
      });
    } catch (error) {
      next(error);
    }
  }

  async createMember(req, res, next) {
    try {
      const newMember = await memberService.createMember(req.body);
      return res.status(201).json({
        status: 'success',
        data: newMember,
        message: 'Tạo tài khoản hội viên thành công'
      });
    } catch (error) {
      if (
        error.message.includes('đã tồn tại') ||
        error.message.includes('không được để trống')
      ) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      next(error);
    }
  }

  async deleteMember(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await memberService.deleteMember(id);
      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hội viên để xóa'
        });
      }
      return res.json({
        status: 'success',
        message: 'Xóa hội viên thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MemberController();
