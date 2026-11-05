// src/services/categoryService.js
const categoryRepository = require('../repositories/categoryRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Service chuyên trách nghiệp vụ Thể loại game (Tuân thủ Single Responsibility Principle)
 */
class CategoryService {
  constructor(repository = categoryRepository) {
    this.repository = repository;
  }

  /**
   * Helper phân giải repository đa hình (tương thích cả CategoryRepository lẫn mockRepo)
   */
  _getRepo() {
    return this.repository;
  }

  /**
   * Lấy danh sách tất cả thể loại game
   */
  async getCategories(options = {}) {
    const repo = this._getRepo();
    if (typeof repo.findAllCategories === 'function') {
      return await repo.findAllCategories(options);
    }
    if (typeof repo.findAll === 'function') {
      return await repo.findAll(options);
    }
    return [];
  }

  /**
   * Lấy chi tiết thể loại game theo ID
   */
  async getCategoryById(id, options = {}) {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new ValidationError('ID thể loại không hợp lệ');
    }

    const repo = this._getRepo();
    let category = null;

    if (typeof repo.findCategoryById === 'function') {
      category = await repo.findCategoryById(parsedId, options);
    } else if (typeof repo.findById === 'function') {
      category = await repo.findById(parsedId, options);
    }

    if (!category) {
      throw new NotFoundError('Thể loại game được chọn không tồn tại');
    }
    return category;
  }

  /**
   * Tìm thể loại theo tên
   */
  async findCategoryByName(name, options = {}) {
    if (!name || typeof name !== 'string') return null;
    const trimmedName = name.trim();
    const repo = this._getRepo();

    if (typeof repo.findCategoryByName === 'function') {
      return await repo.findCategoryByName(trimmedName, options);
    }
    if (typeof repo.findByName === 'function') {
      return await repo.findByName(trimmedName, options);
    }
    return null;
  }

  /**
   * Tạo thể loại game mới (Idempotent: trả về bản ghi cũ nếu đã có, tự động trim)
   */
  async createCategory(data, options = {}) {
    const name = typeof data === 'string' ? data : data?.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ValidationError('Tên thể loại game không được để trống');
    }

    const trimmedName = name.trim();
    const existing = await this.findCategoryByName(trimmedName, options);
    if (existing) {
      return existing;
    }

    const repo = this._getRepo();
    if (typeof repo.createCategory === 'function') {
      return await repo.createCategory({ name: trimmedName }, options);
    }
    if (typeof repo.create === 'function') {
      return await repo.create({ name: trimmedName }, options);
    }

    throw new Error('Repository không hỗ trợ phương thức tạo thể loại');
  }
}

const defaultInstance = new CategoryService();
defaultInstance.CategoryService = CategoryService;
module.exports = defaultInstance;
