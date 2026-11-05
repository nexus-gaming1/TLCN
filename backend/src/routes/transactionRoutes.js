const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

const webhookController = require('../controllers/webhookController');
const { verifySePayWebhook } = require('../middleware/webhookAuthMiddleware');

// Internal Transaction Routes (Bảo vệ bằng JWT & Role-Based Access Control)
router.get('/', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), transactionController.getTransactions);
router.post('/topup', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), transactionController.createTopUp);
router.post('/withdraw', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), transactionController.createWithdraw);
router.post('/:id/refund', authenticateToken, authorizeRoles(UserRole.ADMIN), transactionController.refundTransaction);

// Alias tương thích ngược cho Webhook SePay (Khuyến nghị dùng route chính /api/webhooks/sepay)
router.post('/webhook/sepay', verifySePayWebhook, webhookController.handleSePay.bind(webhookController));

module.exports = router;
