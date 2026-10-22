import { X, User, Phone, Mail, Award, Wallet, Star, Monitor, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { USER_STATUS_LABELS } from '../../../shared/constants/userConstants';

/**
 * MemberDetailModal
 * Component hiển thị chi tiết hồ sơ hội viên
 */
export default function MemberDetailModal({ isOpen, onClose, member }) {
  if (!isOpen || !member) return null;

  const statusUpper = (member.status || '').toUpperCase();
  const statusConfig = USER_STATUS_LABELS[statusUpper] || { label: member.status || 'Chưa rõ', colorText: 'text-slate-500' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md">
              {member.name ? member.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'MB'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">{member.name}</h3>
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {member.uid}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium font-mono">@{member.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Status & Rank Quick Header Bar */}
        <div className="my-4 grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Hạng hội viên</span>
              <span className="text-xs font-extrabold text-slate-900">{member.rankName || 'Đồng'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Trạng thái tài khoản</span>
              <span className={`text-xs font-extrabold ${statusConfig.colorText}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Content Details Grid */}
        <div className="space-y-4 text-xs">
          {/* Section 1: Thông tin hồ sơ cơ bản */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-700">
              <User className="w-3.5 h-3.5" /> Thông tin hồ sơ cá nhân
            </h4>
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-white border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Họ và Tên:</span>
                <span className="font-bold text-slate-900 text-xs">{member.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Tên đăng nhập:</span>
                <span className="font-mono font-bold text-slate-800 text-xs">@{member.username}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Số điện thoại:</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {member.phone || 'Chưa cập nhật'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Email liên hệ:</span>
                <span className="font-medium text-slate-800 flex items-center gap-1 truncate" title={member.email}>
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {member.email || 'Chưa cập nhật'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Tài chính & Điểm thưởng */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-700">
              <Wallet className="w-3.5 h-3.5" /> Số dư tài khoản &amp; Điểm thưởng
            </h4>
            <div className="grid grid-cols-3 gap-2.5 p-3 bg-emerald-50/40 border border-emerald-200/80 rounded-xl">
              <div>
                <span className="text-emerald-800 font-semibold block text-[10px]">Số dư chính:</span>
                <span className="font-mono font-black text-emerald-950 text-sm">
                  {(member.realBalance || member.balance || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-emerald-800 font-semibold block text-[10px]">Số dư khuyến mãi:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {(member.bonusBalance || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-amber-800 font-semibold block text-[10px]">Điểm tích lũy:</span>
                <span className="font-mono font-extrabold text-amber-900 text-sm flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {(member.pts || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Phiên chơi & Đăng nhập */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-sky-700">
              <Monitor className="w-3.5 h-3.5" /> Trạm máy &amp; Đăng nhập
            </h4>
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-sky-50/40 border border-sky-200/80 rounded-xl">
              <div>
                <span className="text-sky-800 font-semibold block text-[10px]">Trạm máy hiện tại:</span>
                <span className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${member.stationCode ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {member.station || 'Chưa vào máy'}
                </span>
              </div>
              <div>
                <span className="text-sky-800 font-semibold block text-[10px]">Đăng nhập lần cuối:</span>
                <span className="font-mono font-medium text-slate-800 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> {member.lastLoginTime || 'Chưa đăng nhập'}
                </span>
              </div>
            </div>
          </div>

          {/* Business Rule Banner */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Thông tin Số dư, Điểm thưởng và Hạng hội viên được tính toán tự động dựa trên giao dịch nạp tiền và lịch sử sử dụng dịch vụ.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
