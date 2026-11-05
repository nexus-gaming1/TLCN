import { Search, Download, PlusCircle, SlidersHorizontal } from 'lucide-react';

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
  return (
    <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90">
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Left Filter Matrix */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Tìm kiếm mã máy, CPU, GPU, RAM... (⌘K)"
              className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none select-none">
              ⌘K
            </kbd>
          </div>

          {/* Zone Dropdown */}
          <div className="relative">
            <select
              value={zoneFilter}
              onChange={(e) => onZoneChange && onZoneChange(e.target.value)}
              className="px-3 py-2 bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all pr-8 appearance-none"
            >
              <option value="all">Tất cả phân khu (All Zones)</option>
              {zones.length > 0 ? (
                zones.map((z) => (
                  <option key={z.zone_id} value={String(z.zone_id)}>
                    {z.zone_name}
                  </option>
                ))
              ) : (
                <>
                  <option value="1">Zone 1 - Thi Đấu Esports</option>
                  <option value="2">Zone 2 - VIP Gaming Pro</option>
                  <option value="3">Zone 3 - Standard Combat</option>
                  <option value="4">Zone 4 - Stream Studio</option>
                  <option value="5">Zone 5 - Cloud Host</option>
                </>
              )}
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
              className="px-3 py-2 bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all pr-8 appearance-none"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="online">🟢 Đang hoạt động (Online)</option>
              <option value="ready">⚪ Sẵn sàng (Standby)</option>
              <option value="maintenance">🔴 Bảo trì / Kiểm tra</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5 self-end xl:self-center">
          <button
            type="button"
            onClick={onExportReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-bold rounded-lg text-xs transition-all border border-slate-200/80 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Xuất Báo Cáo</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>+ Tạo Mẫu Cấu Hình</span>
          </button>
        </div>
      </div>
    </div>
  );
}
