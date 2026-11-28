const express = require('express');
const router = express.Router();
const pricingPlanController = require('../controllers/pricingPlanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// Xem bảng giá (công khai cho toàn bộ hệ thống & máy trạm)
router.get('/', pricingPlanController.getPricingPlans);
router.get('/:id', pricingPlanController.getPricingPlanById);

// Thao tác chỉnh sửa bảng giá yêu cầu quyền Quản trị viên (ADMIN)
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), pricingPlanController.createPricingPlan);
router.put('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), pricingPlanController.updatePricingPlan);
router.patch('/:id/toggle', authenticateToken, authorizeRoles(UserRole.ADMIN), pricingPlanController.togglePricingPlanStatus);
router.patch('/:id/restore', authenticateToken, authorizeRoles(UserRole.ADMIN), pricingPlanController.restorePricingPlan);
router.delete('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), pricingPlanController.deletePricingPlan);

module.exports = router;
