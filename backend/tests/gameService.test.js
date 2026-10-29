const test = require('node:test');
const assert = require('node:assert/strict');

test('GameService Unit Tests', async (t) => {
  const ServiceClass = require('../src/services/gameService').constructor;
  const createMockRepo = () => {
    const mockGames = [
      {
        game_id: 1,
        name: 'Valorant',
        category_id: 1,
        cover_image_url: 'https://example.com/val.jpg',
        executable_path: 'C:\\Games\\val.exe',
        is_remote_supported: true,
        is_available: true,
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
        GameCategory: { category_id: 2, name: 'Esports MOBA' },
        Computers: []
      }
    ];

    const mockCategories = [
      { category_id: 1, name: 'Esports FPS' },
      { category_id: 2, name: 'Esports MOBA' }
    ];

    return {
      findAll: async (filter = {}) => {
        let result = [...mockGames];
        if (filter.search) {
          result = result.filter(g => g.name.toLowerCase().includes(filter.search.toLowerCase()));
        }
        if (filter.category_id && filter.category_id !== 'all') {
          result = result.filter(g => g.category_id === Number(filter.category_id));
        }
        if (filter.is_available !== undefined && filter.is_available !== 'all') {
          const isAvail = filter.is_available === true || filter.is_available === 'true';
          result = result.filter(g => g.is_available === isAvail);
        }
        return result;
      },
      findById: async (id, includeDeleted = false) => mockGames.find(g => g.game_id === Number(id) && (includeDeleted || !g.is_deleted)) || null,
      findByName: async (name) => mockGames.find(g => g.name.toLowerCase() === name.trim().toLowerCase()) || null,
      findCategoryById: async (id) => mockCategories.find(c => c.category_id === Number(id)) || null,
      findCategoryByName: async (name) => mockCategories.find(c => c.name.toLowerCase() === name.trim().toLowerCase()) || null,
      findAllCategories: async () => mockCategories,
      createCategory: async (data) => {
        const newCat = { category_id: mockCategories.length + 1, ...data };
        mockCategories.push(newCat);
        return newCat;
      },
      create: async (data) => {
        const newGame = { game_id: 3, ...data };
        mockGames.push(newGame);
        return newGame;
      },
      update: async (instance, updateData) => {
        Object.assign(instance, updateData);
        return instance;
      },
      delete: async (id) => {
        const game = mockGames.find(g => g.game_id === Number(id));
        if (game) {
          game.is_deleted = true;
          game.deleted_at = new Date();
          game.is_available = false;
        }
        return 1;
      },
      restore: async (id) => {
        const game = mockGames.find(g => g.game_id === Number(id));
        if (game) {
          game.is_deleted = false;
          game.deleted_at = null;
          game.is_available = true;
        }
        return 1;
      },
      setComputersForGame: async (_gameId, _computerIds) => true,
      getMetrics: async () => ({
        totalGames: mockGames.length,
        availableGames: mockGames.filter(g => g.is_available).length,
        maintenanceGames: mockGames.filter(g => !g.is_available).length,
        remoteSupportedGames: mockGames.filter(g => g.is_remote_supported).length,
        availabilityRate: 50.0,
        remoteRate: 50.0,
        totalCategories: 2,
        categoryDistribution: { 'Esports FPS': 1, 'Esports MOBA': 1 },
        categoryNames: ['Esports FPS', 'Esports MOBA'],
        categoriesSummary: 'Esports FPS, Esports MOBA',
        topCategory: { name: 'Esports FPS', count: 1 },
        totalInstallations: 1
      })
    };
  };

  await t.test('getGames returns list and metrics', async () => {
    const mockRepo = createMockRepo();
    const service = new ServiceClass(mockRepo);

    const result = await service.getGames({});
    assert.equal(result.games.length, 2);
    assert.equal(result.metrics.totalGames, 2);
    assert.equal(result.metrics.availableGames, 1);
    assert.equal(result.metrics.totalCategories, 2);
    assert.equal(result.metrics.totalInstallations, 1);
    assert.equal(result.metrics.topCategory.name, 'Esports FPS');
  });

  await t.test('getGameById validates valid id and throws on non-existent', async () => {
    const mockRepo = createMockRepo();
    const service = new ServiceClass(mockRepo);

    const game = await service.getGameById(1);
    assert.equal(game.name, 'Valorant');

    await assert.rejects(
      async () => await service.getGameById(999),
      { statusCode: 404 }
    );

    await assert.rejects(
      async () => await service.getGameById('abc'),
      { statusCode: 400 }
    );
  });

  await t.test('createGame validates required fields and duplicates', async () => {
    const mockRepo = createMockRepo();
    const service = new ServiceClass(mockRepo);

    // Empty name
    await assert.rejects(
      async () => await service.createGame({ name: '', category_id: 1 }),
      { statusCode: 400 }
    );

    // Missing category
    await assert.rejects(
      async () => await service.createGame({ name: 'CS2', category_id: null }),
      { statusCode: 400 }
    );

    // Invalid category
    await assert.rejects(
      async () => await service.createGame({ name: 'CS2', category_id: 99 }),
      { statusCode: 404 }
    );

    // Duplicate name
    await assert.rejects(
      async () => await service.createGame({ name: 'Valorant', category_id: 1 }),
      { statusCode: 409 }
    );

    // Successful create
    const newGame = await service.createGame({
      name: 'Counter-Strike 2',
      category_id: 1,
      cover_image_url: 'https://example.com/cs2.jpg',
      executable_path: 'C:\\cs2.exe',
      is_remote_supported: true
    });
    assert.equal(newGame.game_id, 3);
    assert.equal(newGame.name, 'Counter-Strike 2');
  });

  await t.test('toggleAvailability switches status', async () => {
    const mockRepo = createMockRepo();
    const service = new ServiceClass(mockRepo);

    const updated = await service.toggleAvailability(1);
    assert.equal(updated.is_available, false);

    const toggledBack = await service.toggleAvailability(1);
    assert.equal(toggledBack.is_available, true);
  });

  await t.test('deleteGame performs soft delete and restoreGame restores', async () => {
    const mockRepo = createMockRepo();
    const service = new ServiceClass(mockRepo);

    const res = await service.deleteGame(2);
    assert.equal(res.success, true);
    assert.equal(res.game_id, 2);

    // Truy vấn thông thường không thấy game đã bị xóa mềm
    await assert.rejects(
      async () => await service.getGameById(2),
      { statusCode: 404 }
    );

    // Khôi phục game
    const restoreRes = await service.restoreGame(2);
    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.game_id, 2);

    const restored = await service.getGameById(2);
    assert.equal(restored.game_id, 2);
  });

  await t.test('createCategory creates new or returns existing', async () => {
    const mockRepo = createMockRepo();
    const service = new ServiceClass(mockRepo);

    // Empty validation
    await assert.rejects(
      async () => await service.createCategory(''),
      { statusCode: 400 }
    );

    // Creates new category
    const newCat = await service.createCategory('VR Gaming');
    assert.equal(newCat.name, 'VR Gaming');

    // Returns existing if same name
    const existing = await service.createCategory('vr gaming');
    assert.equal(existing.category_id, newCat.category_id);
  });
});
