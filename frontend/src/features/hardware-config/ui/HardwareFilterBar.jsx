import { Search, Download, PlusCircle, SlidersHorizontal } from 'lucide-react';

const DEFAULT_ZONE_OPTIONS = [
  { value: '1', label: 'Zone 1 - Thi Đấu Esports' },
  { value: '2', label: 'Zone 2 - VIP Gaming Pro' },
  { value: '3', label: 'Zone 3 - Standard Combat' },
  { value: '4', label: 'Zone 4 - Stream Studio' },
  { value: '5', label: 'Zone 5 - Cloud Host' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả tình trạng' },
  { value: 'active', label: 'Đang mở (Áp dụng)' },
  { value: 'inactive', label: 'Tạm tắt' },
  { value: 'online', label: 'Đang hoạt động (Online)' },
  { value: 'maintenance', label: 'Bảo trì / Kiểm tra' }
];

/**
 * HardwareFilterBar component for search, filtering, and CTAs
 */
export default function HardwareFilterBar({
  searchQuery = '',
  onSearchChange,
  zoneFilter = 'all',
  onZoneChange,
  statusFilter = 'all',
  onStatusChange,
  onExportReport,
  onOpenCreateModal,
  zones = []
}) {
  const zoneOptions = [
    { value: 'all', label: 'Tất cả phân khu (All Zones)' },
    ...(zones.length > 0
      ? zones.map((z) => ({ value: String(z.zone_id), label: z.zone_name }))
      : DEFAULT_ZONE_OPTIONS)
  ];

  const filterSelects = [
    { id: 'zoneFilter', value: zoneFilter, onChange: onZoneChange, options: zoneOptions },
    { id: 'statusFilter', value: statusFilter, onChange: onStatusChange, options: STATUS_OPTIONS }
  ];

  return (
    <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
        {/* Left Filter Matrix */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1 sm:min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Tìm kiếm mã máy, CPU, GPU, RAM... (⌘K)"
              className="w-full h-10 pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
            />
            <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none select-none">
              ⌘K
            </kbd>
          </div>

          <div className="grid grid-cols-1 sm:flex items-center gap-2.5">
            {filterSelects.map((sel) => (
              <div key={sel.id} className="relative w-full sm:w-auto">
                <select
                  value={sel.value}
                  onChange={(e) => sel.onChange && sel.onChange(e.target.value)}
                  className="w-full sm:w-auto h-10 px-3 py-2 bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all pr-8 appearance-none"
                >
                  {sel.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full xl:w-auto">
          <button
            type="button"
            onClick={onExportReport}
            className="h-10 flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-bold rounded-lg text-xs transition-all border border-slate-200/80 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Xuất Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="h-10 flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Tạo Mẫu Cấu Hình</span>
          </button>
        </div>
      </div>
    </div>
  );
}
