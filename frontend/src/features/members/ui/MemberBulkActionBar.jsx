import { CheckCircle2, Lock, LockOpen } from 'lucide-react';

export default function MemberBulkActionBar({
  selectedCount = 0,
  onLock,
  onUnlock
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-800 transition-all animate-in fade-in slide-in-from-top-2 duration-150"
      id="bulk-actions"
    >
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Đã chọn <strong className="text-white font-mono text-sm underline decoration-sky-500" id="selected-count">{selectedCount}</strong> hội viên
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
        <span className="text-xs text-slate-400 hidden md:inline">
          Thao tác trạng thái hàng loạt cho các tài khoản đang chọn
        </span>
      </div>

      {/* Action Buttons: Khóa tạm thời & Mở khóa tất cả */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={onUnlock}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
          title="Kích hoạt / Mở khóa tất cả tài khoản đang chọn"
        >
          <LockOpen className="w-3.5 h-3.5" />
          <span>Mở Khóa Tất Cả</span>
        </button>

        <button
          type="button"
          onClick={onLock}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
          title="Tạm khóa tất cả tài khoản đang chọn"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Khóa Tạm Thời</span>
        </button>
      </div>
    </div>
  );
}


