// src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const categoryController = require('../controllers/categoryController');

// Thống kê KPIs
router.get('/metrics', gameController.getMetrics);

// Danh mục trò chơi (Ủy quyền cho CategoryController chuyên trách)
router.get('/categories', categoryController.getCategories);
router.post('/categories', categoryController.createCategory);

// CRUD Trò chơi
router.get('/', gameController.getGames);
router.get('/:id', gameController.getGameById);
router.post('/', gameController.createGame);
router.put('/:id', gameController.updateGame);
router.patch('/:id/toggle', gameController.toggleAvailability);
router.patch('/:id/restore', gameController.restoreGame);
router.delete('/:id', gameController.deleteGame);

module.exports = router;
