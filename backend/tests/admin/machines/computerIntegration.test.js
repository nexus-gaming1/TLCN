const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../src/models');
const computerService = require('../../../src/services/computerService');
const { ComputerStatus, SessionType } = require('../../../src/constants/enums');

/**
 * ==============================================================================
 * BỘ KIỂM THỬ TÍCH HỢP HỆ THỐNG VỚI CƠ SỞ DỮ LIỆU MYSQL & SEQUELIZE ORM
 * (MACHINE FLEET REAL DATABASE INTEGRATION TESTS)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. [INT-01] Ghi nhận thực tế vào bảng `computer` trong MySQL
 * 2. [INT-02] Eager loading & Liên kết bảng `computer_zone` và `pricing_plan`
 * 3. [INT-03] Thay đổi trạng thái máy & Tự động ghi nhật ký `computer_status_log`
 * 4. [INT-04] Cập nhật thông số máy trạm trong CSDL thật
 * 5. [INT-05] Ràng buộc xóa an toàn và toàn vẹn dữ liệu (Clean teardown)
 * ==============================================================================
 */

// Helper xóa an toàn dữ liệu test
async function cleanupComputer(computerId) {
  if (!computerId) return;
  try {
    if (db.ComputerStatusLog) {
      await db.ComputerStatusLog.destroy({ where: { computer_id: computerId } });
    }
    await db.Computer.destroy({ where: { computer_id: computerId } });
  } catch (_ignored) {
    // Ignore teardown errors
  }
}

test('[Machine Fleet Module] MySQL Database & Sequelize ORM Integration Suite', async (suite) => {
  // Đảm bảo kết nối CSDL sẵn sàng
  await db.sequelize.authenticate();

  const timestamp = Date.now();
  const testPcName = `PC-IT-${String(timestamp).slice(-4)}`;
  const testIp = `192.168.12.${(timestamp % 200) + 1}`;
  const testMac = `00:11:22:33:44:${(timestamp % 90 + 10).toString(16).toUpperCase()}`;

  let createdComputerId = null;

  suite.after(async () => {
    if (createdComputerId) {
      await cleanupComputer(createdComputerId);
    }
  });

  // ----------------------------------------------------------------------------
  // [INT-01] Tạo bản ghi máy trạm thực tế trong MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-01] [MySQL Persistence] Tạo mới máy trạm lưu vào bảng computer trong MySQL', async () => {
    // Lấy 1 zone có sẵn trong database
    const zone = await db.ComputerZone.findOne();
    assert.ok(zone, 'Database phải có ít nhất 1 ComputerZone để test');

    const newComputer = await computerService.createComputer({
      computer_name: testPcName,
      ip_address: testIp,
      mac_address: testMac,
      zone_id: zone.zone_id,
      status: ComputerStatus.OFFLINE,
      is_remote_enabled: false
    });

    assert.ok(newComputer.computer_id, 'Phải sinh computer_id tự tăng trong MySQL');
    createdComputerId = newComputer.computer_id;

    // Truy vấn trực tiếp từ MySQL bằng findByPk để chứng minh dữ liệu đã ghi xuống ổ đĩa
    const persisted = await db.Computer.findByPk(createdComputerId);
    assert.ok(persisted, 'Bản ghi phải tồn tại trong bảng computer');
    assert.strictEqual(persisted.computer_name, testPcName);
    assert.strictEqual(persisted.ip_address, testIp);
    assert.strictEqual(persisted.mac_address, testMac);
    assert.strictEqual(persisted.status, ComputerStatus.OFFLINE);
  });

  // ----------------------------------------------------------------------------
  // [INT-02] Eager loading & Liên kết ComputerZone
  // ----------------------------------------------------------------------------
  await suite.test('[INT-02] [Eager Loading] Lấy chi tiết máy kèm ComputerZone và bảng giá', async () => {
    const fetched = await computerService.getComputerById(createdComputerId);
    assert.ok(fetched, 'Phải tìm thấy máy vừa tạo');
    assert.ok(fetched.ComputerZone, 'Phải liên kết eager loading với ComputerZone');
    assert.ok(fetched.ComputerZone.zone_name, 'ComputerZone phải có zone_name');
  });

  // ----------------------------------------------------------------------------
  // [INT-03] Thay đổi trạng thái & Tự động ghi ComputerStatusLog
  // ----------------------------------------------------------------------------
  await suite.test('[INT-03] [Audit Log] Đổi trạng thái sang ONLINE và kiểm tra bản ghi ComputerStatusLog', async () => {
    const updated = await computerService.updateComputer(createdComputerId, {
      status: ComputerStatus.ONLINE
    });
    assert.strictEqual(updated.status, ComputerStatus.ONLINE);

    // Kiểm tra bản ghi ComputerStatusLog trong MySQL
    const statusLog = await db.ComputerStatusLog.findOne({
      where: {
        computer_id: createdComputerId,
        status: ComputerStatus.ONLINE
      },
      order: [['recorded_at', 'DESC']]
    });

    assert.ok(statusLog, 'Phải tự động lưu bản ghi vào computer_status_log trong MySQL');
    assert.strictEqual(statusLog.computer_id, createdComputerId);
    assert.strictEqual(statusLog.status, ComputerStatus.ONLINE);
    assert.strictEqual(statusLog.session_type, SessionType.SYSTEM);
  });

  // ----------------------------------------------------------------------------
  // [INT-04] Cập nhật thông số máy trạm trong MySQL
  // ----------------------------------------------------------------------------
  await suite.test('[INT-04] [MySQL Update] Cập nhật thông số IP, Remote enabled trong MySQL', async () => {
    const newIp = `192.168.12.${(timestamp % 200) + 2}`;
    const updated = await computerService.updateComputer(createdComputerId, {
      ip_address: newIp,
      is_remote_enabled: true
    });

    assert.strictEqual(updated.ip_address, newIp);
    assert.strictEqual(updated.is_remote_enabled, true);

    const reloaded = await db.Computer.findByPk(createdComputerId);
    assert.strictEqual(reloaded.ip_address, newIp);
    assert.strictEqual(reloaded.is_remote_enabled, true);
  });

  // ----------------------------------------------------------------------------
  // [INT-05] Ràng buộc xóa an toàn và dọn dẹp
  // ----------------------------------------------------------------------------
  await suite.test('[INT-05] [Delete Integrity] Xóa máy trạm thành công và dọn sạch nhật ký trạng thái', async () => {
    // Đổi về OFFLINE để xóa
    await computerService.updateComputer(createdComputerId, { status: ComputerStatus.OFFLINE });

    const deleted = await computerService.deleteComputer(createdComputerId);
    assert.strictEqual(deleted, true, 'Xóa máy trạm phải thành công');

    const checkComputer = await db.Computer.findByPk(createdComputerId);
    assert.strictEqual(checkComputer, null, 'Máy trạm phải không còn tồn tại trong MySQL');

    const checkLogs = await db.ComputerStatusLog.findAll({ where: { computer_id: createdComputerId } });
    assert.strictEqual(checkLogs.length, 0, 'Các bản ghi nhật ký của máy phải được dọn dẹp sạch sẽ');

    createdComputerId = null; // Đã xóa xong, teardown không cần xóa lại
  });
});

