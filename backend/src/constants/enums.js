/**
 * NEXUS System Centralized Enums
 * Aligned 100% with backend/src/config/model.js and backend/src/config/sql.sql
 */

const UserRole = Object.freeze({
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
  MEMBER: 'MEMBER',
});

const UserStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOCKED: 'LOCKED',
  BANNED: 'BANNED',
});

const ComputerStatus = Object.freeze({
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  IN_USE: 'IN_USE',
  LOCKED: 'LOCKED',
  MAINTENANCE: 'MAINTENANCE',
  PAUSE: 'PAUSE',
  REMOTE: 'REMOTE',
});

const OrderStatus = Object.freeze({
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const PaymentStatus = Object.freeze({
  PAID: 'PAID',
  UNPAID: 'UNPAID',
});

const TransactionType = Object.freeze({
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
});

const TransactionCategory = Object.freeze({
  SERVICE_SALE: 'SERVICE_SALE',
  MEMBER_TOPUP: 'MEMBER_TOPUP',
  MEMBER_WITHDRAW: 'MEMBER_WITHDRAW',
  REFUND: 'REFUND',
  COMBO_PURCHASE: 'COMBO_PURCHASE',
  OTHER: 'OTHER',
});

const SessionType = Object.freeze({
  LOCAL: 'LOCAL',
  REMOTE: 'REMOTE',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
  SYSTEM: 'SYSTEM',
});

const PaymentMethodEnum = Object.freeze({
  CASH: 'CASH',
  VIETQR: 'VIETQR',
  WALLET: 'WALLET'
});

const TransactionStatusEnum = Object.freeze({
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});


const ComboTimeStatus = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});


const SupportRequestType = Object.freeze({
  MACHINE_SUPPORT: 'MACHINE_SUPPORT',   // Hỗ trợ kỹ thuật, thiết bị
  ORDER_DISPUTE: 'ORDER_DISPUTE',       // Khiếu nại sự cố đơn hàng
  FEEDBACK: 'FEEDBACK',                 // Đánh giá chất lượng, góp ý
});
const SupportRequestStatus = Object.freeze({
  PENDING: 'PENDING',                   // Chờ tiếp nhận
  IN_PROGRESS: 'IN_PROGRESS',           // Đang xử lý
  RESOLVED: 'RESOLVED',                 // Đã xử lý xong
  REJECTED: 'REJECTED',                 // Đã từ chối 
});
const AnnouncementType = Object.freeze({
  INFO: 'INFO',                         // Thông báo chung
  WARNING: 'WARNING',                   // Cảnh báo, bảo trì
  PROMOTION: 'PROMOTION',               // Khuyến mãi 
  EVENT: 'EVENT',                       // Sự kiện, giải đấu
});


const RemotePairingStatus = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMING: 'CONFIRMING',
  PAIRED: 'PAIRED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});


module.exports = {
  UserRole,
  UserStatus,
  ComputerStatus,
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionCategory,
  SessionType,
  ComboTimeStatus,
  RemotePairingStatus,
  PaymentMethodEnum,
  TransactionStatusEnum,
  SupportRequestType,
  SupportRequestStatus,
  AnnouncementType
};
