// src/routes/announcementRoutes.js
const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// 1. Route công khai: Khách hàng đều có thể xem banner đang active
router.get('/active', announcementController.getActiveAnnouncements);

// 2. Nhóm Route Quản trị: Yêu cầu đăng nhập và có quyền EMPLOYEE hoặc ADMIN
router.use(authenticateToken);

router.get(
  '/',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  announcementController.getAllAnnouncements
);

router.post(
  '/',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  announcementController.createAnnouncement
);

router.put(
  '/:id',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  announcementController.updateAnnouncement
);

router.patch(
  '/:id/toggle',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  announcementController.toggleActive
);

router.delete(
  '/:id',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  announcementController.deleteAnnouncement
);

module.exports = router;