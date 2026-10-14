import React, { useState } from 'react';
import { Wallet, ArrowRight, PlusCircle, History } from 'lucide-react';
import TopUpModal from './TopUpModal';

/**
 * WalletBalanceWidget Component
 * Renders Customer Wallet Balance, Bonus Balance, Rewards Points, and Quick Action Buttons
 */
export default function WalletBalanceWidget({ balances, memberId  }) {
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);  //state quản lý Modal

  const formatVnd = (amount) => {
    const val = amount !== undefined && amount !== null && !isNaN(Number(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const realBalanceStr = formatVnd(balances?.real_balance);
  const bonusBalanceStr = formatVnd(balances?.bonus_balance);
  const points = balances?.points !== undefined && balances?.points !== null && !isNaN(Number(balances.points)) ? Number(balances.points) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-cyan-600 bg-cyan-50 border border-cyan-100 shadow-xs">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-extrabold uppercase tracking-tight font-sans text-slate-900">
            Ví Điện Tử &amp; Số Dư
          </span>
        </div>
        <button
          type="button"
          className="text-xs text-cyan-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Xem giao dịch</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Available Balance Box */}
      <div className="p-4 bg-gradient-to-br from-cyan-50/80 via-slate-50 to-blue-50/40 rounded-xl border border-cyan-200/60 flex flex-col gap-1">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Số Dư Khả Dụng</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl text-slate-900 font-extrabold tracking-tight font-mono">
            {realBalanceStr}
          </span>
        </div>
      </div>

      {/* 2 Small Boxes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SỐ DƯ KHUYẾN MÃI</span>
          <span className="text-sm font-extrabold text-slate-800 font-mono">
            {bonusBalanceStr}
          </span>
        </div>

        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/70 flex flex-col gap-0.5">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">ĐIỂM THƯỞNG</span>
          <span className="text-sm font-extrabold text-amber-600 font-mono">
            {points.toLocaleString('vi-VN')} Pts
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setIsTopUpModalOpen(true)} // thêm sự kiện mở modal cho onClick của nút 
          className="flex-1 h-10 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nạp Giờ Chơi</span>
        </button>

        <button
          type="button"
          className="flex-1 h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Lịch sử</span>
        </button>
      </div>

      {/* TopUp Modal */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        memberId={memberId}
      />
    </div>
  );
}

