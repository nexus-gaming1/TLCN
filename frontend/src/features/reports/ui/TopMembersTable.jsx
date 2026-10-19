import React from 'react';
import { Crown, Trophy, UserCheck, AlertCircle } from 'lucide-react';


// Component hiển thị huy hiệu thứ hạng
function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-xs shadow-xs border border-amber-400 shrink-0">
        <Crown className="w-4 h-4 fill-amber-950" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shadow-xs border border-slate-300 shrink-0">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center font-black text-xs shadow-xs border border-orange-200 shrink-0">
        3
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0">
      {rank}
    </div>
  );
}

export default function TopMembersTable({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col items-center justify-center min-h-[220px] text-center">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Chưa có dữ liệu hội viên</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Không phát sinh giao dịch nạp trong kỳ thống kê này</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-tight">Top Hội Viên Nạp Tiền</h3>
            <p className="text-[11px] text-slate-400 font-medium">Khách hàng chi tiêu hàng đầu (VIP Spenders)</p>
          </div>
        </div>
        <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Top 5 Spenders
        </span>
      </div>

      {/* danh sách member */}
      <div className="space-y-2.5">
        {data.map((m, index) => {
          const rank = index + 1;
          const total = Number(m.totalTopup || 0);

          return (
            <div
              key={m.memberId || index}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 transition-colors border border-slate-200/60"
            >
              <div className="flex items-center gap-3 min-w-0">
                <RankBadge rank={rank} />

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 truncate">
                    {m.name || 'Hội viên không tên'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 truncate">
                    @{m.username || `id-${m.memberId}`}
                  </span>
                </div>
              </div>

              {/* Số tiền nạp */}
              <div className="flex flex-col items-end shrink-0 pl-3">
                <span className="font-mono font-black text-xs text-emerald-700">
                  {total.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Tổng nạp</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}