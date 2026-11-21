/**
 * ==============================================================================
 * BỘ KIỂM THỬ TÍCH HỢP HỆ THỐNG VỚI CƠ SỞ DỮ LIỆU MYSQL & SEQUELIZE ORM
 * (GAME MODULE REAL DATABASE INTEGRATION TESTS)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. [INT-01] Ghi nhận thực tế vào MySQL & Quan hệ ORM (Game -> Category & ComputerGame)
 * 2. [INT-02] Cập nhật dữ liệu & Tái đồng bộ quan hệ máy trạm trong MySQL
 * 3. [INT-03] Tính toàn vẹn dữ liệu khi Xóa mềm (Bảo toàn liên kết ComputerGame trong DB)
 * 4. [INT-04] Tính nguyên tử ACID của Managed Database Transaction trên MySQL
 * 5. [INT-05] Tổng hợp chỉ số KPI Metrics trực tiếp từ cơ sở dữ liệu thực
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../src/models');
const gameService = require('../../../src/services/gameService');
const { ComputerStatus } = require('../../../src/constants/enums');

// ==============================================================================
// HELPERS DỌN DẸP & TẠO DỮ LIỆU CÔ LẬP (ZERO STATE POLLUTION)
// ==============================================================================

/**
 * Xóa an toàn bản ghi để chống rò rỉ dữ liệu sau test
 */
async function safeDestroy(entity) {
  if (entity && typeof entity.destroy === 'function') {
    try {
      await entity.destroy();
    } catch (_ignored) {
      // Bỏ qua lỗi teardown trong môi trường test
    }
  }
}

test('[Game Module] MySQL Database & Sequelize ORM Integration Test Suite', async (t) => {
  // Kiểm tra kết nối DB trước khi chạy test
  await db.sequelize.authenticate();

  const timestamp = Date.now();
  const testCategoryName = `IT_Cat_${timestamp}`;
  const testGameName = `IT_Game_${timestamp}`;

  let testCategory = null;
  let testComputer1 = null;
  let testComputer2 = null;
  let createdGameId = null;

  // Khởi tạo Category và 2 Máy trạm cô lập cho test suite
  testCategory = await db.GameCategory.create({
    name: testCategoryName
  });

  testComputer1 = await db.Computer.create({
    computer_name: `IT-PC-1-${timestamp}`,
    status: ComputerStatus.ONLINE,
    zone_id: 1,
    ip_address: `192.168.88.${Math.floor(Math.random() * 200) + 10}`,
    mac_address: `00:11:22:33:${Math.floor(Math.random() * 89) + 10}:${Math.floor(Math.random() * 89) + 10}`
  });

  testComputer2 = await db.Computer.create({
    computer_name: `IT-PC-2-${timestamp}`,
    status: ComputerStatus.OFFLINE,
    zone_id: 1,
    ip_address: `192.168.88.${Math.floor(Math.random() * 200) + 10}`,
    mac_address: `00:11:22:33:${Math.floor(Math.random() * 89) + 10}:${Math.floor(Math.random() * 89) + 10}`
  });

  // Đảm bảo dọn dẹp triệt để dữ liệu sinh ra sau khi toàn bộ suite hoàn tất
  t.after(async () => {
    try {
      if (createdGameId) {
        await db.ComputerGame.destroy({ where: { game_id: createdGameId } });
        await db.Game.destroy({ where: { game_id: createdGameId } });
      }
      await safeDestroy(testComputer1);
      await safeDestroy(testComputer2);
      await safeDestroy(testCategory);
    } catch (_teardownErr) {
      // Dọn dẹp lỗi âm thầm
    }
  });

  // ----------------------------------------------------------------------------
  // [INT-01] Ghi nhận vào MySQL & Quan hệ ORM nhiều - nhiều (Many-to-Many)
  // ----------------------------------------------------------------------------
  await t.test('[INT-01] [MySQL Persistence & Association] createGame lưu thành công vào MySQL và gán máy trạm', async () => {
    const gamePayload = {
      name: testGameName,
      category_id: testCategory.category_id,
      executable_path: 'C:\\Games\\it_game.exe',
      cover_image_url: 'https://cdn.example.com/it_game.png',
      is_remote_supported: true,
      is_available: true,
      computer_ids: [testComputer1.computer_id, testComputer2.computer_id]
    };

    const result = await gameService.createGame(gamePayload);
    createdGameId = result.game_id;

    assert.ok(createdGameId, 'Game ID phải được MySQL tự động gán auto_increment');
    assert.strictEqual(result.name, testGameName);
    assert.strictEqual(result.category_id, testCategory.category_id);
    assert.strictEqual(result.is_remote_supported, true);
    assert.strictEqual(result.is_available, true);

    // 1. Kiểm tra trực tiếp bảng `game` trong MySQL
    const dbGame = await db.Game.findByPk(createdGameId);
    assert.ok(dbGame, 'Bản ghi game phải tồn tại thực sự trong MySQL');
    assert.strictEqual(dbGame.name, testGameName);
    assert.strictEqual(dbGame.is_deleted, false);
    assert.strictEqual(dbGame.deleted_at, null);

    // 2. Kiểm tra trực tiếp bảng trung gian `computer_game` trong MySQL
    const computerGameRows = await db.ComputerGame.findAll({
      where: { game_id: createdGameId }
    });
    assert.strictEqual(computerGameRows.length, 2, 'Bảng trung gian computer_game phải có chính xác 2 dòng liên kết');
    const linkedComputerIds = computerGameRows.map(r => r.computer_id);
    assert.ok(linkedComputerIds.includes(testComputer1.computer_id));
    assert.ok(linkedComputerIds.includes(testComputer2.computer_id));

    // 3. Kiểm tra nạp quan hệ ORM (Eager Loading Association)
    const gameWithAssociations = await gameService.getGameById(createdGameId);
    assert.ok(gameWithAssociations.GameCategory, 'Game phải kèm object GameCategory');
    assert.strictEqual(gameWithAssociations.GameCategory.name, testCategoryName);
    assert.strictEqual(gameWithAssociations.Computers.length, 2, 'Game phải kèm danh sách trạm máy liên kết');
  });

  // ----------------------------------------------------------------------------
  // [INT-02] Cập nhật dữ liệu & Đồng bộ lại quan hệ bảng trung gian
  // ----------------------------------------------------------------------------
  await t.test('[INT-02] [MySQL Update & Relinking] updateGame cập nhật thông tin và đồng bộ lại computer_game', async () => {
    const updatedName = `${testGameName}_V2`;

    // Cập nhật tên và chỉ giữ lại 1 máy trạm (testComputer1)
    const updated = await gameService.updateGame(createdGameId, {
      name: updatedName,
      is_remote_supported: false,
      computer_ids: [testComputer1.computer_id]
    });

    assert.strictEqual(updated.name, updatedName);
    assert.strictEqual(updated.is_remote_supported, false);

    // 1. Kiểm tra MySQL đã cập nhật tên
    const dbGame = await db.Game.findByPk(createdGameId);
    assert.strictEqual(dbGame.name, updatedName);
    assert.strictEqual(dbGame.is_remote_supported, false);

    // 2. Kiểm tra bảng `computer_game` đã xóa máy trạm 2 và chỉ còn máy trạm 1
    const computerGameRows = await db.ComputerGame.findAll({
      where: { game_id: createdGameId }
    });
    assert.strictEqual(computerGameRows.length, 1, 'Bảng trung gian computer_game phải giảm từ 2 xuống 1 máy trạm');
    assert.strictEqual(computerGameRows[0].computer_id, testComputer1.computer_id);
  });

  // ----------------------------------------------------------------------------
  // [INT-03] Tính toàn vẹn khi Soft-Delete & Khôi phục trên MySQL
  // ----------------------------------------------------------------------------
  await t.test('[INT-03] [Soft-Delete Integrity] deleteGame đánh dấu cờ xóa và bảo toàn liên kết computer_game', async () => {
    // 1. Thực hiện xóa mềm
    const delResult = await gameService.deleteGame(createdGameId);
    assert.strictEqual(delResult.success, true);

    // 2. Kiểm tra trong MySQL: game vẫn còn trong bảng, chỉ set cờ is_deleted = true
    const dbGame = await db.Game.findByPk(createdGameId);
    assert.ok(dbGame, 'Bản ghi không được bị xóa vật lý khỏi bảng game');
    assert.strictEqual(dbGame.is_deleted, true);
    assert.ok(dbGame.deleted_at instanceof Date, 'deleted_at phải là một Date hợp lệ');
    assert.strictEqual(dbGame.is_available, false);

    // 3. Quan hệ bảng trung gian `computer_game` vẫn được giữ nguyên
    const computerGameRows = await db.ComputerGame.findAll({
      where: { game_id: createdGameId }
    });
    assert.strictEqual(computerGameRows.length, 1, 'Bảng computer_game tuyệt đối không bị xóa khi soft-delete');

    // 4. getGames mặc định loại trừ game đã xóa
    const listResult = await gameService.getGames({ search: updatedName => updatedName });
    const existsInList = listResult.games.some(g => g.game_id === createdGameId);
    assert.strictEqual(existsInList, false, 'Game bị xóa mềm không được xuất hiện trong danh sách mặc định');

    // 5. Khôi phục lại game
    const restoreResult = await gameService.restoreGame(createdGameId);
    assert.strictEqual(restoreResult.success, true);

    const restoredDbGame = await db.Game.findByPk(createdGameId);
    assert.strictEqual(restoredDbGame.is_deleted, false);
    assert.strictEqual(restoredDbGame.deleted_at, null);
    assert.strictEqual(restoredDbGame.is_available, true);
  });

  // ----------------------------------------------------------------------------
  // [INT-04] Tính nguyên tử ACID Transaction Rollback thực tế trên MySQL
  // ----------------------------------------------------------------------------
  await t.test('[INT-04] [MySQL ACID Transaction] Transaction rollback hoàn tác 100% khi xảy ra sự cố', async () => {
    const failGameName = `Fail_Game_${Date.now()}`;

    // Tạo một service với mock setComputersForGame ném lỗi bất ngờ
    const originalSetComputers = gameService.repository.setComputersForGame;
    gameService.repository.setComputersForGame = async () => {
      throw new Error('Sự cố giả lập: Mất kết nối tới bảng liên kết máy trạm!');
    };

    try {
      await assert.rejects(
        async () => {
          await gameService.createGame({
            name: failGameName,
            category_id: testCategory.category_id,
            computer_ids: [testComputer1.computer_id]
          });
        },
        /Sự cố giả lập/
      );

      // Kiểm tra bản ghi Game tạo ở bước 1 đã bị MySQL ROLLBACK hoàn toàn
      const gameInDb = await db.Game.findOne({ where: { name: failGameName } });
      assert.strictEqual(
        gameInDb,
        null,
        'Bản ghi game phải được MySQL rollback hoàn toàn, không được tồn tại trong DB'
      );
    } finally {
      // Phục hồi lại hàm nguyên bản
      gameService.repository.setComputersForGame = originalSetComputers;
    }
  });

  // ----------------------------------------------------------------------------
  // [INT-05] Thống kê Metrics KPIs từ dữ liệu MySQL thực tế
  // ----------------------------------------------------------------------------
  await t.test('[INT-05] [KPIs Aggregation] getMetrics tính toán chính xác số liệu từ cơ sở dữ liệu thật', async () => {
    const metrics = await gameService.getMetrics();

    assert.ok(metrics, 'Metrics không được null');
    assert.strictEqual(typeof metrics.totalGames, 'number');
    assert.strictEqual(typeof metrics.availableGames, 'number');
    assert.strictEqual(typeof metrics.maintenanceGames, 'number');
    assert.strictEqual(typeof metrics.availabilityRate, 'number');
    assert.strictEqual(typeof metrics.remoteRate, 'number');
    assert.ok(metrics.totalCategories >= 1);
    assert.ok(Array.isArray(metrics.categoryNames));
    assert.ok(metrics.categoryNames.includes(testCategoryName));
  });
});


