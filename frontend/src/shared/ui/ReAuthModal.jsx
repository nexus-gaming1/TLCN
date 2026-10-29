import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, Loader2, X } from 'lucide-react';

/**
 * ReAuthModal - Hộp thoại xác thực lại danh tính khi quá 30 phút không hoạt động (Step-up Auth)
 * 
 * @param {boolean} isOpen Trạng thái hiển thị modal
 * @param {Object} user Thông tin tài khoản hiện tại
 * @param {Function} onConfirm Callback khi người dùng nhập mật khẩu (nhận vào password)
 * @param {Function} onClose Callback khi người dùng hủy bỏ
 */
export default function ReAuthModal({ isOpen, user, onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu xác nhận.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(password);
      // Đóng modal sau khi xác thực thành công
      if (onClose) onClose();
    } catch (err) {
      setError(err?.message || 'Mật khẩu xác nhận không chính xác. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Nút đóng */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header với Biểu tượng Cảnh báo Bảo mật */}
        <div className="p-6 pb-4 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Xác Thực Phiên Làm Việc
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-xs">
            Hệ thống phát hiện hơn 30 phút không có thao tác. Vui lòng xác thực lại mật khẩu để tiếp tục thao tác nhạy cảm.
          </p>
        </div>

        {/* Thông tin tài khoản đang thao tác */}
        <div className="mx-6 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 leading-none">
                {user?.full_name || user?.username || 'Người dùng'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                @{user?.username}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
            {user?.role || 'MEMBER'}
          </span>
        </div>

        {/* Form nhập mật khẩu */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu xác nhận
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn..."
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác nhận...</span>
                </>
              ) : (
                <span>Xác nhận danh tính</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
