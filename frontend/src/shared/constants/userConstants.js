/**
 * User & Member Constants
 * Đồng bộ chuẩn 1:1 với Backend (backend/src/constants/enums.js)
 */

export const UserRole = Object.freeze({
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
  MEMBER: 'MEMBER',
});

export const UserStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOCKED: 'LOCKED',
  BANNED: 'BANNED',
});

export const USER_STATUS_LABELS = Object.freeze({
  [UserStatus.ACTIVE]: {
    label: 'Hoạt động',
    badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    dotClass: 'bg-emerald-600 animate-pulse',
    colorText: 'text-emerald-600'
  },
  [UserStatus.INACTIVE]: {
    label: 'Ngưng hoạt động',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    dotClass: 'bg-slate-400',
    colorText: 'text-slate-500'
  },
  [UserStatus.LOCKED]: {
    label: 'Tạm khóa',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
    dotClass: 'bg-amber-600',
    colorText: 'text-amber-600'
  },
  [UserStatus.BANNED]: {
    label: 'Bị cấm',
    badgeClass: 'bg-rose-100 text-rose-950 border-rose-300',
    dotClass: 'bg-rose-600',
    colorText: 'text-rose-600'
  }
});
