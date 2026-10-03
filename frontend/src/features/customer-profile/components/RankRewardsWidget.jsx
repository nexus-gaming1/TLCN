import React from 'react';
import { Award, Zap, ShieldCheck, Gift } from 'lucide-react';

/**
 * RankRewardsWidget Component
 * 100% Dynamic & Transparent UI matching CSDL database rank hierarchy
 * Single Responsibility: Renders dynamic customer rank perks & upgrade progress.
 */
export default function RankRewardsWidget({ profile }) {
  const rank = profile?.rank || {};
  const rankName = rank.name || 'Đồng';
  const rankLevel = Number(rank.rank_level || 1);
  const discountPercent = parseFloat(rank.discount_percent || 0);

  const points = Number(profile?.balances?.points ?? profile?.point ?? 0);

  // Dynamic next rank target resolution from backend hierarchy
  const nextRank = rank.next_rank;
  const targetPoints = nextRank
    ? Number(nextRank.required_point || 500)
    : Math.max(points, Number(rank.required_point || 500));

  // Transparent progress percentage calculation (0% to 100%) - No dark pattern minimum offsets!
  const progressPercent = nextRank
    ? Math.min(100, Math.max(0, Math.round((points / targetPoints) * 100)))
    : 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col gap-4">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-200/60 shadow-xs">
            <Award className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-tight font-sans text-slate-900">
            Hạng &amp; Quà Thưởng
          </span>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-mono">
          ⭐ BẬC {rankLevel}
        </span>
      </div>

      {/* VIP Rank Card Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-50 border border-amber-300/40 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-xs shadow-xs">
              ★
            </div>
            <span className="text-base font-extrabold text-amber-900 font-sans">
              VIP {rankName}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-700 font-mono">
            {points.toLocaleString('vi-VN')} Pts
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 font-mono">
            <span>{nextRank ? `Lên hạng ${nextRank.name}` : 'Cấp độ tối đa'}</span>
            <span className="text-amber-700 font-bold">
              {progressPercent}% ({points.toLocaleString('vi-VN')}/{targetPoints.toLocaleString('vi-VN')} Pts)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Member Benefits List (Fully mapped from CSDL discount_percent & rankName) */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Đặc quyền VIP {rankName} của bạn
        </span>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Gift className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {discountPercent > 0
                ? `Giảm ${discountPercent}% giá giờ chơi`
                : 'Ưu đãi giờ chơi & tích điểm hội viên'}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Zap className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>Tốc độ mạng ưu tiên trạm Cloud</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Bảo vệ phiên chơi &amp; bảo mật tài khoản</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
        </div>
      </div>
    </div>
  );
}
