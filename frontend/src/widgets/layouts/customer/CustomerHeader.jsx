import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, ShieldCheck, UserCircle, Shield, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * CustomerHeader Widget
 * Located at: widgets/layouts/customer/CustomerHeader.jsx
 * Dedicated top navbar for Customer Portal with Interactive Avatar Dropdown Menu.
 */
export default function CustomerHeader({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-[17.5rem] right-0 h-16 bg-white/90 backdrop-blur-md z-40 flex items-center justify-between px-8 border-b border-slate-200/80 text-slate-800 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-slate-400 uppercase tracking-wider font-semibold">HỆ THỐNG</span>
        <span className="text-slate-300">/</span>
        <span className="text-cyan-600 font-extrabold uppercase tracking-wider">CỔNG DỊCH VỤ</span>
      </div>

      <div className="flex items-center gap-6">

        {/* User Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer group focus:outline-none"
            title="Tùy chọn tài khoản khách hàng"
          >
            <div className="w-8.5 h-8.5 rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-sm flex items-center justify-center text-white relative group-hover:scale-105 transition-transform">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="User Avatar" className="w-full h-full max-w-full max-h-full rounded-full object-cover block" />
              ) : (
                <User className="w-4.5 h-4.5 text-white" />
              )}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-900 leading-tight group-hover:text-cyan-700 transition-colors">
                {user?.full_name || 'Khách Hàng VIP'}
              </span>
              <span className="font-mono text-[10px] text-cyan-600 font-bold flex items-center gap-1 leading-tight mt-0.5">
                <ShieldCheck className="w-3 h-3 inline text-cyan-500" />
                <span>@{user?.username || 'user'}</span>
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-600' : ''}`} />
          </button>

          {/* Dropdown Menu Popup */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Info Inside Dropdown */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-xs relative">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full max-w-full max-h-full rounded-full object-cover block" />
                  ) : (
                    <User className="w-5 h-5 text-white m-auto" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {user?.full_name || 'Khách Hàng VIP'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    @{user?.username || 'user'}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold w-fit">
                    <span>⭐ Hội viên VIP Gold</span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Options */}
              <div className="px-1.5 py-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/customer/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-cyan-700 rounded-xl transition-colors cursor-pointer"
                >
                  <UserCircle className="w-4 h-4 text-cyan-600" />
                  <span>Hồ Sơ Cá Nhân</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/customer/security');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-cyan-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>Cài Đặt Bảo Mật</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/customer/transactions');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-cyan-700 rounded-xl transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span>Lịch Sử Giao Dịch</span>
                </button>
              </div>

              {/* Logout Action */}
              {onLogout && (
                <div className="border-t border-slate-100 px-1.5 pt-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-extrabold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Đăng Xuất (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


