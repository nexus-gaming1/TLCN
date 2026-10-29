// src/services/gameService.js
const gameRepository = require('../repositories/gameRepository');
const categoryService = require('./categoryService');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class GameService {
  constructor(repository = gameRepository, catService) {
    this.repository = repository;
    if (catService) {
      this.categoryService = catService;
    } else if (repository && repository !== gameRepository && typeof repository.findCategoryById === 'function') {
      this.categoryService = new categoryService.CategoryService(repository);
    } else {
      this.categoryService = categoryService;
    }
  }

  /**
   * Helper kiểm tra tính hợp lệ của ID (Tuân thủ DRY)
   */
  _validateId(id, entityName = 'game') {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new ValidationError(`ID ${entityName} không hợp lệ`);
    }
    return parsedId;
  }

  /**
   * Lấy danh sách games kèm filter và metrics
   */
  async getGames(filter = {}) {
    const games = await this.repository.findAll(filter);
    const metrics = await this.repository.getMetrics();
    return {
      games,
      metrics
    };
  }

  /**
   * Lấy chi tiết game theo ID
   */
  async getGameById(id) {
    const parsedId = this._validateId(id, 'game');
    const game = await this.repository.findById(parsedId);
    if (!game) {
      throw new NotFoundError(`Không tìm thấy game với ID: ${parsedId}`);
    }
    return game;
  }

  /**
   * Tạo game mới (Được bọc trong Managed Database Transaction đảm bảo tính toàn vẹn ACID)
   */
  async createGame(data) {
    const { name, category_id, cover_image_url, executable_path, is_remote_supported, is_available, computer_ids } = data || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ValidationError('Tên game không được để trống');
    }

    if (!category_id || Number(category_id) <= 0) {
      throw new ValidationError('Vui lòng chọn thể loại cho game');
    }

    // Xác thực thể loại qua CategoryService chuyên trách
    await this.categoryService.getCategoryById(Number(category_id));

    const existingGame = await this.repository.findByName(name.trim());
    if (existingGame) {
      throw new ConflictError(`Game với tên "${name.trim()}" đã tồn tại trong hệ thống`);
    }

    // Thực thi trong Transaction
    return await this.repository.runInTransaction(async (transaction) => {
      const newGame = await this.repository.create({
        name: name.trim(),
        category_id: Number(category_id),
        cover_image_url: cover_image_url?.trim() || null,
        executable_path: executable_path?.trim() || null,
        is_remote_supported: Boolean(is_remote_supported),
        is_available: is_available !== undefined ? Boolean(is_available) : true
      }, { transaction });

      if (Array.isArray(computer_ids) && computer_ids.length > 0) {
        await this.repository.setComputersForGame(newGame.game_id, computer_ids, { transaction });
      }

      return await this.repository.findById(newGame.game_id, false, { transaction });
    });
  }

  /**
   * Cập nhật thông tin game (Được bọc trong Managed Database Transaction đảm bảo ACID)
   */
  async updateGame(id, data) {
    const parsedId = this._validateId(id, 'game');

    const { name, category_id, cover_image_url, executable_path, is_remote_supported, is_available, computer_ids } = data || {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new ValidationError('Tên game không được để trống');
      }

      const existingGame = await this.repository.findByName(name.trim());
      if (existingGame && existingGame.game_id !== parsedId) {
        throw new ConflictError(`Game với tên "${name.trim()}" đã tồn tại`);
      }
    }

    if (category_id !== undefined) {
      // Xác thực thể loại qua CategoryService chuyên trách
      await this.categoryService.getCategoryById(Number(category_id));
    }

    // Thực thi trong Transaction
    return await this.repository.runInTransaction(async (transaction) => {
      const game = await this.repository.findById(parsedId, false, { transaction });
      if (!game) {
        throw new NotFoundError(`Không tìm thấy game với ID: ${parsedId}`);
      }

      const updatePayload = {};
      if (name !== undefined) updatePayload.name = name.trim();
      if (category_id !== undefined) updatePayload.category_id = Number(category_id);
      if (cover_image_url !== undefined) updatePayload.cover_image_url = cover_image_url ? cover_image_url.trim() : null;
      if (executable_path !== undefined) updatePayload.executable_path = executable_path ? executable_path.trim() : null;
      if (is_remote_supported !== undefined) updatePayload.is_remote_supported = Boolean(is_remote_supported);
      if (is_available !== undefined) updatePayload.is_available = Boolean(is_available);

      await this.repository.update(game, updatePayload, { transaction });

      if (Array.isArray(computer_ids)) {
        await this.repository.setComputersForGame(parsedId, computer_ids, { transaction });
      }

      return await this.repository.findById(parsedId, false, { transaction });
    });
  }

  /**
   * Bật/Tắt trạng thái hoạt động của game
   */
  async toggleAvailability(id) {
    const parsedId = this._validateId(id, 'game');
    const game = await this.repository.findById(parsedId);
    if (!game) {
      throw new NotFoundError(`Không tìm thấy game với ID: ${parsedId}`);
    }

    const nextStatus = !game.is_available;
    await this.repository.update(game, { is_available: nextStatus });

    return await this.repository.findById(parsedId);
  }

  /**
   * Xóa mềm game khỏi thư viện (Soft Delete)
   */
  async deleteGame(id) {
    const parsedId = this._validateId(id, 'game');
    const game = await this.repository.findById(parsedId);
    if (!game) {
      throw new NotFoundError(`Không tìm thấy game với ID: ${parsedId}`);
    }

    await this.repository.delete(parsedId);
    return { success: true, game_id: parsedId, message: 'Đã xóa trò chơi thành công' };
  }

  /**
   * Khôi phục game đã bị xóa mềm (Restore)
   */
  async restoreGame(id) {
    const parsedId = this._validateId(id, 'game');
    const game = await this.repository.findById(parsedId, true);
    if (!game) {
      throw new NotFoundError(`Không tìm thấy game với ID: ${parsedId}`);
    }

    await this.repository.restore(parsedId);
    return { success: true, game_id: parsedId, message: 'Đã khôi phục trò chơi thành công' };
  }

  /**
   * Lấy danh sách thể loại game (Ủy quyền CategoryService)
   */
  async getCategories(options = {}) {
    return await this.categoryService.getCategories(options);
  }

  /**
   * Tạo thể loại game mới (Ủy quyền CategoryService)
   */
  async createCategory(data, options = {}) {
    return await this.categoryService.createCategory(data, options);
  }

  /**
   * Lấy KPI metrics
   */
  async getMetrics() {
    return await this.repository.getMetrics();
  }
}

const defaultInstance = new GameService();
defaultInstance.GameService = GameService;
module.exports = defaultInstance;
