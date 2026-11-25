// src/services/announcementService.js
const announcementRepository = require('../repositories/announcementRepository');
const announcementSocketService = require('./announcementSocketService');
const { AnnouncementType } = require('../constants/enums');
const { ValidationError, NotFoundError } = require('../utils/errors');

//AnnouncementService - Xử lý logic nghiệp vụ cho thông báo, banner quán
class AnnouncementService {
  constructor(repository = announcementRepository, socketService = announcementSocketService) {
    this.repository = repository;
    this.socketService = socketService;
  }

  //Lấy danh sách banner đang bật (dành cho khách hàng)
    async getActiveAnnouncements() {
    return await this.repository.findActiveAnnouncements();
  }

  //Lấy toàn bộ danh sách thông báo (dành cho quản lý)
  async getAllAnnouncements() {
    return await this.repository.findAllAnnouncements();
  }

  // Tạo thông báo / banner mới
  async createAnnouncement(userId, payload = {}) {
    const { title, content, type = AnnouncementType.INFO, is_active = true } = payload;

    // 1. Validation dữ liệu đầu vào
    if (!title || !title.trim()) {
      throw new ValidationError('Tiêu đề thông báo không được để trống');
    }
    if (!content || !content.trim()) {
      throw new ValidationError('Nội dung thông báo không được để trống');
    }
    if (!Object.values(AnnouncementType).includes(type)) {
      throw new ValidationError(`Loại thông báo không hợp lệ. Cho phép: ${Object.values(AnnouncementType).join(', ')}`);
    }

    // 2. Lưu vào CSDL
    const newAnnouncement = await this.repository.create({
      title: title.trim(),
      content: content.trim(),
      type,
      is_active: Boolean(is_active),
      created_by: userId
    });

    // 3. Lấy lại bản ghi đầy đủ (kèm creator) để bắn socket
    const fullRecord = await this.repository.findById(newAnnouncement.announcement_id);

    // 4. Phát sóng realtime
    this.socketService.broadcastAnnouncementUpdated({
      action: 'CREATED',
      announcement: fullRecord
    });

    return fullRecord;
  }

  // Cập nhật thông báo
  async updateAnnouncement(announcementId, payload = {}) {
    const parsedId = parseInt(announcementId, 10);
    if (!parsedId || isNaN(parsedId)) {
      throw new ValidationError('Mã thông báo không hợp lệ');
    }

    const announcement = await this.repository.findById(parsedId);
    if (!announcement) {
      throw new NotFoundError(`Không tìm thấy thông báo #${parsedId}`);
    }

    const { title, content, type, is_active } = payload;
    const updateData = {};

    if (title !== undefined) {
      if (!title.trim()) throw new ValidationError('Tiêu đề không được để trống');
      updateData.title = title.trim();
    }
    if (content !== undefined) {
      if (!content.trim()) throw new ValidationError('Nội dung không được để trống');
      updateData.content = content.trim();
    }
    if (type !== undefined) {
      if (!Object.values(AnnouncementType).includes(type)) {
        throw new ValidationError(`Loại thông báo không hợp lệ`);
      }
      updateData.type = type;
    }
    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    const updated = await this.repository.update(announcement, updateData);

    // Phát sóng realtime
    this.socketService.broadcastAnnouncementUpdated({
      action: 'UPDATED',
      announcement: updated
    });

    return updated;
  }

  //Bật tắt trạng thái hiển thị của Banner
  async toggleActive(announcementId) {
    const parsedId = parseInt(announcementId, 10);
    if (!parsedId || isNaN(parsedId)) {
      throw new ValidationError('Mã thông báo không hợp lệ');
    }

    const announcement = await this.repository.findById(parsedId);
    if (!announcement) {
      throw new NotFoundError(`Không tìm thấy thông báo #${parsedId}`);
    }

    const updated = await this.repository.update(announcement, {
      is_active: !announcement.is_active
    });

    // Phát sóng realtime
    this.socketService.broadcastAnnouncementUpdated({
      action: 'TOGGLED',
      announcement: updated
    });

    return updated;
  }

  //Xóa thông báo
  async deleteAnnouncement(announcementId) {
    const parsedId = parseInt(announcementId, 10);
    if (!parsedId || isNaN(parsedId)) {
      throw new ValidationError('Mã thông báo không hợp lệ');
    }

    const announcement = await this.repository.findById(parsedId);
    if (!announcement) {
      throw new NotFoundError(`Không tìm thấy thông báo #${parsedId}`);
    }

    await this.repository.delete(announcement);

    // Phát sóng realtime
    this.socketService.broadcastAnnouncementUpdated({
      action: 'DELETED',
      announcement: { announcement_id: parsedId }
    });

    return { announcement_id: parsedId, message: 'Đã xóa thông báo thành công' };
  }
}

module.exports = new AnnouncementService();
module.exports.AnnouncementService = AnnouncementService;