// src/repositories/gameRepository.js
const { Op } = require('sequelize');
const db = require('../models');

class GameRepository {
  constructor(models = db) {
    this.models = models;
  }

  async findAll(filter = {}) {
    const where = {};

    // Mặc định chỉ lấy game chưa bị xóa mềm (is_deleted: false)
    if (filter.include_deleted !== true && filter.include_deleted !== 'true') {
      where.is_deleted = false;
    }

    if (filter.search) {
      const searchPattern = `%${filter.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: searchPattern } },
        { executable_path: { [Op.like]: searchPattern } }
      ];
    }

    if (filter.category_id && filter.category_id !== 'all') {
      where.category_id = Number(filter.category_id);
    }

    if (filter.is_remote_supported !== undefined && filter.is_remote_supported !== 'all') {
      where.is_remote_supported = filter.is_remote_supported === true || filter.is_remote_supported === 'true';
    }

    if (filter.is_available !== undefined && filter.is_available !== 'all') {
      where.is_available = filter.is_available === true || filter.is_available === 'true';
    }

    return await this.models.Game.findAll({
      where,
      include: [
        {
          model: this.models.GameCategory,
          attributes: ['category_id', 'name']
        },
        {
          model: this.models.Computer,
          attributes: ['computer_id', 'computer_name', 'status', 'zone_id'],
          through: { attributes: [] },
          required: false
        }
      ],
      order: [['game_id', 'ASC']]
    });
  }

  /**
   * Tìm game theo ID (mặc định chỉ tìm game chưa bị xóa mềm)
   */
  async findById(gameId, includeDeleted = false) {
    const where = { game_id: gameId };
    if (!includeDeleted) {
      where.is_deleted = false;
    }

    return await this.models.Game.findOne({
      where,
      include: [
        {
          model: this.models.GameCategory,
          attributes: ['category_id', 'name']
        },
        {
          model: this.models.Computer,
          attributes: ['computer_id', 'computer_name', 'status', 'zone_id'],
          through: { attributes: [] },
          required: false
        }
      ]
    });
  }

  /**
   * Tìm game theo tên để kiểm tra trùng lặp (mặc định chỉ tìm game chưa bị xóa mềm)
   */
  async findByName(name, includeDeleted = false) {
    const where = { name: name.trim() };
    if (!includeDeleted) {
      where.is_deleted = false;
    }

    return await this.models.Game.findOne({
      where
    });
  }

  /**
   * Tạo game mới
   */
  async create(gameData) {
    return await this.models.Game.create(gameData);
  }

  /**
   * Cập nhật game
   */
  async update(gameInstance, updateData) {
    return await gameInstance.update(updateData);
  }

  /**
   * Xóa mềm game (Soft Delete)
   * Không xóa trực tiếp khỏi database, mà đánh dấu is_deleted = true và ghi nhận deleted_at
   */
  async delete(gameId) {
    const game = await this.models.Game.findByPk(gameId);
    if (!game) return null;

    // Gỡ liên kết máy trạm (ComputerGame) để máy trạm không còn hiển thị game đã xóa
    if (this.models.ComputerGame) {
      await this.models.ComputerGame.destroy({ where: { game_id: gameId } });
    }

    if (typeof game.softDelete === 'function') {
      return await game.softDelete();
    }

    return await game.update({
      is_deleted: true,
      deleted_at: new Date(),
      is_available: false
    });
  }

  /**
   * Khôi phục game đã xóa mềm (Restore)
   */
  async restore(gameId) {
    const game = await this.models.Game.findByPk(gameId);
    if (!game) return null;

    if (typeof game.restore === 'function') {
      return await game.restore();
    }

    return await game.update({
      is_deleted: false,
      deleted_at: null,
      is_available: true
    });
  }

  /**
   * Lấy tất cả danh mục game (chỉ tính kèm game chưa bị xóa mềm)
   */
  async findAllCategories() {
    return await this.models.GameCategory.findAll({
      include: [
        {
          model: this.models.Game,
          where: { is_deleted: false },
          required: false,
          attributes: ['game_id', 'name', 'is_available']
        }
      ],
      order: [['category_id', 'ASC']]
    });
  }

  /**
   * Tìm danh mục theo ID
   */
  async findCategoryById(categoryId) {
    return await this.models.GameCategory.findByPk(categoryId);
  }

  /**
   * Tìm danh mục theo tên
   */
  async findCategoryByName(name) {
    return await this.models.GameCategory.findOne({
      where: { name }
    });
  }

  /**
   * Tạo thể loại game mới
   */
  async createCategory(data) {
    return await this.models.GameCategory.create(data);
  }

  /**
   * Gán hoặc đồng bộ danh sách máy trạm cho game
   */
  async setComputersForGame(gameId, computerIds = []) {
    if (!this.models.ComputerGame) return;
    await this.models.ComputerGame.destroy({ where: { game_id: gameId } });
    if (computerIds && computerIds.length > 0) {
      const records = computerIds.map((cid) => ({
        computer_id: cid,
        game_id: gameId
      }));
      await this.models.ComputerGame.bulkCreate(records);
    }
  }

  /**
   * Đếm số lượng máy tính hỗ trợ game
   */
  async countAssignedComputers(gameId) {
    if (!this.models.ComputerGame) return 0;
    return await this.models.ComputerGame.count({ where: { game_id: gameId } });
  }

  /**
   * Tính toán KPIs thực tế cho kho game
   */
  async getMetrics() {
    const allGames = await this.models.Game.findAll({
      where: { is_deleted: false },
      attributes: ['game_id', 'name', 'is_available', 'is_remote_supported', 'category_id'],
      include: [
        {
          model: this.models.GameCategory,
          attributes: ['category_id', 'name']
        }
      ]
    });

    const allCategories = this.models.GameCategory
      ? await this.models.GameCategory.findAll({ attributes: ['category_id', 'name'] }).catch(() => [])
      : [];

    const totalGames = allGames.length;
    const availableGames = allGames.filter((g) => g.is_available).length;
    const maintenanceGames = totalGames - availableGames;
    const remoteSupportedGames = allGames.filter((g) => g.is_remote_supported).length;
    const availabilityRate = totalGames > 0 ? Number(((availableGames / totalGames) * 100).toFixed(1)) : 100.0;
    const remoteRate = totalGames > 0 ? Number(((remoteSupportedGames / totalGames) * 100).toFixed(1)) : 0.0;

    // Thống kê phân bổ theo từng phân mục thực tế từ CSDL
    const categoryCountMap = {};
    allCategories.forEach((c) => {
      categoryCountMap[c.name] = 0;
    });

    allGames.forEach((g) => {
      const catName = g.GameCategory?.name || 'Khác';
      categoryCountMap[catName] = (categoryCountMap[catName] || 0) + 1;
    });

    // Xác định thể loại chủ đạo có nhiều game nhất
    const sortedEntries = Object.entries(categoryCountMap).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedEntries.length > 0 && sortedEntries[0][1] > 0
      ? { name: sortedEntries[0][0], count: sortedEntries[0][1] }
      : null;

    const totalCategories = allCategories.length || Object.keys(categoryCountMap).length;
    const categoryNames = Object.keys(categoryCountMap);
    const categoriesSummary = categoryNames.join(', ');

    // Đếm tổng số lượt cài đặt game trên các máy trạm (ComputerGame)
    const totalInstallations = this.models.ComputerGame
      ? await this.models.ComputerGame.count().catch(() => 0)
      : 0;

    return {
      totalGames,
      availableGames,
      maintenanceGames,
      remoteSupportedGames,
      availabilityRate,
      remoteRate,
      totalCategories,
      categoryDistribution: categoryCountMap,
      categoryNames,
      categoriesSummary,
      topCategory,
      totalInstallations
    };
  }
}

module.exports = new GameRepository();
