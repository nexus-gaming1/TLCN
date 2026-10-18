const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

//Định tuyến tab báo cáo doanh thu (chỉ admin)
//Prefix: /api/reports

router.get(
  '/revenue',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  reportController.getRevenueReport.bind(reportController)
);

module.exports = router;