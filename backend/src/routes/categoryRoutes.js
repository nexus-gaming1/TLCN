// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Routes chuyên trách quản lý thể loại game (Tuân thủ SRP)
router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);

module.exports = router;
