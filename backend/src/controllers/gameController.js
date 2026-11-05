// src/controllers/gameController.js
const gameService = require('../services/gameService');
const categoryController = require('./categoryController');
const asyncHandler = require('../utils/asyncHandler');


class GameController {
  constructor(service = gameService) {
    this.service = service;
  }

  getGames = asyncHandler(async (req, res) => {
    const { search, category_id, is_remote_supported, is_available } = req.query;

    // Chuẩn hóa kiểu dữ liệu từ chuỗi query params (Type Safety & Defensive Parsing)
    const filter = {
      search: search ? String(search).trim() : undefined,
      category_id: category_id && category_id !== 'all' ? Number(category_id) : undefined,
      is_remote_supported: is_remote_supported !== undefined && is_remote_supported !== 'all'
        ? (is_remote_supported === 'true' || is_remote_supported === true)
        : undefined,
      is_available: is_available !== undefined && is_available !== 'all'
        ? (is_available === 'true' || is_available === true)
        : undefined
    };

    const result = await this.service.getGames(filter);

    return res.json({
      status: 'success',
      data: result.games,
      metrics: result.metrics,
      message: 'Lấy danh sách trò chơi thành công'
    });
  });

  /**
   * Lấy chi tiết trò chơi theo ID
   */
  getGameById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const game = await this.service.getGameById(id);
    return res.json({
      status: 'success',
      data: game,
      message: 'Lấy thông tin trò chơi thành công'
    });
  });

  /**
   * Thêm trò chơi mới
   */
  createGame = asyncHandler(async (req, res) => {
    const newGame = await this.service.createGame(req.body);
    return res.status(201).json({
      status: 'success',
      data: newGame,
      message: 'Thêm trò chơi mới thành công'
    });
  });


  updateGame = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedGame = await this.service.updateGame(id, req.body);
    return res.json({
      status: 'success',
      data: updatedGame,
      message: 'Cập nhật trò chơi thành công'
    });
  });


  toggleAvailability = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedGame = await this.service.toggleAvailability(id);
    return res.json({
      status: 'success',
      data: updatedGame,
      message: `Đã ${updatedGame.is_available ? 'kích hoạt' : 'tạm ngưng'} trò chơi thành công`
    });
  });

  deleteGame = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.service.deleteGame(id);
    return res.json({
      status: 'success',
      data: result,
      message: 'Xóa trò chơi thành công'
    });
  });


  restoreGame = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await this.service.restoreGame(id);
    return res.json({
      status: 'success',
      data: result,
      message: 'Khôi phục trò chơi thành công'
    });
  });

  /**
   * Lấy số liệu KPI kho game
   */
  getMetrics = asyncHandler(async (req, res) => {
    const metrics = await this.service.getMetrics();
    return res.json({
      status: 'success',
      data: metrics,
      message: 'Lấy chỉ số KPI kho game thành công'
    });
  });

  // Ủy quyền sang CategoryController chuyên trách (đảm bảo Backward Compatibility)
  getCategories = categoryController.getCategories;
  createCategory = categoryController.createCategory;
}

const defaultInstance = new GameController();
defaultInstance.GameController = GameController;
module.exports = defaultInstance;
