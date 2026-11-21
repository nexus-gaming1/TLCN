// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// Routes chuyên trách quản lý thể loại game (Tuân thủ SRP)
router.get('/', categoryController.getCategories);
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), categoryController.createCategory);

module.exports = router;
