/**
 * ==============================================================================
 * BỘ KIỂM THỬ TOÀN DIỆN MODULE GAME (GAME SERVICE & CONTROLLER UNIT TESTS)
 * ==============================================================================
 * Tiêu chí kiểm định:
 * 1. Test có thực tế: Đầy đủ luồng nghiệp vụ (Filter, CRUD, Soft-delete, Metrics, Assoc)
 * 2. Bao phủ ca biên (Edge cases): null, undefined, '', '   ', NaN, số âm, số 0, case-insensitive
 * 3. Tính độc lập (Test Isolation): Mỗi test case sở hữu Fresh Mock State độc lập 100%
 * 4. Chất lượng Mock/Stub: Phản ánh đúng hành vi ORM & Mô phỏng lỗi DB Failure
 * 5. Controller Contract: Kiểm thử HTTP Status (200, 201), Error Propagation qua next(err)
 * ==============================================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const ServiceClass = require('../src/services/gameService').constructor;
const gameController = require('../src/controllers/gameController');

/**
 * Factory tạo Mock Repository độc lập cho mỗi test case (Zero State Pollution)
 */
const createMockRepo = (initialData = {}) => {
  const mockGames = initialData.games ? [...initialData.games] : [
    {
      game_id: 1,
      name: 'Valorant',
      category_id: 1,
      cover_image_url: 'https://example.com/val.jpg',
      executable_path: 'C:\\Games\\val.exe',
      is_remote_supported: true,
      is_available: true,
      is_deleted: false,
      deleted_at: null,
      GameCategory: { category_id: 1, name: 'Esports FPS' },
      Computers: [{ computer_id: 1, computer_name: 'ESP-01' }]
    },
    {
      game_id: 2,
      name: 'League of Legends',
      category_id: 2,
      cover_image_url: 'https://example.com/lol.jpg',
      executable_path: 'C:\\Games\\lol.exe',
      is_remote_supported: false,
      is_available: false,
      is_deleted: false,
      deleted_at: null,
      GameCategory: { category_id: 2, name: 'Esports MOBA' },
      Computers: []
    }
  ];

  const mockCategories = initialData.categories ? [...initialData.categories] : [
    { category_id: 1, name: 'Esports FPS' },
    { category_id: 2, name: 'Esports MOBA' }
  ];

  let nextGameId = 10;
  const computerGameMappings = {};

  return {
    _games: mockGames,
    _categories: mockCategories,
    _mappings: computerGameMappings,

    runInTransaction: async (callback) => {
      return await callback(null);
    },

    findAll: async (filter = {}) => {
      let result = [...mockGames];

      // Mặc định loại bỏ game đã bị xóa mềm trừ khi include_deleted = true
      if (filter.include_deleted !== true && filter.include_deleted !== 'true') {
        result = result.filter(g => !g.is_deleted);
      }

      if (filter.search && typeof filter.search === 'string') {
        const query = filter.search.trim().toLowerCase();
        result = result.filter(g =>
          g.name.toLowerCase().includes(query) ||
          (g.executable_path && g.executable_path.toLowerCase().includes(query))
        );
      }

      if (filter.category_id && filter.category_id !== 'all') {
        result = result.filter(g => g.category_id === Number(filter.category_id));
      }

      if (filter.is_remote_supported !== undefined && filter.is_remote_supported !== 'all') {
        const isRemote = filter.is_remote_supported === true || filter.is_remote_supported === 'true';
        result = result.filter(g => Boolean(g.is_remote_supported) === isRemote);
      }

      if (filter.is_available !== undefined && filter.is_available !== 'all') {
        const isAvail = filter.is_available === true || filter.is_available === 'true';
        result = result.filter(g => Boolean(g.is_available) === isAvail);
      }

      return result;
    },

    findById: async (id, includeDeleted = false) => {
      const parsedId = Number(id);
      return mockGames.find(g => g.game_id === parsedId && (includeDeleted || !g.is_deleted)) || null;
    },

    findByName: async (name, includeDeleted = false) => {
      if (!name || typeof name !== 'string') return null;
      const target = name.trim().toLowerCase();
      return mockGames.find(g => g.name.toLowerCase() === target && (includeDeleted || !g.is_deleted)) || null;
    },

    findCategoryById: async (id) => {
      return mockCategories.find(c => c.category_id === Number(id)) || null;
    },

    findCategoryByName: async (name) => {
      if (!name || typeof name !== 'string') return null;
      return mockCategories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()) || null;
    },

    findAllCategories: async () => [...mockCategories],

    createCategory: async (data) => {
      const newCat = { category_id: mockCategories.length + 1, ...data };
      mockCategories.push(newCat);
      return newCat;
    },

    create: async (data) => {
      const newGame = {
        game_id: nextGameId++,
        ...data,
        is_deleted: false,
        deleted_at: null,
        GameCategory: mockCategories.find(c => c.category_id === Number(data.category_id)) || null,
        Computers: []
      };
      mockGames.push(newGame);
      return newGame;
    },

    update: async (instance, updateData) => {
      Object.assign(instance, updateData);
      if (updateData.category_id !== undefined) {
        instance.GameCategory = mockCategories.find(c => c.category_id === Number(updateData.category_id)) || null;
      }
      return instance;
    },

    delete: async (id) => {
      const game = mockGames.find(g => g.game_id === Number(id));
      if (game) {
        game.is_deleted = true;
        game.deleted_at = new Date();
        game.is_available = false;
        return 1;
      }
      return 0;
    },

    restore: async (id) => {
      const game = mockGames.find(g => g.game_id === Number(id));
      if (game) {
        game.is_deleted = false;
        game.deleted_at = null;
        game.is_available = true;
        return 1;
      }
      return 0;
    },

    setComputersForGame: async (gameId, computerIds) => {
      computerGameMappings[gameId] = [...computerIds];
      const game = mockGames.find(g => g.game_id === Number(gameId));
      if (game) {
        game.Computers = computerIds.map(cid => ({ computer_id: cid, computer_name: `PC-${cid}` }));
      }
      return true;
    },

    getMetrics: async () => {
      const activeGames = mockGames.filter(g => !g.is_deleted);
      const total = activeGames.length;
      const available = activeGames.filter(g => g.is_available).length;
      const maintenance = activeGames.filter(g => !g.is_available).length;
      const remote = activeGames.filter(g => g.is_remote_supported).length;

      return {
        totalGames: total,
        availableGames: available,
        maintenanceGames: maintenance,
        remoteSupportedGames: remote,
        availabilityRate: total > 0 ? Number(((available / total) * 100).toFixed(1)) : 0,
        remoteRate: total > 0 ? Number(((remote / total) * 100).toFixed(1)) : 0,
        totalCategories: mockCategories.length,
        categoryDistribution: { 'Esports FPS': 1, 'Esports MOBA': 1 },
        categoryNames: mockCategories.map(c => c.name),
        categoriesSummary: mockCategories.map(c => c.name).join(', '),
        topCategory: { name: 'Esports FPS', count: 1 },
        totalInstallations: 1
      };
    }
  };
};

/**
 * Helper tạo mock Response cho Controller
 */
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

// ==============================================================================
// TEST SUITE: BẢO ĐẢM 4 TIÊU CHÍ TOÀN DIỆN
// ==============================================================================

test('[TC-01] [Ca thực tế & Lọc đa điều kiện] getGames - Tìm kiếm, bộ lọc & KPI aggregation', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // 1. Lấy toàn bộ danh sách mặc định
  const allResult = await service.getGames({});
  assert.equal(allResult.games.length, 2, 'Mặc định phải trả về 2 game chưa bị xóa');
  assert.equal(allResult.metrics.totalGames, 2);
  assert.equal(allResult.metrics.availableGames, 1);
  assert.equal(allResult.metrics.maintenanceGames, 1);

  // 2. Tìm kiếm theo từ khóa tên game
  const searchName = await service.getGames({ search: 'valo' });
  assert.equal(searchName.games.length, 1);
  assert.equal(searchName.games[0].name, 'Valorant');

  // 3. Tìm kiếm theo từ khóa đường dẫn exe
  const searchExe = await service.getGames({ search: 'lol.exe' });
  assert.equal(searchExe.games.length, 1);
  assert.equal(searchExe.games[0].name, 'League of Legends');

  // 4. Lọc theo thể loại
  const filterCat = await service.getGames({ category_id: 2 });
  assert.equal(filterCat.games.length, 1);
  assert.equal(filterCat.games[0].category_id, 2);

  // 5. Lọc theo trạng thái phục vụ (is_available = true)
  const filterAvail = await service.getGames({ is_available: true });
  assert.equal(filterAvail.games.length, 1);
  assert.equal(filterAvail.games[0].is_available, true);

  // 6. Lọc theo Remote Play (is_remote_supported = true)
  const filterRemote = await service.getGames({ is_remote_supported: true });
  assert.equal(filterRemote.games.length, 1);
  assert.equal(filterRemote.games[0].name, 'Valorant');

  // 7. Ca không khớp điều kiện nào (Empty match)
  const emptyMatch = await service.getGames({ search: 'GameKhongTonTai_XYZ' });
  assert.equal(emptyMatch.games.length, 0, 'Tìm kiếm không khớp phải trả về mảng rỗng');
});

test('[TC-02] [Ca biên & Dữ liệu dị] getGameById - Kiểm tra đầu vào bất thường & Not Found', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // 1. Happy path: Lấy đúng ID
  const game = await service.getGameById(1);
  assert.equal(game.name, 'Valorant');
  assert.equal(game.Computers.length, 1);

  // 2. ID hợp lệ nhưng không tồn tại trong DB -> 404
  await assert.rejects(
    async () => await service.getGameById(9999),
    { statusCode: 404, message: 'Không tìm thấy game với ID: 9999' }
  );

  // 3. Ca biên: Chuỗi chữ cái không phải số -> 400
  await assert.rejects(
    async () => await service.getGameById('invalid_string'),
    { statusCode: 400, message: 'ID game không hợp lệ' }
  );

  // 4. Ca biên: null, undefined, số 0, số âm -> 400
  await assert.rejects(
    async () => await service.getGameById(null),
    { statusCode: 400, message: 'ID game không hợp lệ' }
  );
  await assert.rejects(
    async () => await service.getGameById(undefined),
    { statusCode: 400, message: 'ID game không hợp lệ' }
  );
  await assert.rejects(
    async () => await service.getGameById(0),
    { statusCode: 400, message: 'ID game không hợp lệ' }
  );
  await assert.rejects(
    async () => await service.getGameById(-5),
    { statusCode: 400, message: 'ID game không hợp lệ' }
  );
});

test('[TC-03] [Ca thực tế & Ca biên] createGame - Ràng buộc dữ liệu, Trim & Duplicate Protection', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // 1. Tên rỗng, undefined, toàn khoảng trắng -> 400
  await assert.rejects(
    async () => await service.createGame({ name: '', category_id: 1 }),
    { statusCode: 400, message: 'Tên game không được để trống' }
  );
  await assert.rejects(
    async () => await service.createGame({ name: '    ', category_id: 1 }),
    { statusCode: 400, message: 'Tên game không được để trống' }
  );
  await assert.rejects(
    async () => await service.createGame({ name: null, category_id: 1 }),
    { statusCode: 400, message: 'Tên game không được để trống' }
  );

  // 2. Thiếu thể loại category_id -> 400
  await assert.rejects(
    async () => await service.createGame({ name: 'CS2', category_id: null }),
    { statusCode: 400, message: 'Vui lòng chọn thể loại cho game' }
  );
  await assert.rejects(
    async () => await service.createGame({ name: 'CS2', category_id: 0 }),
    { statusCode: 400, message: 'Vui lòng chọn thể loại cho game' }
  );

  // 3. Thể loại không tồn tại trong hệ thống -> 404
  await assert.rejects(
    async () => await service.createGame({ name: 'CS2', category_id: 999 }),
    { statusCode: 404, message: 'Thể loại game được chọn không tồn tại' }
  );

  // 4. Trùng tên (Case-insensitive & có khoảng trắng dư thừa) -> 409
  await assert.rejects(
    async () => await service.createGame({ name: '  valorant  ', category_id: 1 }),
    { statusCode: 409 }
  );

  // 5. Ca tạo thành công có gán máy trạm (Happy Path kèm computer_ids)
  const created = await service.createGame({
    name: '  Counter-Strike 2  ',
    category_id: 1,
    cover_image_url: '  https://steam.com/cs2.jpg  ',
    executable_path: 'D:\\Games\\cs2.exe',
    is_remote_supported: true,
    is_available: true,
    computer_ids: [1, 2, 3]
  });

  assert.equal(created.name, 'Counter-Strike 2', 'Tên game phải được tự động trim sạch');
  assert.equal(created.cover_image_url, 'https://steam.com/cs2.jpg', 'URL ảnh phải được trim sạch');
  assert.equal(created.Computers.length, 3, 'Phải liên kết chính xác 3 máy trạm');

  // 6. Ca tạo thành công với mảng computer_ids rỗng hoặc không truyền
  const gameNoComputers = await service.createGame({
    name: 'Dota 2',
    category_id: 2,
    computer_ids: []
  });
  assert.equal(gameNoComputers.name, 'Dota 2');
  assert.equal(gameNoComputers.Computers.length, 0);
});

test('[TC-04] [Ca thực tế & Ca biên] updateGame - Partial Update, Đổi tên & Không tự xung đột', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // 1. Cập nhật khi ID không hợp lệ hoặc không tồn tại
  await assert.rejects(
    async () => await service.updateGame('abc', { name: 'Mới' }),
    { statusCode: 400 }
  );
  await assert.rejects(
    async () => await service.updateGame(999, { name: 'Mới' }),
    { statusCode: 404 }
  );

  // 2. Cập nhật với tên rỗng -> 400
  await assert.rejects(
    async () => await service.updateGame(1, { name: '   ' }),
    { statusCode: 400 }
  );

  // 3. Đổi tên trùng với game KHÁC -> 409
  await assert.rejects(
    async () => await service.updateGame(2, { name: 'Valorant' }),
    { statusCode: 409 }
  );

  // 4. Giữ nguyên tên của CHÍNH NÓ -> Thành công (Không tự xung đột với bản thân)
  const selfUpdate = await service.updateGame(1, { name: 'Valorant', is_available: false });
  assert.equal(selfUpdate.name, 'Valorant');
  assert.equal(selfUpdate.is_available, false);

  // 5. Cập nhật đổi thể loại sang ID không tồn tại -> 404
  await assert.rejects(
    async () => await service.updateGame(1, { category_id: 888 }),
    { statusCode: 404 }
  );

  // 6. Partial Update: Chỉ đổi đường dẫn exe và cover_image_url (giữ nguyên các trường khác)
  const partialUpdate = await service.updateGame(1, {
    executable_path: 'E:\\Games\\NewVal\\val.exe',
    cover_image_url: 'https://newimg.com/val.jpg',
    computer_ids: [10, 20]
  });
  assert.equal(partialUpdate.executable_path, 'E:\\Games\\NewVal\\val.exe');
  assert.equal(partialUpdate.cover_image_url, 'https://newimg.com/val.jpg');
  assert.equal(partialUpdate.Computers.length, 2);
  assert.equal(partialUpdate.name, 'Valorant', 'Tên game không truyền vào phải được giữ nguyên');
});

test('[TC-05] [Ca nghiệp vụ] toggleAvailability - Chuyển đổi trạng thái phục vụ tức thì', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // Game 1 ban đầu is_available = true -> Đổi thành false
  const turnedOff = await service.toggleAvailability(1);
  assert.equal(turnedOff.is_available, false);

  // Đổi tiếp -> Trở lại true
  const turnedOn = await service.toggleAvailability(1);
  assert.equal(turnedOn.is_available, true);

  // ID không tồn tại -> 404
  await assert.rejects(
    async () => await service.toggleAvailability(999),
    { statusCode: 404 }
  );

  // ID sai định dạng -> 400
  await assert.rejects(
    async () => await service.toggleAvailability('sai_id'),
    { statusCode: 400 }
  );
});

test('[TC-06] [Toàn vẹn dữ liệu & Soft Delete] deleteGame & restoreGame - Xóa mềm an toàn', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // 1. Thực hiện xóa mềm Game 2
  const delResult = await service.deleteGame(2);
  assert.equal(delResult.success, true);
  assert.equal(delResult.game_id, 2);

  // 2. Sau khi xóa mềm, truy vấn bình thường không tìm thấy -> 404
  await assert.rejects(
    async () => await service.getGameById(2),
    { statusCode: 404 }
  );

  // 3. Trong danh sách lọc mặc định không còn xuất hiện Game 2
  const listAfterDelete = await service.getGames({});
  assert.equal(listAfterDelete.games.some(g => g.game_id === 2), false);

  // 4. Khôi phục lại Game 2
  const restoreResult = await service.restoreGame(2);
  assert.equal(restoreResult.success, true);
  assert.equal(restoreResult.game_id, 2);

  // 5. Sau khi khôi phục, truy vấn lại thấy Game 2 hoạt động bình thường
  const restoredGame = await service.getGameById(2);
  assert.equal(restoredGame.game_id, 2);
  assert.equal(restoredGame.is_available, true);

  // 6. Xóa / Khôi phục game không tồn tại -> 404
  await assert.rejects(
    async () => await service.deleteGame(999),
    { statusCode: 404 }
  );
  await assert.rejects(
    async () => await service.restoreGame(999),
    { statusCode: 404 }
  );
});

test('[TC-07] [Ca thực tế & Idempotency] Category Management - getCategories & createCategory', async () => {
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);

  // 1. Lấy danh sách thể loại
  const categories = await service.getCategories();
  assert.equal(categories.length, 2);

  // 2. Tạo thể loại tên rỗng / khoảng trắng -> 400
  await assert.rejects(
    async () => await service.createCategory(''),
    { statusCode: 400 }
  );
  await assert.rejects(
    async () => await service.createCategory('    '),
    { statusCode: 400 }
  );
  await assert.rejects(
    async () => await service.createCategory({ name: null }),
    { statusCode: 400 }
  );

  // 3. Tạo thể loại mới thành công (tự động trim)
  const newCat = await service.createCategory('  Battle Royale  ');
  assert.equal(newCat.name, 'Battle Royale');
  assert.equal(newCat.category_id, 3);

  // 4. Idempotency: Tạo lại thể loại đã có (khác hoa thường) -> Trả về bản ghi cũ, không sinh duplicate
  const existingCat = await service.createCategory('battle royale');
  assert.equal(existingCat.category_id, newCat.category_id);
});

test('[TC-08] [Chất lượng Mock & Xử lý sự cố] Error Propagation khi Database gặp sự cố', async () => {
  // Tạo repo bị lỗi crash giả lập
  const crashingRepo = {
    findAll: async () => {
      const err = new Error('ECONNREFUSED: Không thể kết nối tới MySQL Database');
      err.code = 'ECONNREFUSED';
      throw err;
    },
    findById: async () => {
      throw new Error('Deadlock found when trying to get lock');
    }
  };

  const service = new ServiceClass(crashingRepo);

  // Service phải ném lỗi nguyên bản ra ngoài để Controller/Middleware xử lý, không được nuốt lỗi
  await assert.rejects(
    async () => await service.getGames({}),
    /ECONNREFUSED/
  );

  await assert.rejects(
    async () => await service.getGameById(1),
    /Deadlock/
  );
});

test('[TC-09] [Controller & HTTP Contract] GameController & CategoryController - Context & Type Safety', async () => {
  const categoryControllerModule = require('../src/controllers/categoryController');
  const mockRepo = createMockRepo();
  const service = new ServiceClass(mockRepo);
  const testGameController = new gameController.GameController(service);
  const testCategoryController = new categoryControllerModule.CategoryController(service);

  // 1. Kiểm tra Context Retention (Chống mất ngữ cảnh 'this' khi router gọi method rời rạc)
  const { getGames, createGame } = testGameController;
  {
    const req = { query: { search: 'val' } };
    const res = createMockRes();
    let nextCalled = false;
    // Gọi trực tiếp hàm đã destructure mà KHÔNG có testGameController. phía trước
    await getGames(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
  }

  // 2. Kiểm tra chuẩn hóa kiểu dữ liệu Query Params (Chuỗi 'false' -> Boolean false, Chuỗi '2' -> Number 2)
  {
    let capturedFilter = null;
    const mockService = {
      getGames: async (filter) => {
        capturedFilter = filter;
        return { games: [], metrics: {} };
      }
    };
    const filterController = new gameController.GameController(mockService);
    const req = {
      query: {
        search: '  cyberpunk  ',
        category_id: '5',
        is_available: 'false',
        is_remote_supported: 'true'
      }
    };
    const res = createMockRes();
    await filterController.getGames(req, res, () => {});

    assert.equal(capturedFilter.search, 'cyberpunk', 'Chuỗi tìm kiếm phải được trim');
    assert.equal(capturedFilter.category_id, 5, 'category_id phải được parse thành Number');
    assert.equal(capturedFilter.is_available, false, 'is_available="false" phải được parse thành Boolean false');
    assert.equal(capturedFilter.is_remote_supported, true, 'is_remote_supported="true" phải parse thành Boolean true');
  }

  // 3. Test createGame controller trả về HTTP 201 Created
  {
    const req = {
      body: {
        name: `Controller Game ${Date.now()}`,
        category_id: 1,
        executable_path: 'D:\\game.exe'
      }
    };
    const res = createMockRes();
    let nextCalled = false;
    await createGame(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 201, 'Tạo mới game qua API phải trả về HTTP 201');
    assert.equal(res.body.status, 'success');
  }

  // 4. Test Error Propagation qua next(error) khi request không hợp lệ (asyncHandler)
  {
    const req = { body: { name: '' } }; // Thiếu dữ liệu bắt buộc
    const res = createMockRes();
    let capturedError = null;
    await createGame(req, res, (err) => { capturedError = err; });

    assert.ok(capturedError !== null, 'Lỗi phải được chuyển qua next(err) cho Error Middleware');
    assert.equal(capturedError.statusCode, 400);
  }

  // 5. Test CategoryController chuyên trách (Tuân thủ SRP)
  {
    const req = { query: {} };
    const res = createMockRes();
    await testCategoryController.getCategories(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'success');
    assert.ok(Array.isArray(res.body.data));
  }
});

test('[TC-10] [Kiến trúc & SOLID] Export Pattern & Transaction Rollback Simulation', async () => {
  const gameServiceInstance = require('../src/services/gameService');
  const gameRepoInstance = require('../src/repositories/gameRepository');

  // 1. Kiểm tra Export Pattern: Export cả instance lẫn class
  assert.equal(typeof gameServiceInstance.GameService, 'function', 'GameService phải export class GameService để hỗ trợ DI & Mocking');
  assert.equal(typeof gameRepoInstance.GameRepository, 'function', 'GameRepository phải export class GameRepository');

  // 2. Mô phỏng Transaction Rollback khi bước 2 (setComputersForGame) thất bại
  let rollbackExecuted = false;
  const mockRepo = {
    ...createMockRepo(),
    runInTransaction: async (callback) => {
      try {
        return await callback({ id: 'fake_tx' });
      } catch (err) {
        rollbackExecuted = true;
        throw err;
      }
    },
    setComputersForGame: async () => {
      throw new Error('Deadlock / Lỗi bảng trung gian ComputerGame');
    }
  };

  const service = new gameServiceInstance.GameService(mockRepo);

  await assert.rejects(
    async () => await service.createGame({
      name: 'Simulated Fail Game',
      category_id: 1,
      computer_ids: [1, 2]
    }),
    // /Lỗi bảng trung gian ComputerGame/
  );

  assert.equal(rollbackExecuted, true, 'Transaction phải được rollback khi bước gán máy trạm bị lỗi');
});

test('[TC-11] [Bảo mật & SQL Wildcard] escapeLikePattern - Chống SQL Injection gián tiếp & ReDoS', () => {
  const gameRepo = require('../src/repositories/gameRepository');
  const { escapeLikePattern } = gameRepo;

  assert.equal(typeof escapeLikePattern, 'function', 'Phải export hàm escapeLikePattern');

  // 1. Kiểm tra escape ký tự đại diện wildcard SQL (%, _, \)
  assert.equal(escapeLikePattern('50%'), '50\\%');
  assert.equal(escapeLikePattern('game_test.exe'), 'game\\_test.exe');
  assert.equal(escapeLikePattern('C:\\Games\\test.exe'), 'C:\\\\Games\\\\test.exe');
  assert.equal(escapeLikePattern('100%_discount\\free'), '100\\%\\_discount\\\\free');

  // 2. Chuỗi thông thường không bị biến dạng
  assert.equal(escapeLikePattern('Valorant'), 'Valorant');
  assert.equal(escapeLikePattern('League of Legends 2'), 'League of Legends 2');

  // 3. Xử lý giá trị biên không phải string
  assert.equal(escapeLikePattern(null), '');
  assert.equal(escapeLikePattern(undefined), '');
  assert.equal(escapeLikePattern(123), '');
});

test('[TC-12] [Repository & Kiến trúc] GameRepository Soft Delete không hủy ComputerGame & Ủy quyền Category', async () => {
  const { GameRepository } = require('../src/repositories/gameRepository');

  let computerGameDestroyCalled = false;
  let gameUpdatedPayload = null;

  const mockGame = {
    game_id: 1,
    is_deleted: false,
    deleted_at: null,
    is_available: true,
    update: async (payload) => {
      gameUpdatedPayload = payload;
      Object.assign(mockGame, payload);
      return mockGame;
    }
  };

  const mockModels = {
    Game: {
      findByPk: async (id) => (id === 1 ? mockGame : null)
    },
    ComputerGame: {
      destroy: async () => {
        computerGameDestroyCalled = true;
      }
    }
  };

  const mockCategoryRepo = {
    findAll: async () => [{ category_id: 1, name: 'FPS' }],
    findById: async (id) => ({ category_id: id, name: 'FPS' }),
    findByName: async (name) => ({ category_id: 1, name }),
    create: async (data) => ({ category_id: 1, ...data })
  };

  const repo = new GameRepository(mockModels, mockCategoryRepo);

  // 1. Kiểm tra delete(): Cập nhật is_deleted, deleted_at, is_available = false; KHÔNG xóa ComputerGame
  const deleteResult = await repo.delete(1);
  assert.ok(deleteResult !== null);
  assert.equal(gameUpdatedPayload.is_deleted, true);
  assert.ok(gameUpdatedPayload.deleted_at instanceof Date);
  assert.equal(gameUpdatedPayload.is_available, false);
  assert.equal(computerGameDestroyCalled, false, 'delete() tuyệt đối KHÔNG được xóa bảng liên kết ComputerGame để bảo toàn dữ liệu');

  // 2. Kiểm tra restore(): Cập nhật is_deleted = false, deleted_at = null, is_available = true
  const restoreResult = await repo.restore(1);
  assert.ok(restoreResult !== null);
  assert.equal(gameUpdatedPayload.is_deleted, false);
  assert.equal(gameUpdatedPayload.deleted_at, null);
  assert.equal(gameUpdatedPayload.is_available, true);

  // 3. Kiểm tra ủy quyền CategoryRepository (Tuân thủ SRP)
  const cats = await repo.findAllCategories();
  assert.equal(cats.length, 1);
  const cat = await repo.findCategoryById(1);
  assert.equal(cat.name, 'FPS');
  const catByName = await repo.findCategoryByName('FPS');
  assert.equal(catByName.category_id, 1);
  const createdCat = await repo.createCategory({ name: 'RPG' });
  assert.equal(createdCat.name, 'RPG');
});

test('[TC-13] [Kiến trúc & SRP] CategoryService chuyên trách quản lý nghiệp vụ Thể loại game', async () => {
  const { CategoryService } = require('../src/services/categoryService');

  const categories = [
    { category_id: 1, name: 'FPS' },
    { category_id: 2, name: 'MOBA' }
  ];

  const mockCategoryRepo = {
    findAll: async () => [...categories],
    findById: async (id) => categories.find(c => c.category_id === Number(id)) || null,
    findByName: async (name) => categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()) || null,
    create: async (data) => {
      const newCat = { category_id: categories.length + 1, ...data };
      categories.push(newCat);
      return newCat;
    }
  };

  const catService = new CategoryService(mockCategoryRepo);

  // 1. getCategories
  const allCats = await catService.getCategories();
  assert.equal(allCats.length, 2);

  // 2. getCategoryById (Thành công & Không tìm thấy)
  const cat1 = await catService.getCategoryById(1);
  assert.equal(cat1.name, 'FPS');

  await assert.rejects(
    async () => await catService.getCategoryById(999),
    { statusCode: 404, message: 'Thể loại game được chọn không tồn tại' }
  );

  await assert.rejects(
    async () => await catService.getCategoryById('invalid'),
    { statusCode: 400, message: 'ID thể loại không hợp lệ' }
  );

  // 3. createCategory (Validation, Trim, Idempotency)
  await assert.rejects(
    async () => await catService.createCategory(''),
    { statusCode: 400, message: 'Tên thể loại game không được để trống' }
  );

  const newCat = await catService.createCategory('  RTS  ');
  assert.equal(newCat.name, 'RTS');
  assert.equal(newCat.category_id, 3);

  // Idempotency: Tạo lại thể loại đã có trả về bản ghi cũ
  const existingCat = await catService.createCategory('rts');
  assert.equal(existingCat.category_id, 3);
});

