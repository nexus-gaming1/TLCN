const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifySePayWebhook } = require('../middleware/webhookAuthMiddleware');

/**
 * Định tuyến Webhooks từ bên thứ 3 (SePay, MoMo, VNPay...)
 * Prefix: /api/webhooks
 * Bảo mật: Xác thực chuyên biệt bằng API Key / Bearer Secret Token (Khác biệt hoàn toàn với JWT)
 */

// Route nhận webhook SePay: POST /api/webhooks/sepay
router.post('/sepay', verifySePayWebhook, webhookController.handleSePay.bind(webhookController));

module.exports = router;
