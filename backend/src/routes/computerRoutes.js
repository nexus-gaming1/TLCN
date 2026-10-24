const express = require('express');
const router = express.Router();
const computerController = require('../controllers/computerController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

router.post(
    '/commands/broadcast',
    computerController.broadcastCommand
);

router.get('/grid', computerController.getRoomLayoutGrid);
router.get('/zones', computerController.getZones);
router.get('/bootrom-logs', computerController.getBootromLogs);
router.post('/wake-on-lan', computerController.wakeOnLan);
router.get('/machinestore',
    computerController.getMachines);
router.patch('/:id/status', computerController.changeStatus);
router.post('/:id/switch', computerController.switchStation);

// Hardware Profile & Specs Management (Protected)
router.get('/specs', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getHardwareSpecs);
router.post('/specs', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.createHardwareSpec);
router.put('/specs/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.updateHardwareSpec);
router.delete('/specs/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.deleteHardwareSpec);
router.get('/', computerController.getComputers);
router.get('/:id', computerController.getComputerById);
router.post('/', computerController.createComputer);
router.put('/:id', computerController.updateComputer);
router.delete('/:id', computerController.deleteComputer);



router.post(
    "/:machineId/login",
    computerController.login
);

router.post(
    "/:machineId/logout",
    computerController.logout
);

router.post(
    "/:machineId/command",
    computerController.sendCommand
);

router.post(
    "/:machineId/notification",
    computerController.sendNotification
);



module.exports = router;

