import React from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  PlusCircle,
  Download
} from 'lucide-react';

/**
 * PromotionFilterBar
 * Thanh công cụ tìm kiếm và lọc nâng cao cho khuyến mãi
 */
export default function PromotionFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  audienceFilter,
  onAudienceChange,
  onResetFilters,
  onRefresh,
  onOpenCreateModal,
  onExport
}) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col gap-3">
      <div className="flex flex-col xl:flex-row items-center justify-between gap-3">
        
        {/* Left Side Group */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto pb-1 xl:pb-0">
          {/* Search Input */}
          <div className="relative w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm tên chiến dịch, mã voucher, mô tả..."
            className="w-full h-10 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-xs font-medium pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-sky-500/30 transition-all shadow-inner"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none h-10 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-800 text-xs font-bold pl-3 pr-8 py-2.5 rounded-lg border border-slate-200 outline-none cursor-pointer transition-colors shadow-inner"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="ACTIVE">Đang hoạt động (Active)</option>
            <option value="UPCOMING">Sắp diễn ra (Upcoming)</option>
            <option value="ENDED">Đã kết thúc (Ended)</option>
            <option value="SUSPENDED">Tạm ngưng (Suspended)</option>
          </select>

          <Filter className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Promo Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            className="appearance-none h-10 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-800 text-xs font-bold pl-3 pr-8 py-2.5 rounded-lg border border-slate-200 outline-none cursor-pointer transition-colors shadow-inner"
          >
            <option value="all">Loại: Tất cả loại</option>
            <option value="PERCENTAGE">% Giờ chơi</option>
            <option value="FIXED_AMOUNT">Tiền tặng cố định</option>
            <option value="COMBO">Combo Đêm</option>
            <option value="FOOD_BEVERAGE">Giảm giá F&amp;B</option>
          </select>

          <Filter className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Target Audience Filter */}
        <div className="relative">
          <select
            value={audienceFilter}
            onChange={(e) => onAudienceChange(e.target.value)}
            className="appearance-none h-10 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-slate-800 text-xs font-bold pl-3 pr-8 py-2.5 rounded-lg border border-slate-200 outline-none cursor-pointer transition-colors shadow-inner"
          >
            <option value="all">Đối tượng: Tất cả</option>
            <option value="ALL">Tất cả hội viên</option>
            <option value="VIP">VIP Only</option>
            <option value="NEWBIE">Tân thủ (Newbie)</option>
            <option value="NORMAL">Hội viên Thường</option>
          </select>

          <Filter className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        </div>

        <div className="h-6 w-px bg-slate-200 hidden xl:block mx-1" />

        {/* Action Buttons Group */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Export Button */}
          <button
            type="button"
            onClick={onExport}
            className="h-10 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden xl:inline">Xuất Báo Cáo</span>
          </button>

          {/* Create Button */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="h-10 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tạo Chiến Dịch Mới</span>
          </button>

        </div>
      </div>
    </div>
  );
}

