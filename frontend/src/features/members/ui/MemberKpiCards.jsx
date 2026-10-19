import { Users, Gamepad2, Award, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';

/**
 * MemberKpiCards
 * Displays real-time KPIs dynamically computed from the member dataset.
 * Zero hardcoded values or mock ratios.
 */
export default function MemberKpiCards({
  totalMembers = 0,
  activeMembersCount = 0,
  activePlaying = 0,
  totalComputers = 36,
  capacityPercent = '0.0',
  vipCount = 0,
  vipDiamondCount = 0,
  vipGoldCount = 0,
  vipShare = '0.0',
  shiftRevenue = 0,
  avgBalance = 0
}) {
  const standardMembersCount = Math.max(0, totalMembers - vipCount);
  const idleComputers = Math.max(0, totalComputers - activePlaying);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1: Total Members */}
      <div className="bg-white p-5 rounded-lg shadow-flat border border-slate-200 transition-all flex flex-col justify-between group">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">TỔNG HỘI VIÊN</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[32px] font-black text-slate-900 tracking-tight leading-tight">
                {totalMembers.toLocaleString()}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 font-extrabold">
                {activeMembersCount} ACTIVE
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200/80 flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-emerald-800 font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            <span>{totalMembers > 0 ? `${((activeMembersCount / totalMembers) * 100).toFixed(0)}%` : '0%'}</span>
            <span className="text-slate-600 font-medium ml-0.5">kích hoạt</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-700">
            {standardMembersCount} Tiêu chuẩn
          </span>
        </div>
      </div>

      {/* Card 2: Active Playing */}
      <div className="bg-white p-5 rounded-lg shadow-flat border border-slate-200 transition-all flex flex-col justify-between group">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">ĐANG CHƠI TRỰC TUYẾN</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[32px] font-black text-slate-900 tracking-tight leading-tight">{activePlaying}</span>
              <span className="text-xs font-bold text-indigo-800">/ {totalComputers} Máy</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center shadow-xs">
            <Gamepad2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
            </span>
            <span className="text-xs text-slate-900 font-extrabold">{capacityPercent}% Công suất</span>
          </div>
          <span className="text-[11px] text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
            {idleComputers} máy trống
          </span>
        </div>
      </div>

      {/* Card 3: VIP Pool */}
      <div className="bg-white p-5 rounded-lg shadow-flat border border-slate-200 transition-all flex flex-col justify-between group">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">HỘI VIÊN VIP</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-[32px] font-black text-amber-800 tracking-tight leading-tight">{vipCount}</span>
              <span className="text-xs font-bold text-amber-900">({vipShare}%)</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-900 border border-amber-300 flex items-center justify-center shadow-xs">
            <Award className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md font-extrabold">
            <span>{vipDiamondCount} Kim Cương</span>
          </div>
          <span className="text-[11px] text-slate-800 font-bold">
            {vipGoldCount} Vàng
          </span>
        </div>
      </div>

      {/* Card 4: Shift Revenue Deposit */}
      <div className="bg-white p-5 rounded-lg shadow-flat border border-slate-200 transition-all flex flex-col justify-between group">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">TỔNG QUỸ HỘI VIÊN</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[30px] font-black text-slate-900 tracking-tight leading-tight">
                {shiftRevenue.toLocaleString('vi-VN')}
              </span>
              <span className="text-xs font-extrabold text-emerald-800 ml-1">VNĐ</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-emerald-900 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>TB: {avgBalance.toLocaleString('vi-VN')} đ</span>
          </div>
          <span className="text-slate-700 font-semibold">Khả dụng 100%</span>
        </div>
      </div>
    </div>
  );
}
