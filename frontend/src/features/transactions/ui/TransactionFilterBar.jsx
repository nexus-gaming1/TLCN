import {
  Search,
  Download,
  PlusCircle,
  Calendar,
  Tag,
  CreditCard,
  Activity,
  ChevronDown
} from 'lucide-react';

const FILTER_DROPDOWNS = [
  {
    key: 'dateRange',
    label: 'Thời gian:',
    icon: Calendar,
    iconColor: 'text-sky-600',
    options: [
      { value: 'today', label: 'Hôm nay' },
      { value: '7days', label: '7 ngày qua' },
      { value: '30days', label: 'Tháng này' },
      { value: 'all', label: 'Tất cả' }
    ]
  },
  {
    key: 'category',
    label: 'Khoản mục:',
    icon: Tag,
    iconColor: 'text-indigo-600',
    options: [
      { value: 'all', label: 'Tất cả' },
      { value: 'MEMBER_TOPUP', label: 'Nạp Giờ Chơi' },
      { value: 'MEMBER_WITHDRAW', label: 'Rút Tiền Quầy' },
      { value: 'SERVICE_SALE', label: 'Dịch Vụ F&B' },
      { value: 'COMBO_PURCHASE', label: 'Mua Combo' },
      { value: 'REFUND', label: 'Hoàn Tiền' }
    ]
  },
  {
    key: 'paymentMethod',
    label: 'Thanh toán:',
    icon: CreditCard,
    iconColor: 'text-emerald-600',
    options: [
      { value: 'all', label: 'Tất cả' },
      { value: 'CASH', label: 'Tiền mặt' },
      { value: 'VIETQR', label: 'VietQR Pro' },
      { value: 'WALLET', label: 'Ví Hội Viên' }
    ]
  },
  {
    key: 'status',
    label: 'Trạng thái:',
    icon: Activity,
    iconColor: 'text-amber-600',
    options: [
      { value: 'all', label: 'Tất cả' },
      { value: 'COMPLETED', label: 'Thành công' },
      { value: 'PENDING', label: 'Đang xử lý' },
      { value: 'FAILED', label: 'Thất bại' },
      { value: 'REFUNDED', label: 'Hoàn tiền' }
    ]
  }
];

export default function TransactionFilterBar({
  filters,
  onFilterChange,
  onExport,
  onOpenCreateModal
}) {
  return (
    <div className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90">
      {/* HÀNG 1: Ô TÌM KIẾM & 2 NÚT HÀNH ĐỘNG */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative w-full lg:flex-1 lg:min-w-[240px] max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Tìm kiếm mã TXN, tên khách, SĐT... (⌘K)"
            className="w-full h-10 pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none select-none">
            ⌘K
          </kbd>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onExport}
            className="h-10 flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-bold rounded-lg text-xs transition-all border border-slate-200/80 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Xuất Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="h-10 flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Nạp Tiền Tại Quầy</span>
          </button>
        </div>
      </div>

      {/* HÀNG 2: 4 DROPDOWN LỌC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
        {FILTER_DROPDOWNS.map((dd) => {
          const IconComponent = dd.icon;
          return (
            <div
              key={dd.key}
              className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all"
            >
              <IconComponent className={`w-3.5 h-3.5 ${dd.iconColor} ml-3 shrink-0 pointer-events-none`} />
              <span className="pl-1.5 text-xs text-slate-900 font-bold select-none pointer-events-none shrink-0">
                {dd.label}
              </span>
              <select
                value={filters[dd.key] || 'all'}
                onChange={(e) => onFilterChange(dd.key, e.target.value)}
                className="w-full py-2 pl-1 pr-8 bg-transparent border-none outline-none appearance-none shadow-none focus:ring-0 focus:outline-none text-xs font-bold text-slate-900 cursor-pointer"
              >
                {dd.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none stroke-[2]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
