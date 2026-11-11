const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { UserRole } = require('../constants/enums');

// Toàn bộ API Order bắt buộc phải có Token đăng nhập
router.use(authenticateToken);

// ----------------------------------------------------------------------------
// 1. Nhóm Route Đặt món và Xem thực đơn - Quyền: Khách hàng và Nhân viên, Admin

router.get(
  '/menu',
  authorizeRoles(UserRole.MEMBER, UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.getAvailableMenu.bind(orderController)
);

router.post(
  '/',
  authorizeRoles(UserRole.MEMBER,UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.createOrder.bind(orderController)
);

router.get(
  '/my-orders',
  authorizeRoles(UserRole.MEMBER),
  orderController.getMyOrders.bind(orderController)
);

router.get(
  '/session-status',
  authorizeRoles(UserRole.MEMBER, UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.checkSessionStatus.bind(orderController)
);

router.get(
  '/session-check',
  authorizeRoles(UserRole.MEMBER, UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.checkSessionStatus.bind(orderController)
);

router.post(
  '/:id/cancel',
  authorizeRoles(UserRole.MEMBER),
  orderController.customerCancelOrder.bind(orderController)
);


// ----------------------------------------------------------------------------
// 2. Route của nhân viên - Quyền: nhân viên và admin
router.get(
  '/staff/pending',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.getStaffPendingOrders.bind(orderController)
);

router.patch(
  '/staff/:id/status',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.updateOrderStatus.bind(orderController)
);

router.post(
  '/staff/:id/confirm-cash',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.confirmCashPayment.bind(orderController)
);

router.post(
  '/staff/:id/cancel',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.staffCancelOrder.bind(orderController)
);

// Hoàn tiền sự cố cho đơn đã hoàn tất (COMPLETED)
router.post(
  '/staff/:id/refund',
  authorizeRoles(UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.refundCompletedOrder.bind(orderController)
);

// ----------------------------------------------------------------------------
// 3. Route của admin (Web Admin Console) - Quyền: Admin

router.get(
  '/admin/history',
  authorizeRoles(UserRole.ADMIN),
  orderController.getOrderHistory.bind(orderController)
);

// ----------------------------------------------------------------------------
// 4. Route chi tiết đơn hàng
router.get(
  '/:id',
  authorizeRoles(UserRole.MEMBER, UserRole.EMPLOYEE, UserRole.ADMIN),
  orderController.getOrderById.bind(orderController)
);

module.exports = router;