import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Shield, Receipt, Award, Gamepad2, Radio, Clock, UtensilsCrossed } from 'lucide-react';

/**
 * CustomerSidebar Widget
 * Located at: widgets/layouts/customer/CustomerSidebar.jsx
 * Light-themed navigation sidebar with subtle blue-grey background.
 */
export default function CustomerSidebar({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'profile', label: 'Hồ sơ cá nhân', icon: User, path: '/customer/profile' },
    { id: 'orders', label: 'Gọi món F&B', icon: UtensilsCrossed, path: '/customer/orders' },
    { id: 'combos', label: 'Gói Combo Time', icon: Clock, path: '/customer/combos' },
    { id: 'security', label: 'Bảo mật', icon: Shield, path: '/customer/security' },
    { id: 'transactions', label: 'Lịch sử giao dịch', icon: Receipt, path: '/customer/transactions' },
    { id: 'rewards', label: 'Điểm thưởng', icon: Award, path: '/customer/rewards' }
  ];

  const handleNavClick = (item) => {
    if (onTabChange) onTabChange(item.id);
    if (item.path && location.pathname !== item.path) {
      navigate(item.path);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[17.5rem] bg-[#F8FAFC] border-r border-slate-200/80 z-50 flex flex-col justify-between py-6 px-4 text-slate-800 shadow-xs">
      <div className="flex flex-col gap-6">
        {/* Brand Logo */}
        <div
          onClick={() => navigate('/customer')}
          className="flex items-center gap-3 px-2 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-slate-900 uppercase tracking-wider font-sans">NEXUS</span>
            <span className="text-[11px] font-mono font-bold text-cyan-600 uppercase tracking-widest">
              Cloud Gaming
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab ? activeTab === item.id : location.pathname === item.path;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-left font-semibold text-sm cursor-pointer ${isActive
                    ? 'bg-cyan-500/10 text-cyan-700 font-bold border-l-4 border-cyan-500 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>


    </aside>
  );
}

