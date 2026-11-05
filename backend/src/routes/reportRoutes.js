const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

//Định tuyến tab báo cáo doanh thu (chỉ admin)
//Prefix: /api/reports

// 1. Route Xuất file Excel báo cáo
router.get(
  '/revenue/export',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  reportController.exportRevenueReport.bind(reportController)
);

// 2. Route Lấy dữ liệu JSON báo cáo
router.get(
  '/revenue',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  reportController.getRevenueReport.bind(reportController)
);

module.exports = router;