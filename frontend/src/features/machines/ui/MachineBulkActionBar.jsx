import React from 'react';
import { CheckCircle, RotateCcw, Wrench, Tag } from 'lucide-react';

/**
 * MachineBulkActionBar component for handling actions on multiple selected machines
 */
export default function MachineBulkActionBar({
  selectedCount = 0,
  onReboot,
  onMaintenance,
  onAssignZone,
  onClearSelection
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between px-space-base py-2.5 bg-sky-50 border border-sky-200 rounded-xl shadow-sm transition-all animate-fade-in"
      id="bulkActionBar"
    >
      <div className="flex items-center gap-space-sm">
        <CheckCircle className="w-5 h-5 text-sky-600" />
        <span className="font-title-md text-body-sm font-extrabold text-sky-900">
          Đã chọn {selectedCount} máy trạm
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onReboot}
          className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
          <span>Khởi Động Lại (Reboot)</span>
        </button>

        <button
          type="button"
          onClick={onMaintenance}
          className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
        >
          <Wrench className="w-3.5 h-3.5 text-amber-600" />
          <span>Chuyển Bảo Trì</span>
        </button>

        <button
          type="button"
          onClick={onAssignZone}
          className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
        >
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span>Gán Zone Mới</span>
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          className="text-slate-600 hover:text-slate-900 text-xs font-bold underline ml-2 cursor-pointer"
        >
          Hủy chọn
        </button>
      </div>
    </div>
  );
}
