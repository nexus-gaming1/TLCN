import { Banknote, Gamepad2, Utensils, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * TransactionKpiCards
 * Hiển thị 4 thẻ KPI tài chính kiểm toán thu chi dựa trên dữ liệu thật từ CSDL MySQL
 */
const RANGE_TITLE_MAP = {
  today: 'Tổng Doanh Thu Hôm Nay',
  '7days': 'Tổng Doanh Thu (7 Ngày)',
  '30days': 'Tổng Doanh Thu (Tháng Này)',
  all: 'Tổng Doanh Thu (Tất Cả)'
};

export default function TransactionKpiCards({ metrics, loading = false, dateRange = 'all' }) {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 animate-pulse space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-6 w-32 bg-slate-200 rounded" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-14 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalRevenue = metrics?.totalRevenueToday || 0;
  const vsYesterdayPercent = metrics?.vsYesterdayPercent ?? 0;
  const pcTimeRevenue = metrics?.pcTimeRevenue || 0;
  const pcTimePercent = metrics?.pcTimePercent ?? 0;
  const foodServiceRevenue = metrics?.foodServiceRevenue || 0;
  const foodServicePercent = metrics?.foodServicePercent ?? 0;
  const successRate = metrics?.successRate ?? 100.0;
  const successCount = metrics?.successCount || 0;
  const pendingCount = metrics?.pendingCount || 0;
  const totalTxnCount = metrics?.totalTxnCount || 0;
  const activeRange = metrics?.dateRange || dateRange || 'all';
  const revenueCardTitle = RANGE_TITLE_MAP[activeRange] || RANGE_TITLE_MAP.all;

  const revenueCards = [
    {
      id: 'pcTime',
      label: 'Doanh Thu Nạp Giờ (PC Time)',
      value: `${pcTimeRevenue.toLocaleString('vi-VN')} ₫`,
      icon: Gamepad2,
      iconWrap: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      subLabel: `${pcTimePercent}% tổng thu thực tế`,
      subTextColor: 'text-indigo-700',
      barColor: 'bg-indigo-600',
      barPercent: Math.min(pcTimePercent, 100)
    },
    {
      id: 'foodService',
      label: 'Dịch Vụ Ẩm Thực (F&B)',
      value: `${foodServiceRevenue.toLocaleString('vi-VN')} ₫`,
      icon: Utensils,
      iconWrap: 'bg-amber-50 text-amber-600 border-amber-100',
      subLabel: `${foodServicePercent}% tổng thu thực tế`,
      subTextColor: 'text-amber-800',
      barColor: 'bg-amber-500',
      barPercent: Math.min(foodServicePercent, 100)
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* KPI 1: Tổng Doanh Thu Hôm Nay */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              {revenueCardTitle}
            </span>
            <span className="flex items-baseline gap-1 text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono truncate">
              {totalRevenue.toLocaleString('vi-VN')} <span className="text-base font-bold text-slate-400">₫</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          {activeRange === 'today' ? (
            <div className="flex items-center gap-1 text-xs font-extrabold min-w-0">
              {vsYesterdayPercent >= 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">+{vsYesterdayPercent}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-rose-600">{vsYesterdayPercent}%</span>
                </>
              )}
              <span className="text-slate-400 font-normal truncate">so với hôm qua</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-500 truncate">
              Tổng cộng <strong className="text-slate-800">{totalTxnCount}</strong> giao dịch
            </span>
          )}
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
            Audit Stream
          </span>
        </div>
      </div>

      {/* KPI 2 & 3: Doanh Thu Nạp Giờ & F&B */}
      {revenueCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {card.label}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono truncate">
                  {card.value}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.iconWrap}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className={`text-xs font-bold truncate ${card.subTextColor}`}>
                {card.subLabel}
              </span>
              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${card.barColor}`}
                  style={{ width: `${card.barPercent}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* KPI 4: Tỷ Lệ Thành Công */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              Tỷ Lệ Thành Công
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              {successRate}%
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
          <span className="text-slate-500 font-medium truncate">
            <strong className="text-slate-800">{successCount}</strong> thành công /{' '}
            <strong className="text-amber-700">{pendingCount}</strong> chờ soát
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-emerald-700">SYNC OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
