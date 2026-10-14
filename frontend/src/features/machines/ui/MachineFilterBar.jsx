import React, { useEffect, useRef } from 'react';
import { Search, Download, PlusCircle, LayoutList, LayoutGrid, ChevronDown } from 'lucide-react';
import { COMPUTER_STATUS_OPTIONS } from '../../../shared/constants/stationConstants';

export default function MachineFilterBar({
  searchQuery = '',
  onSearchChange,
  zones = [],
  zoneFilter = 'all',
  onZoneChange,
  statusFilter = 'all',
  onStatusChange,
  hardwareList = [],
  hardwareFilter = 'all',
  onHardwareChange,
  viewMode = 'table',
  onViewModeChange,
  onOpenCreateModal,
  onExportReport
}) {
  const searchInputRef = useRef(null);

  // Active Keyboard Listener: Cmd+K (Mac) / Ctrl+K (Windows) focuses search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90">
      {/* ===== HÀNG 1: TÌM KIẾM & CÁC HÀNH ĐỘNG CHÍNH ===== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
        {/* Bên trái: Ô Tìm Kiếm nới rộng max-w-lg */}
        <div className="relative min-w-[260px] flex-1 max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Tìm PC ID, MAC, IP, tên khách hoặc game..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none select-none">
            ⌘K
          </span>
        </div>

        {/* Bên phải: Cụm Nút Hành Động + Chuyển Chế Độ Bảng/Lưới */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-end sm:self-center">
          {/* Nút Xuất Báo Cáo */}
          <button
            type="button"
            onClick={() => onExportReport && onExportReport()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-bold rounded-lg text-xs transition-all border border-slate-200/90 shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Xuất Báo Cáo</span>
          </button>

          {/* Nút Thêm Máy Mới */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>+ Thêm Máy Mới</span>
          </button>

          {/* Bộ Chuyển Đổi View: Bảng / Lưới */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/90">
            <button
              type="button"
              onClick={() => onViewModeChange && onViewModeChange('table')}
              className={`px-3 py-1 rounded-md flex items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng bảng chi tiết"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange && onViewModeChange('grid')}
              className={`px-3 py-1 rounded-md flex items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng lưới phòng"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Lưới</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== HÀNG 2: KHU VỰC BỘ LỌC (NẰM NGANG HÀNG Ở BÊN TRÁI, CÓ PADDING-RIGHT THOÁNG ICON) ===== */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
        {/* Bộ Lọc 1: Phân Khu */}
        <div className="relative">
          <select
            value={zoneFilter}
            onChange={(e) => onZoneChange && onZoneChange(e.target.value)}
            className="pl-3 pr-9 py-2 bg-slate-50 text-slate-900 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all appearance-none"
          >
            <option value="all">Tất cả phân khu</option>
            {zones.map((z) => (
              <option key={z.zone_id} value={`zone-${z.zone_id}`}>
                {z.zone_name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
        </div>

        {/* Bộ Lọc 2: Trạng Thái (Đã fix lỗi text đè icon bằng pr-9 và bỏ text tiếng Anh thừa) */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
            className="pl-3 pr-9 py-2 bg-slate-50 text-slate-900 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all appearance-none"
          >
            <option value="all">Tất cả trạng thái</option>
            {COMPUTER_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value.toLowerCase()}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
        </div>

        {/* Bộ Lọc 3: Cấu Hình GPU */}
        <div className="relative">
          <select
            value={hardwareFilter}
            onChange={(e) => onHardwareChange && onHardwareChange(e.target.value)}
            className="pl-3 pr-9 py-2 bg-slate-50 text-slate-900 text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all appearance-none"
          >
            <option value="all">Cấu hình: Tất cả GPU</option>
            {hardwareList.map((item) => {
              const val = typeof item === 'object' ? item.value : item;
              const lbl = typeof item === 'object' ? item.label : item;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
        </div>
      </div>
    </div>
  );
}
