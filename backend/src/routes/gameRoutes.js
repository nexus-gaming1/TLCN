// src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Thống kê KPIs
router.get('/metrics', gameController.getMetrics);

// Danh mục trò chơi
router.get('/categories', gameController.getCategories);
router.post('/categories', gameController.createCategory);

// CRUD Trò chơi
router.get('/', gameController.getGames);
router.get('/:id', gameController.getGameById);
router.post('/', gameController.createGame);
router.put('/:id', gameController.updateGame);
router.patch('/:id/toggle', gameController.toggleAvailability);
router.patch('/:id/restore', gameController.restoreGame);
router.delete('/:id', gameController.deleteGame);

module.exports = router;
