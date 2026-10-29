// src/controllers/gameController.js
const gameService = require('../services/gameService');

class GameController {
  async getGames(req, res, next) {
    try {
      const { search, category_id, is_remote_supported, is_available } = req.query;
      const result = await gameService.getGames({
        search,
        category_id,
        is_remote_supported,
        is_available
      });

      return res.json({
        status: 'success',
        data: result.games,
        metrics: result.metrics,
        message: 'Lấy danh sách trò chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getGameById(req, res, next) {
    try {
      const { id } = req.params;
      const game = await gameService.getGameById(id);
      return res.json({
        status: 'success',
        data: game,
        message: 'Lấy thông tin trò chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async createGame(req, res, next) {
    try {
      const newGame = await gameService.createGame(req.body);
      return res.status(201).json({
        status: 'success',
        data: newGame,
        message: 'Thêm trò chơi mới thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGame(req, res, next) {
    try {
      const { id } = req.params;
      const updatedGame = await gameService.updateGame(id, req.body);
      return res.json({
        status: 'success',
        data: updatedGame,
        message: 'Cập nhật trò chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const updatedGame = await gameService.toggleAvailability(id);
      return res.json({
        status: 'success',
        data: updatedGame,
        message: `Đã ${updatedGame.is_available ? 'kích hoạt' : 'tạm ngưng'} trò chơi thành công`
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteGame(req, res, next) {
    try {
      const { id } = req.params;
      const result = await gameService.deleteGame(id);
      return res.json({
        status: 'success',
        data: result,
        message: 'Xóa trò chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async restoreGame(req, res, next) {
    try {
      const { id } = req.params;
      const result = await gameService.restoreGame(id);
      return res.json({
        status: 'success',
        data: result,
        message: 'Khôi phục trò chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await gameService.getCategories();
      return res.json({
        status: 'success',
        data: categories,
        message: 'Lấy danh mục trò chơi thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await gameService.createCategory(req.body);
      return res.status(201).json({
        status: 'success',
        data: category,
        message: 'Tạo thể loại game mới thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  async getMetrics(req, res, next) {
    try {
      const metrics = await gameService.getMetrics();
      return res.json({
        status: 'success',
        data: metrics,
        message: 'Lấy chỉ số KPI kho game thành công'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GameController();
