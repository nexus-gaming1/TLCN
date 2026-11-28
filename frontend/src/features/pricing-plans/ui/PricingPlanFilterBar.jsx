import {
  Search,
  Filter,
  PlusCircle,
  Download
} from 'lucide-react';

/**
 * PricingPlanFilterBar (Bộ lọc Bảng giá & Giờ vàng)
 * Thanh công cụ tìm kiếm và lọc cho bảng giá máy
 */
export default function PricingPlanFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  planTypeFilter,
  onPlanTypeChange,
  hourTypeFilter,
  onHourTypeChange,
  onOpenCreateModal,
  onExport
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-3">
        {/* Cụm 1: Ô tìm kiếm và 3 bộ lọc */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 w-full">
          {/* Ô tìm kiếm */}
          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tên bảng giá, mức giá..."
              className="w-full h-10 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs font-medium pl-9 pr-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/30 transition-all shadow-inner"
            />
          </div>

          {/* Bộ lọc Trạng thái */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="appearance-none h-10 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-800 text-xs font-bold pl-3 pr-8 py-2 rounded-lg border border-slate-200 outline-none cursor-pointer transition-colors shadow-inner"
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Đang mở (Đang kích hoạt)</option>
              <option value="INACTIVE">Tạm tắt (Đang tạm ngưng)</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Bộ lọc Loại hình (Tại quán / Từ xa) */}
          <div className="relative">
            <select
              value={planTypeFilter}
              onChange={(e) => onPlanTypeChange(e.target.value)}
              className="appearance-none h-10 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-800 text-xs font-bold pl-3 pr-8 py-2 rounded-lg border border-slate-200 outline-none cursor-pointer transition-colors shadow-inner"
            >
              <option value="all">Loại phiên: Tất cả</option>
              <option value="LOCAL">Chơi tại quán</option>
              <option value="REMOTE">Chơi từ xa</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Bộ lọc Khung giờ */}
          <div className="relative">
            <select
              value={hourTypeFilter}
              onChange={(e) => onHourTypeChange(e.target.value)}
              className="appearance-none h-10 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-800 text-xs font-bold pl-3 pr-8 py-2 rounded-lg border border-slate-200 outline-none cursor-pointer transition-colors shadow-inner"
            >
              <option value="all">Khung giờ: Tất cả</option>
              <option value="HAPPY_HOUR">Giờ vàng (Có khung giờ)</option>
              <option value="ALL_DAY">Cố định cả ngày</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Cụm 2: Nút hành động Xuất Excel & Thêm Bảng Giá */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {onExport && (
            <button
              onClick={onExport}
              className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-2 cursor-pointer shadow-xs"
              title="Xuất danh sách bảng giá"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Xuất Danh Sách</span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="h-10 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm Bảng Giá Mới</span>
          </button>
        </div>
      </div>
    </div>
  );
}
