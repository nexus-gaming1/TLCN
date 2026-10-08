import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import useToggle from '../../../shared/hooks/useToggle';
import { useAuth } from '../../../shared/context/AuthContext';

export default function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [showPassword, togglePassword] = useToggle(false);
  const [formData, setFormData] = useState({
    identity: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const user = await login(formData.identity, formData.password);
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col items-start w-full space-y-4" data-purpose="credential-form" onSubmit={handleSubmit}>
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Username / Phone Field */}
      <div className="w-full">
        <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="identity_input">
          Tên đăng nhập / Số điện thoại
        </label>
        <div className="relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
          </div>
          <input
            className="block w-full h-10 pl-10 pr-4 sm:text-xs text-slate-900 placeholder-slate-500 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm"
            id="identity_input"
            name="identity"
            placeholder="vd: nexus_pro hoặc 0912xxxxxx"
            required
            type="text"
            value={formData.identity}
            onChange={handleChange}
            disabled={loading}
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="w-full">
        <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="password_input">
          Mật khẩu
        </label>
        <div className="relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              ></path>
            </svg>
          </div>
          <input
            className="block w-full h-10 pl-10 pr-11 sm:text-xs text-slate-900 placeholder-slate-500 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm"
            id="password_input"
            name="password"
            placeholder="••••••••••••"
            required
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />
          <button
            aria-label="Hiện hoặc ẩn mật khẩu"
            className={`absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-700 focus:outline-none ${
              showPassword ? 'text-brand-600' : ''
            }`}
            id="toggle-password-btn"
            type="button"
            onClick={togglePassword}
          >
            <svg className="h-4 w-4" fill="none" id="eye-icon" stroke="currentColor" viewBox="0 0 24 24">
              {showPassword ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              ) : (
                <>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between w-full pt-1">
        <div className="flex items-center space-x-2.5">
          <input
            className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded cursor-pointer"
            id="remember-me"
            name="rememberMe"
            type="checkbox"
            checked={formData.rememberMe}
            onChange={handleChange}
            disabled={loading}
          />
          <label className="block text-xs font-medium text-slate-800 cursor-pointer select-none" htmlFor="remember-me">
            Ghi nhớ đăng nhập trên máy này
          </label>
        </div>
        <div>
          <a className="text-xs font-bold text-brand-600 hover:text-brand-700 transition" href="#">
            Quên mật khẩu?
          </a>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2 w-full">
        <button
          className="w-full relative group overflow-hidden rounded-xl p-[1px] font-semibold text-white transition-shadow shadow-md shadow-brand-500/25 hover:shadow-glow-cyan active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-brand-500 via-sky-500 to-blue-600 group-hover:opacity-95 transition-opacity"></span>
          <div className="relative flex items-center justify-center space-x-3 px-6 py-3 rounded-[11px] bg-gradient-to-r from-brand-600 to-sky-600 group-hover:from-brand-500 group-hover:to-sky-500 transition-colors text-sm font-bold tracking-wide">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ĐANG XÁC THỰC...</span>
              </span>
            ) : (
              <>
                <span className="whitespace-nowrap">ĐĂNG NHẬP NGAY</span>
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                </svg>
              </>
            )}
          </div>
        </button>
      </div>
    </form>
  );
}
