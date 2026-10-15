import React from 'react';
import { Banknote, Gamepad2, Utensils, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * TransactionKpiCards
 * Hiển thị 4 thẻ KPI tài chính kiểm toán thu chi dựa 100% trên dữ liệu thật từ CSDL MySQL
 */
export default function TransactionKpiCards({ metrics }) {
  const totalRevenue = metrics?.totalRevenueToday || 0;
  const vsYesterdayPercent = metrics?.vsYesterdayPercent !== undefined ? metrics.vsYesterdayPercent : 0;
  const pcTimeRevenue = metrics?.pcTimeRevenue || 0;
  const pcTimePercent = metrics?.pcTimePercent !== undefined ? metrics.pcTimePercent : 0;
  const foodServiceRevenue = metrics?.foodServiceRevenue || 0;
  const foodServicePercent = metrics?.foodServicePercent !== undefined ? metrics.foodServicePercent : 0;
  const successRate = metrics?.successRate !== undefined ? metrics.successRate : 100.0;
  const successCount = metrics?.successCount || 0;
  const pendingCount = metrics?.pendingCount || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tổng Doanh Thu Hôm Nay */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tổng Doanh Thu Hôm Nay
            </span>
            <span className="flex items-baseline gap-1 text-2xl font-black text-slate-900 mt-1 font-mono">
              {totalRevenue.toLocaleString()} <span className="text-base font-bold text-slate-400">₫</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-extrabold">
            {vsYesterdayPercent >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">+{vsYesterdayPercent}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="text-rose-600">{vsYesterdayPercent}%</span>
              </>
            )}
            <span className="text-slate-400 font-normal">so với hôm qua</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            Audit Stream
          </span>
        </div>
      </div>

      {/* KPI 2: Nạp Giờ PC Time */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Doanh Thu Nạp Giờ (PC Time)
            </span>
            <span className="flex items-baseline gap-1 text-2xl font-black text-slate-900 mt-1 font-mono">
              {pcTimeRevenue.toLocaleString()} <span className="text-base font-bold text-slate-400">₫</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Gamepad2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-700">
            {pcTimePercent}% tổng thu thực tế
          </span>
          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pcTimePercent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* KPI 3: Dịch Vụ F&B */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dịch Vụ Ẩm Thực (F&amp;B)
            </span>
            <span className="flex items-baseline gap-1 text-2xl font-black text-slate-900 mt-1 font-mono">
              {foodServiceRevenue.toLocaleString()} <span className="text-base font-bold text-slate-400">₫</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-amber-800">
            {foodServicePercent}% tổng thu thực tế
          </span>
          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(foodServicePercent, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* KPI 4: Tỷ Lệ Thành Công */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tỷ Lệ Thành Công
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {successRate}%
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            <strong className="text-slate-800">{successCount}</strong> thành công /{' '}
            <strong className="text-amber-700">{pendingCount}</strong> chờ soát
          </span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[10px] font-bold text-emerald-700">SYNC OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
