// src/controllers/categoryController.js
const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller chuyên trách quản lý danh mục và phân loại thể loại game (Tuân thủ SRP)
 */
class CategoryController {
  constructor(service = categoryService) {
    this.service = service;
  }

  /**
   * Lấy danh sách thể loại game
   */
  getCategories = asyncHandler(async (req, res) => {
    const categories = await this.service.getCategories();
    return res.json({
      status: 'success',
      data: categories,
      message: 'Lấy danh mục trò chơi thành công'
    });
  });

  /**
   * Tạo thể loại game mới
   */
  createCategory = asyncHandler(async (req, res) => {
    const category = await this.service.createCategory(req.body);
    return res.status(201).json({
      status: 'success',
      data: category,
      message: 'Tạo thể loại game mới thành công'
    });
  });
}

const defaultInstance = new CategoryController();
defaultInstance.CategoryController = CategoryController;
module.exports = defaultInstance;
