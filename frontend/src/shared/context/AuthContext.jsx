import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../api/auth.service';
import useIdleTimer from '../hooks/useIdleTimer';
import ReAuthModal from '../ui/ReAuthModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [isReAuthModalOpen, setIsReAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // 1. Tự động kiểm tra HttpOnly Cookie khi tải ứng dụng (Duy trì đăng nhập 1–2 ngày)
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.refreshToken();
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        // Chưa đăng nhập hoặc phiên 2 ngày đã hết hạn
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 2. Theo dõi 30 phút không hoạt động (Inactivity Timeout Tracker)
  const { isIdle, resetTimer } = useIdleTimer({
    timeoutMs: 30 * 60 * 1000, // 30 phút
    onIdle: () => {
      if (currentUser) {
        setIsSessionLocked(true);
      }
    }
  });

  // Tự động kích hoạt cờ sessionLocked khi phát hiện nhàn rỗi
  useEffect(() => {
    if (isIdle && currentUser) {
      setIsSessionLocked(true);
    }
  }, [isIdle, currentUser]);

  const login = async (identity, password) => {
    const data = await authService.login(identity, password);
    setCurrentUser(data.user);
    setIsSessionLocked(false);
    resetTimer();
    return data.user;
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setIsSessionLocked(false);
  };

  /**
   * Xác thực lại mật khẩu (Step-up Auth)
   */
  const verifyPassword = async (password) => {
    await authService.verifyStepUp(password);
    setIsSessionLocked(false);
    resetTimer();
    return true;
  };

  /**
   * Bọc các thao tác nhạy cảm: Nếu quá 30 phút -> Bật popup yêu cầu xác nhận mật khẩu
   * @param {Function} actionCallback Hàm thao tác nhạy cảm (vd: chuyển khoản, reset mật khẩu, xóa)
   */
  const requireStepUpAuth = useCallback((actionCallback) => {
    if (!isSessionLocked) {
      return actionCallback();
    }
    setPendingAction(() => actionCallback);
    setIsReAuthModalOpen(true);
  }, [isSessionLocked]);

  const handleConfirmReAuth = async (password) => {
    await verifyPassword(password);
    setIsReAuthModalOpen(false);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  const normalizeRole = (role) => {
    if (!role) return 'CUSTOMER';
    const r = role.toUpperCase();
    if (r === 'MEMBER') return 'CUSTOMER';
    if (r === 'EMPLOYEE') return 'STAFF';
    return r;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: normalizeRole(currentUser?.role),
        loading,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isSessionLocked,
        verifyPassword,
        requireStepUpAuth,
      }}
    >
      {children}
      {/* Hộp thoại xác thực danh tính tích hợp sẵn toàn ứng dụng */}
      <ReAuthModal
        isOpen={isReAuthModalOpen}
        user={currentUser}
        onConfirm={handleConfirmReAuth}
        onClose={() => {
          setIsReAuthModalOpen(false);
          setPendingAction(null);
        }}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
