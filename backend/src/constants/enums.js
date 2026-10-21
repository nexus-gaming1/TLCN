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
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
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
  PaymentMethodEnum,
  TransactionStatusEnum,
};
