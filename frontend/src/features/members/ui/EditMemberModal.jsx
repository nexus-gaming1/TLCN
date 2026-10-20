import { useState, useEffect } from 'react';
import { X, User, Phone, Lock, ShieldAlert } from 'lucide-react';

export default function EditMemberModal({ isOpen, onClose, member, onSubmit }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (member) {
      setFullName(member.name || '');
      setPhone(member.phone && member.phone !== 'Chưa cập nhật' ? member.phone : '');
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Vui lòng nhập Họ và tên hội viên');
      return;
    }

    if (onSubmit) {
      onSubmit(member.id, {
        full_name: fullName.trim(),
        phone_number: phone.trim() || null
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Sửa Hồ Sơ Hội Viên
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ sửa hồ sơ"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
            id="close-edit-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Business Rule Notice Alert */}
        <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-normal">
            <p className="font-bold text-amber-950">Quy định chỉnh sửa hồ sơ:</p>
            <p>Admin chỉ chỉnh sửa thông tin liên hệ (Họ tên, SĐT). Tên đăng nhập được cố định theo tài khoản và không thể chỉnh sửa.</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-4 space-y-3.5">
          {/* Readonly & Blurred Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Tên Đăng Nhập
              </span>
              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                Không thể sửa
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                readOnly
                value={member.username ? `@${member.username}` : ''}
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-500 cursor-not-allowed opacity-75 select-none focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> Họ và Tên *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên hội viên"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" /> Số Điện Thoại
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0908123456"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 outline-none"
            />
          </div>

          {/* Readonly Readout Summary */}
          <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-slate-400 block font-semibold">Hạng Thành Viên:</span>
              <span className="font-bold text-indigo-700">{member.rankName || 'Đồng'}</span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-slate-400 block font-semibold">Số Dư Hiện Tại:</span>
              <span className="font-bold text-slate-900">{(member.realBalance || member.balance || 0).toLocaleString()} đ</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
