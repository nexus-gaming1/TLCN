const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// Quản lý hội viên: Bắt buộc đăng nhập & yêu cầu vai trò ADMIN hoặc EMPLOYEE
router.get('/', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), memberController.getMembers);
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), memberController.createMember);
router.get('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), memberController.getMemberById);
router.put('/:id/info', authenticateToken, authorizeRoles(UserRole.ADMIN, UserRole.EMPLOYEE), memberController.updateMemberInfo);
router.put('/:id/status', authenticateToken, authorizeRoles(UserRole.ADMIN), memberController.updateAccountStatus);

module.exports = router;
