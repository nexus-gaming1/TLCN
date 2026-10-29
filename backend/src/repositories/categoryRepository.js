// src/repositories/categoryRepository.js
const db = require('../models');

/**
 * Repository chuyên trách quản lý thực thể GameCategory (Tuân thủ SRP)
 */
class CategoryRepository {
  constructor(models = db) {
    this.models = models;
    this.sequelize = models ? models.sequelize : null;
  }

  /**
   * Lấy tất cả danh mục thể loại game
   */
  async findAll(options = {}) {
    return await this.models.GameCategory.findAll({
      include: [
        {
          model: this.models.Game,
          where: { is_deleted: false },
          required: false,
          attributes: ['game_id', 'name', 'is_available']
        }
      ],
      order: [['category_id', 'ASC']],
      ...options
    });
  }

  /**
   * Tìm danh mục theo ID
   */
  async findById(categoryId, options = {}) {
    return await this.models.GameCategory.findByPk(categoryId, options);
  }

  /**
   * Tìm danh mục theo tên (case-insensitive)
   */
  async findByName(name, options = {}) {
    if (!name || typeof name !== 'string') return null;
    return await this.models.GameCategory.findOne({
      where: { name: name.trim() },
      ...options
    });
  }

  /**
   * Tạo thể loại game mới
   */
  async create(data, options = {}) {
    return await this.models.GameCategory.create(data, options);
  }
}

const defaultInstance = new CategoryRepository();
defaultInstance.CategoryRepository = CategoryRepository;
module.exports = defaultInstance;
