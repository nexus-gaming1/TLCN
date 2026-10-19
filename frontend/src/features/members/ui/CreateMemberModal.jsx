import { useState } from 'react';
import { UserPlus, X, User, Phone, Lock, Award, DollarSign, ShieldCheck, Check } from 'lucide-react';

export default function CreateMemberModal({ isOpen = false, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '123456',
    phone: '',
    tier: 'normal',
    deposit: 50000
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim()) {
      alert('Vui lòng nhập đầy đủ Tên đăng nhập và Họ tên hội viên!');
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      id="modal-create-member"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide">
                Tạo Tài Khoản Hội Viên Mới
              </h3>
              <p className="text-xs text-sky-200/80 font-medium">
                Đồng bộ tài khoản máy trạm BootROM &amp; Cloud Gaming
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            id="modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" /> Tên đăng nhập *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition"
                placeholder="VD: cyber_gamer01"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Họ và Tên *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition"
                placeholder="VD: Trần Anh Dũng"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Mật khẩu ban đầu *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Số điện thoại
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition"
                placeholder="VD: 0912 345 678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Member Tier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" /> Hạng Thành Viên
              </label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition cursor-pointer"
              >
                <option value="normal">🥉 Đồng (Standard)</option>
                <option value="silver">🥈 Bạc (+5% Bonus nạp)</option>
                <option value="gold">⭐ VIP Vàng (+10% Bonus nạp)</option>
                <option value="diamond">💎 VIP Kim Cương (+15% Bonus &amp; Ghế VIP)</option>
              </select>
            </div>

            {/* Initial Deposit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Nạp ban đầu (VNĐ)
              </label>
              <input
                type="number"
                name="deposit"
                min="0"
                step="10000"
                value={formData.deposit}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-extrabold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition"
                placeholder="50000"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
              id="modal-cancel"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold rounded-lg text-xs shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer"
              id="modal-submit"
            >
              <Check className="w-4 h-4" />
              Kích Hoạt Tài Khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

