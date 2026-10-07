import React from 'react';
import { Search, Calendar, Filter, RefreshCw, RotateCcw, PlusCircle, Download } from 'lucide-react';

export default function TransactionFilterBar({
    filters,
    onFilterChange,
    onResetFilters,
    onRefresh,
    onOpenCreateModal,
    onExportExcel,
    loading
}) {
    return (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="flex-1 relative flex items-center">
                <Search className="w-5 h-5 absolute left-3 text-on-surface-variant pointer-events-none" />
                <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                    placeholder="Tìm mã giao dịch, khách hàng, SĐT..."
                    className="w-full min-w-[240px] pl-10 pr-10 py-2 bg-surface-container-low rounded-lg text-on-surface font-body-md text-sm placeholder-on-surface-variant focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-outline-variant/20"
                />
                <span className="absolute right-3 text-[11px] font-mono bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant">
                    ⌘K
                </span>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Date Range Selector */}
                <div className="relative flex items-center bg-surface-container-low rounded-lg px-3 py-1.5 border border-outline-variant/20">
                    <Calendar className="w-4 h-4 text-primary mr-1.5" />
                    <select
                        value={filters.dateRange || 'all'}
                        onChange={(e) => onFilterChange('dateRange', e.target.value)}
                        className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none cursor-pointer pr-1"
                    >
                        <option value="today">Hôm nay</option>
                        <option value="7days">7 ngày qua</option>
                        <option value="30days">Tháng này</option>
                        <option value="all">Tất cả thời gian</option>
                    </select>
                </div>

                {/* Transaction Category */}
                <div className="relative flex items-center bg-surface-container-low rounded-lg px-2 py-1.5 border border-outline-variant/20">
                    <select
                        value={filters.category || 'all'}
                        onChange={(e) => onFilterChange('category', e.target.value)}
                        className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
                    >
                        <option value="all">Khoản mục (Tất cả)</option>
                        <option value="MEMBER_TOPUP">Nạp Giờ Chơi</option>
                        <option value="SERVICE_SALE">Dịch Vụ F&B</option>
                        <option value="COMBO_PURCHASE">Combo Đêm</option>
                        <option value="REFUND">Hoàn Tiền</option>
                        <option value="OTHER">Khác</option>
                    </select>
                </div>

                {/* Payment Method */}
                <div className="relative flex items-center bg-surface-container-low rounded-lg px-2 py-1.5 border border-outline-variant/20">
                    <select
                        value={filters.paymentMethod || 'all'}
                        onChange={(e) => onFilterChange('paymentMethod', e.target.value)}
                        className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
                    >
                        <option value="all">Phương thức (Tất cả)</option>
                        <option value="CASH">Tiền mặt</option>
                        <option value="VIETQR">VietQR</option>
                        <option value="POS">Thẻ POS</option>
                        <option value="MOMO">Ví MoMo</option>
                    </select>
                </div>

                {/* Status Filter */}
                <div className="relative flex items-center bg-surface-container-low rounded-lg px-2 py-1.5 border border-outline-variant/20">
                    <select
                        value={filters.status || 'all'}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
                    >
                        <option value="all">Trạng thái (Tất cả)</option>
                        <option value="COMPLETED">Thành công</option>
                        <option value="PENDING">Đang xử lý</option>
                        <option value="FAILED">Thất bại</option>
                        <option value="REFUNDED">Hoàn tiền</option>
                    </select>
                </div>

                <div className="w-px h-6 bg-outline-variant/30 hidden lg:block mx-1"></div>

                <button
                    onClick={onExportExcel}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200/50 text-xs font-semibold ml-auto lg:ml-0"
                    title="Xuất Báo Cáo Excel"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Xuất Excel</span>
                </button>
            </div>
        </div>
    );
}
