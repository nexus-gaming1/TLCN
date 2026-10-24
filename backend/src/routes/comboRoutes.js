const express = require('express');
const router = express.Router();
const comboController = require('../controllers/comboController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Soft auth helper: if token provided, authenticates; otherwise req.user is null
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req, res, next);
  }
  next();
};

// 1. Combo Package Catalog (Public / Member / Admin)
router.get('/', optionalAuth, comboController.getCombos);
router.get('/active-time', authenticateToken, comboController.getActiveCombo);
router.get('/history', authenticateToken, comboController.getComboHistory);
router.get('/:id', optionalAuth, comboController.getComboById);

// 2. Combo Package CRUD & Items Management (Admin / Employee)
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'EMPLOYEE'), comboController.createCombo);
router.put('/:id', authenticateToken, authorizeRoles('ADMIN', 'EMPLOYEE'), comboController.updateCombo);
router.patch('/:id/status', authenticateToken, authorizeRoles('ADMIN', 'EMPLOYEE'), comboController.toggleComboStatus);
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN', 'EMPLOYEE'), comboController.deleteCombo);
router.put('/:id/items', authenticateToken, authorizeRoles('ADMIN', 'EMPLOYEE'), comboController.setComboItems);

// 3. Purchase, Activation & Session Lifecycle (Member / Staff)
router.post('/purchase', authenticateToken, comboController.purchaseCombo);
router.post('/:id/purchase', authenticateToken, comboController.purchaseCombo);
router.post('/activate', authenticateToken, comboController.activateSession);
router.post('/switch-station', authenticateToken, comboController.switchStation);
router.post('/end-session', authenticateToken, comboController.endSessionEarly);
router.post('/check-expired', authenticateToken, authorizeRoles('ADMIN', 'EMPLOYEE'), comboController.checkExpired);

module.exports = router;
