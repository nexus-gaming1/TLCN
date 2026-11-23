import { CheckCircle2, RotateCcw, Wrench, Tag, PowerOff, X } from 'lucide-react';

/**
 * MachineBulkActionBar Component
 * Thanh công cụ thao tác hàng loạt chia 2 cụm Trái - Phải chuẩn UX
 */
export default function MachineBulkActionBar({
  selectedCount = 0,
  totalItems = 0,
  isAllSystemSelected = false,
  onSelectAllSystem,
  onClearSelection,
  onAssignZone,
  onMaintenance,
  onReboot,
  onShutdown
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 bg-sky-50/90 border border-sky-200 rounded-xl shadow-xs transition-all animate-in fade-in duration-200"
      id="bulkActionBar"
    >
      {/* ===== CỤM BÊN TRÁI: TRẠNG THÁI & PHẠM VI CHỌN ===== */}
      <div className="flex items-center gap-2.5 flex-wrap text-xs text-sky-950 font-medium">
        <div className="flex items-center gap-1.5 font-extrabold text-sky-900">
          <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            {isAllSystemSelected
              ? `Đã chọn tất cả ${selectedCount} máy toàn quán`
              : `Đã chọn ${selectedCount} máy trên trang này`}
          </span>
        </div>

        {/* Nút chuyển đổi: Chọn tất cả máy toàn hệ thống */}
        {!isAllSystemSelected && totalItems > selectedCount && (
          <>
            <span className="text-slate-300 select-none">•</span>
            <button
              type="button"
              onClick={onSelectAllSystem}
              className="text-sky-700 hover:text-sky-900 font-extrabold hover:underline cursor-pointer"
            >
              Chọn tất cả {totalItems} máy
            </button>
          </>
        )}

        <span className="text-slate-300 select-none">|</span>

        {/* Nút Hủy chọn gọn gàng */}
        <button
          type="button"
          onClick={onClearSelection}
          className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-bold transition cursor-pointer"
          title="Bỏ chọn các máy trạm này"
        >
          <X className="w-3.5 h-3.5" />
          <span>Bỏ chọn</span>
        </button>
      </div>

      {/* ===== CỤM BÊN PHẢI: 4 NÚT HÀNH ĐỘNG PHÂN THEO NGỮ NGHĨA ===== */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* 1. Gán Zone Mới (Ít rủi ro nhất - Cấu hình dữ liệu) */}
        <button
          type="button"
          onClick={onAssignZone}
          className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Chuyển phân khu cho các máy đã chọn"
        >
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span>Gán Zone Mới</span>
        </button>

        {/* 2. Chuyển Bảo Trì (Trạng thái vận hành) */}
        <button
          type="button"
          onClick={onMaintenance}
          className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Đổi trạng thái bảo trì cho các máy đã chọn"
        >
          <Wrench className="w-3.5 h-3.5 text-amber-600" />
          <span>Chuyển Bảo Trì</span>
        </button>

        {/* 3. Khởi Động Lại (Điều khiển nguồn - Reboot) */}
        <button
          type="button"
          onClick={onReboot}
          className="px-3 py-1.5 bg-white hover:bg-sky-50 border border-sky-300 text-sky-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Gửi lệnh khởi động lại các máy đã chọn"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
          <span>Khởi Động Lại</span>
        </button>

        {/* 4. Tắt Máy (Danger - Đặt ngoài cùng bên phải tránh bấm nhầm) */}
        <button
          type="button"
          onClick={onShutdown}
          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title="Tắt nguồn các máy đã chọn"
        >
          <PowerOff className="w-3.5 h-3.5 text-rose-600" />
          <span>Tắt Máy</span>
        </button>
      </div>
    </div>
  );
}
