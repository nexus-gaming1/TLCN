const express = require('express');
const router = express.Router();
const computerController = require('../controllers/computerController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// Staff / Admin fleet operations
router.post(
    '/commands/broadcast',
    authenticateToken,
    authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE),
    computerController.broadcastCommand
);

router.get('/grid', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getRoomLayoutGrid);
router.get('/zones', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getZones);
router.get('/bootrom-logs', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getBootromLogs);
router.post('/wake-on-lan', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.wakeOnLan);
router.get('/overview', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getComputerOverview);
router.get('/machinestore', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getMachines);

// Client machine agent endpoints
router.post(
    '/by-address/logout',
    computerController.logoutByAddress
);

router.post(
    '/by-address/command',
    computerController.sendCommandByAddress
);

// Hardware Profile & Specs Management (Protected)
router.get('/specs', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getHardwareSpecs);
router.post('/specs', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.createHardwareSpec);
router.put('/specs/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.updateHardwareSpec);
router.patch('/specs/:id/toggle', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.toggleHardwareSpec);
router.delete('/specs/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.deleteHardwareSpec);

// Computer Management CRUD (Protected with RBAC)
router.get('/', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getComputers);
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.createComputer);

router.patch('/:id/status', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.changeStatus);
router.post('/:id/switch', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.switchStation);
router.get('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), computerController.getComputerById);
router.put('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.updateComputer);
router.delete('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), computerController.deleteComputer);

// Client machine login/session endpoints
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
