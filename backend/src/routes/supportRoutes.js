// src/routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

router.use(authenticateToken);

// -------------------------------------------------------------
// 1. Nhóm route cho khách
router.post(
  '/',
  authorizeRoles(UserRole.MEMBER),
  supportController.createRequest
);

router.get(
  '/my-requests',
  authorizeRoles(UserRole.MEMBER),
  supportController.getMyRequests
);

// -------------------------------------------------------------
// 2. Nhóm route quản trị
router.get(
  '/',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  supportController.getStaffRequests
);

router.get(
  '/stats',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  supportController.getStats
);

router.patch(
  '/:id/process',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  supportController.processRequest
);

module.exports = router;