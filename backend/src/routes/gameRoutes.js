// src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const categoryController = require('../controllers/categoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// Thống kê KPIs
router.get('/metrics', gameController.getMetrics);

// Danh mục trò chơi (Ủy quyền cho CategoryController chuyên trách)
router.get('/categories', categoryController.getCategories);
router.post('/categories', authenticateToken, authorizeRoles(UserRole.ADMIN), categoryController.createCategory);

// CRUD Trò chơi
router.get('/', gameController.getGames);
router.get('/:id', gameController.getGameById);
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), gameController.createGame);
router.put('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), gameController.updateGame);
router.patch('/:id/toggle', authenticateToken, authorizeRoles(UserRole.ADMIN), gameController.toggleAvailability);
router.patch('/:id/restore', authenticateToken, authorizeRoles(UserRole.ADMIN), gameController.restoreGame);
router.delete('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), gameController.deleteGame);

module.exports = router;
