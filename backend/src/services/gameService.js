// src/services/gameService.js
const gameRepository = require('../repositories/gameRepository');

class GameService {
  constructor(repository = gameRepository) {
    this.repository = repository;
  }

  /**
   * Lấy danh sách games kèm filter và metrics
   */
  async getGames(filter = {}) {
    try {
      const games = await this.repository.findAll(filter);
      const metrics = await this.repository.getMetrics();
      return {
        games,
        metrics
      };
    } catch (error) {
      console.error('Lỗi khi lấy danh sách games:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết game theo ID
   */
  async getGameById(id) {
    try {
      const parsedId = Number(id);
      if (!parsedId || isNaN(parsedId)) {
        const error = new Error('ID game không hợp lệ');
        error.statusCode = 400;
        throw error;
      }

      const game = await this.repository.findById(parsedId);
      if (!game) {
        const error = new Error(`Không tìm thấy game với ID: ${parsedId}`);
        error.statusCode = 404;
        throw error;
      }

      return game;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết game:', error);
      throw error;
    }
  }

  /**
   * Tạo game mới
   */
  async createGame(data) {
    try {
      const { name, category_id, cover_image_url, executable_path, is_remote_supported, is_available, computer_ids } = data;

      if (!name || !name.trim()) {
        const error = new Error('Tên game không được để trống');
        error.statusCode = 400;
        throw error;
      }

      if (!category_id) {
        const error = new Error('Vui lòng chọn thể loại cho game');
        error.statusCode = 400;
        throw error;
      }

      const category = await this.repository.findCategoryById(Number(category_id));
      if (!category) {
        const error = new Error('Thể loại game được chọn không tồn tại');
        error.statusCode = 404;
        throw error;
      }

      const existingGame = await this.repository.findByName(name.trim());
      if (existingGame) {
        const error = new Error(`Game với tên "${name.trim()}" đã tồn tại trong hệ thống`);
        error.statusCode = 409;
        throw error;
      }

      const newGame = await this.repository.create({
        name: name.trim(),
        category_id: Number(category_id),
        cover_image_url: cover_image_url?.trim() || null,
        executable_path: executable_path?.trim() || null,
        is_remote_supported: Boolean(is_remote_supported),
        is_available: is_available !== undefined ? Boolean(is_available) : true
      });

      if (Array.isArray(computer_ids) && computer_ids.length > 0) {
        await this.repository.setComputersForGame(newGame.game_id, computer_ids);
      }

      return await this.repository.findById(newGame.game_id);
    } catch (error) {
      console.error('Lỗi khi tạo game mới:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin game
   */
  async updateGame(id, data) {
    try {
      const parsedId = Number(id);
      if (!parsedId || isNaN(parsedId)) {
        const error = new Error('ID game không hợp lệ');
        error.statusCode = 400;
        throw error;
      }

      const game = await this.repository.findById(parsedId);
      if (!game) {
        const error = new Error(`Không tìm thấy game với ID: ${parsedId}`);
        error.statusCode = 404;
        throw error;
      }

      const { name, category_id, cover_image_url, executable_path, is_remote_supported, is_available, computer_ids } = data;

      const updatePayload = {};

      if (name !== undefined) {
        if (!name.trim()) {
          const error = new Error('Tên game không được để trống');
          error.statusCode = 400;
          throw error;
        }

        const existingGame = await this.repository.findByName(name.trim());
        if (existingGame && existingGame.game_id !== parsedId) {
          const error = new Error(`Game với tên "${name.trim()}" đã tồn tại`);
          error.statusCode = 409;
          throw error;
        }
        updatePayload.name = name.trim();
      }

      if (category_id !== undefined) {
        const category = await this.repository.findCategoryById(Number(category_id));
        if (!category) {
          const error = new Error('Thể loại game được chọn không tồn tại');
          error.statusCode = 404;
          throw error;
        }
        updatePayload.category_id = Number(category_id);
      }

      if (cover_image_url !== undefined) {
        updatePayload.cover_image_url = cover_image_url ? cover_image_url.trim() : null;
      }

      if (executable_path !== undefined) {
        updatePayload.executable_path = executable_path ? executable_path.trim() : null;
      }

      if (is_remote_supported !== undefined) {
        updatePayload.is_remote_supported = Boolean(is_remote_supported);
      }

      if (is_available !== undefined) {
        updatePayload.is_available = Boolean(is_available);
      }

      await this.repository.update(game, updatePayload);

      if (Array.isArray(computer_ids)) {
        await this.repository.setComputersForGame(parsedId, computer_ids);
      }

      return await this.repository.findById(parsedId);
    } catch (error) {
      console.error('Lỗi khi cập nhật game:', error);
      throw error;
    }
  }

  /**
   * Bật/Tắt trạng thái hoạt động của game
   */
  async toggleAvailability(id) {
    try {
      const parsedId = Number(id);
      if (!parsedId || isNaN(parsedId)) {
        const error = new Error('ID game không hợp lệ');
        error.statusCode = 400;
        throw error;
      }

      const game = await this.repository.findById(parsedId);
      if (!game) {
        const error = new Error(`Không tìm thấy game với ID: ${parsedId}`);
        error.statusCode = 404;
        throw error;
      }

      const nextStatus = !game.is_available;
      await this.repository.update(game, { is_available: nextStatus });

      return await this.repository.findById(parsedId);
    } catch (error) {
      console.error('Lỗi khi đổi trạng thái game:', error);
      throw error;
    }
  }

  /**
   * Xóa mềm game khỏi thư viện (Soft Delete)
   */
  async deleteGame(id) {
    try {
      const parsedId = Number(id);
      if (!parsedId || isNaN(parsedId)) {
        const error = new Error('ID game không hợp lệ');
        error.statusCode = 400;
        throw error;
      }

      const game = await this.repository.findById(parsedId);
      if (!game) {
        const error = new Error(`Không tìm thấy game với ID: ${parsedId}`);
        error.statusCode = 404;
        throw error;
      }

      await this.repository.delete(parsedId);
      return { success: true, game_id: parsedId, message: 'Đã xóa trò chơi thành công' };
    } catch (error) {
      console.error('Lỗi khi xóa game:', error);
      throw error;
    }
  }

  /**
   * Khôi phục game đã bị xóa mềm (Restore)
   */
  async restoreGame(id) {
    try {
      const parsedId = Number(id);
      if (!parsedId || isNaN(parsedId)) {
        const error = new Error('ID game không hợp lệ');
        error.statusCode = 400;
        throw error;
      }

      const game = await this.repository.findById(parsedId, true);
      if (!game) {
        const error = new Error(`Không tìm thấy game với ID: ${parsedId}`);
        error.statusCode = 404;
        throw error;
      }

      await this.repository.restore(parsedId);
      return { success: true, game_id: parsedId, message: 'Đã khôi phục trò chơi thành công' };
    } catch (error) {
      console.error('Lỗi khi khôi phục game:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách thể loại game
   */
  async getCategories() {
    try {
      return await this.repository.findAllCategories();
    } catch (error) {
      console.error('Lỗi khi lấy danh mục game:', error);
      throw error;
    }
  }

  /**
   * Tạo thể loại game mới
   */
  async createCategory(data) {
    try {
      const name = typeof data === 'string' ? data : data?.name;
      if (!name || !name.trim()) {
        const error = new Error('Tên thể loại game không được để trống');
        error.statusCode = 400;
        throw error;
      }

      const trimmedName = name.trim();
      const existing = await this.repository.findCategoryByName(trimmedName);
      if (existing) {
        return existing;
      }

      return await this.repository.createCategory({ name: trimmedName });
    } catch (error) {
      console.error('Lỗi khi tạo thể loại game mới:', error);
      throw error;
    }
  }

  /**
   * Lấy KPI metrics
   */
  async getMetrics() {
    try {
      return await this.repository.getMetrics();
    } catch (error) {
      console.error('Lỗi khi tính toán KPI metrics game:', error);
      throw error;
    }
  }
}

module.exports = new GameService();
