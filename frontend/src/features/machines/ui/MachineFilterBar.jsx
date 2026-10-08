import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, RefreshCw, PlusCircle, LayoutList, LayoutGrid } from 'lucide-react';
import { COMPUTER_STATUS_OPTIONS } from '../../../shared/constants/stationConstants';

/**
 * MachineFilterBar component for search, filters, actions, and view switcher
 * Features active Cmd+K / Ctrl+K search focus shortcut and 100% dynamic CSDL options.
 */
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
  onSyncBootrom,
  onExportReport
}) {
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleSyncClick = () => {
    setIsSyncing(true);
    if (onSyncBootrom) onSyncBootrom();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-lg shadow-flat border border-slate-200">
      {/* Left Group: Search Input & Filter Dropdowns */}
      <div className="flex items-center gap-3 flex-wrap flex-1">
        {/* Search Box with Cmd+K / Ctrl+K Auto-Focus */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Tìm PC ID, MAC, IP, tên khách hoặc game..."
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none">
            ⌘K
          </span>
        </div>

        {/* Dynamic Zone Dropdown (Populated from CSDL API) */}
        <div className="relative">
          <select
            value={zoneFilter}
            onChange={(e) => onZoneChange && onZoneChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 text-slate-900 text-xs font-extrabold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all"
          >
            <option value="all">Tất cả phân khu (All Zones)</option>
            {zones.map((z) => (
              <option key={z.zone_id} value={`zone-${z.zone_id}`}>
                {z.zone_name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Status Filter (Populated from Centralized COMPUTER_STATUS_OPTIONS) */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 text-slate-900 text-xs font-extrabold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all"
          >
            <option value="all">Tất cả trạng thái (All Statuses)</option>
            {COMPUTER_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value.toLowerCase()}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Hardware Filter (Populated from CSDL GPU specs) */}
        <div className="relative">
          <select
            value={hardwareFilter}
            onChange={(e) => onHardwareChange && onHardwareChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 text-slate-900 text-xs font-extrabold rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer transition-all"
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
        </div>
      </div>

      {/* Right Group: Action Buttons & View Switcher */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap self-start xl:self-center">
        <button
          type="button"
          onClick={() => onExportReport && onExportReport()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-extrabold rounded-lg text-xs transition-all border border-slate-200/90 shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Xuất Báo Cáo</span>
        </button>

        <button
          type="button"
          onClick={handleSyncClick}
          className={`flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-extrabold rounded-lg text-xs transition-all border border-slate-200/90 shadow-2xs cursor-pointer ${
            isSyncing ? 'opacity-75' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Đồng Bộ BootROM</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-white" />
          <span>+ Thêm Máy Mới</span>
        </button>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onViewModeChange && onViewModeChange('table')}
            className={`px-3 py-1 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${
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
            className={`px-3 py-1 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${
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
  );
}
