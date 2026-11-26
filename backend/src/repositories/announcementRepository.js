// src/repositories/announcementRepository.js
const db = require('../models');

//AnnouncementRepository - Đảm nhận toàn bộ truy vấn CSDL cho SystemAnnouncement
//Tuân thủ Single Responsibility Principle (SRP)
class AnnouncementRepository {
  constructor(models = db) {
    this.models = models;
  }

  //Lấy danh sách thông báo đang kích hoạt (phục vụ hiển thị Banner cho khách)
  //tối ưu hiệu năng: Không JOIN bảng User để bảo mật tài khoản Admin và tăng tốc truy vấn
  async findActiveAnnouncements(limit = 10) {
    return await this.models.SystemAnnouncement.findAll({
      where: { is_active: true },
      attributes: ['announcement_id', 'title', 'content', 'type', 'created_at'],
      order: [['created_at', 'DESC']],
      limit
    });
  }

  //Lấy tất cả thông báo (phục vụ trang quản trị )
  async findAllAnnouncements() {
    return await this.models.SystemAnnouncement.findAll({
      include: [
        {
          model: this.models.User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'username', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  //Tìm thông báo theo ID
  async findById(announcementId) {
    return await this.models.SystemAnnouncement.findByPk(announcementId, {
      include: [
        {
          model: this.models.User,
          as: 'creator',
          attributes: ['user_id', 'full_name', 'username', 'role']
        }
      ]
    });
  }

  //Tạo thông báo mới
  async create(announcementData) {
    return await this.models.SystemAnnouncement.create(announcementData);
  }

  //Cập nhật thông báo
  async update(announcementInstance, updateData) {
    return await announcementInstance.update(updateData);
  }

  //Xóa thông báo
  async delete(announcementInstance) {
    return await announcementInstance.destroy();
  }
}

module.exports = new AnnouncementRepository();
module.exports.AnnouncementRepository = AnnouncementRepository;