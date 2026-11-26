const test = require('node:test');
const assert = require('node:assert/strict');

const { AnnouncementService } = require('../src/services/announcementService');
const { AnnouncementRepository } = require('../src/repositories/announcementRepository');
const { AnnouncementType } = require('../src/constants/enums');

// ==============================================================================
// 1. BẢO MẬT ROUTE CÔNG KHAI /api/announcements/active
// ==============================================================================

test('[Announcement-01] findActiveAnnouncements: Chỉ lấy 5 cột công khai, KHÔNG JOIN User để tránh lộ username/role Admin', async () => {
  let capturedQuery = null;
  const mockModels = {
    SystemAnnouncement: {
      findAll: async (query) => {
        capturedQuery = query;
        return [
          {
            announcement_id: 1,
            title: 'Khuyến mãi đêm',
            content: 'Nạp 100k tặng 20k',
            type: AnnouncementType.PROMOTION,
            created_at: new Date().toISOString()
          }
        ];
      }
    },
    User: {}
  };

  const repo = new AnnouncementRepository(mockModels);
  const rows = await repo.findActiveAnnouncements(10);

  assert.deepStrictEqual(capturedQuery.where, { is_active: true });
  assert.deepStrictEqual(capturedQuery.attributes, [
    'announcement_id',
    'title',
    'content',
    'type',
    'created_at'
  ]);
  assert.strictEqual(capturedQuery.include, undefined, 'API công khai không được JOIN bảng User');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].creator, undefined);
  assert.strictEqual(rows[0].username, undefined);
  assert.strictEqual(rows[0].role, undefined);
});

// ==============================================================================
// 2. VALIDATION & REALTIME BROADCAST TRONG ANNOUNCEMENT SERVICE
// ==============================================================================

test('[Announcement-02] createAnnouncement: Chặn tiêu đề/nội dung rỗng và type không hợp lệ (ValidationError)', async () => {
  const service = new AnnouncementService({}, { broadcastAnnouncementUpdated: () => {} });

  await assert.rejects(
    () => service.createAnnouncement(1, { title: '   ', content: 'Nội dung', type: AnnouncementType.INFO }),
    (err) => err.statusCode === 400 && /Tiêu đề/.test(err.message)
  );

  await assert.rejects(
    () => service.createAnnouncement(1, { title: 'Tiêu đề', content: '', type: AnnouncementType.INFO }),
    (err) => err.statusCode === 400 && /Nội dung/.test(err.message)
  );

  await assert.rejects(
    () => service.createAnnouncement(1, { title: 'Tiêu đề', content: 'Nội dung', type: 'INVALID_TYPE' }),
    (err) => err.statusCode === 400 && /Loại thông báo không hợp lệ/.test(err.message)
  );
});

test('[Announcement-03] createAnnouncement: Tạo thành công và phát sóng sự kiện CREATED qua Socket.IO', async () => {
  const broadcasts = [];
  const mockRepo = {
    create: async (data) => ({ announcement_id: 15, ...data }),
    findById: async (id) => ({
      announcement_id: id,
      title: 'Bảo trì mạng',
      content: 'Bảo trì lúc 2h sáng',
      type: AnnouncementType.WARNING,
      is_active: true
    })
  };
  const mockSocket = {
    broadcastAnnouncementUpdated: (payload) => broadcasts.push(payload)
  };

  const service = new AnnouncementService(mockRepo, mockSocket);
  const res = await service.createAnnouncement(1, {
    title: '  Bảo trì mạng  ',
    content: '  Bảo trì lúc 2h sáng  ',
    type: AnnouncementType.WARNING
  });

  assert.strictEqual(res.announcement_id, 15);
  assert.strictEqual(broadcasts.length, 1);
  assert.strictEqual(broadcasts[0].action, 'CREATED');
  assert.strictEqual(broadcasts[0].announcement.announcement_id, 15);
});

test('[Announcement-04] toggleActive: Đảo trạng thái is_active, bắn socket TOGGLED và báo 404 khi không tìm thấy', async () => {
  const broadcasts = [];
  const record = { announcement_id: 20, is_active: true };
  const mockRepo = {
    findById: async (id) => (id === 20 ? record : null),
    update: async (inst, data) => ({ ...inst, ...data })
  };
  const mockSocket = {
    broadcastAnnouncementUpdated: (payload) => broadcasts.push(payload)
  };

  const service = new AnnouncementService(mockRepo, mockSocket);

  const toggled = await service.toggleActive(20);
  assert.strictEqual(toggled.is_active, false);
  assert.strictEqual(broadcasts.length, 1);
  assert.strictEqual(broadcasts[0].action, 'TOGGLED');

  await assert.rejects(
    () => service.toggleActive(999),
    (err) => err.statusCode === 404 && /#999/.test(err.message)
  );
});

test('[Announcement-05] deleteAnnouncement: Xóa thành công, bắn socket DELETED và chặn ID không hợp lệ', async () => {
  const broadcasts = [];
  let deletedTarget = null;
  const mockRepo = {
    findById: async (id) => (id === 30 ? { announcement_id: 30 } : null),
    delete: async (inst) => {
      deletedTarget = inst;
    }
  };
  const mockSocket = {
    broadcastAnnouncementUpdated: (payload) => broadcasts.push(payload)
  };

  const service = new AnnouncementService(mockRepo, mockSocket);

  await assert.rejects(
    () => service.deleteAnnouncement('abc'),
    (err) => err.statusCode === 400 && /Mã thông báo không hợp lệ/.test(err.message)
  );

  const res = await service.deleteAnnouncement(30);
  assert.strictEqual(deletedTarget.announcement_id, 30);
  assert.strictEqual(res.announcement_id, 30);
  assert.strictEqual(broadcasts.length, 1);
  assert.strictEqual(broadcasts[0].action, 'DELETED');
});
