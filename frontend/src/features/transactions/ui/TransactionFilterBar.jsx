import React from 'react';
import {
    Search,
    Download,
    PlusCircle,
    Calendar,
    Tag,
    CreditCard,
    Activity,
    ChevronDown
} from 'lucide-react';

export default function TransactionFilterBar({
    filters,
    onFilterChange,
    onExport,
    onOpenCreateModal
}) {
    return (
        <div className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90">
            {/* ===== HÀNG 1: Ô TÌM KIẾM (TRÁI) & 2 NÚT HÀNH ĐỘNG (PHẢI) ===== */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Ô Tìm Kiếm */}
                <div className="relative flex-1 min-w-[260px] max-w-lg">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={filters.search || ''}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        placeholder="Tìm kiếm mã TXN, tên khách, SĐT, số máy..."
                        className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none select-none">
                        ⌘K
                    </kbd>
                </div>

                {/* 2 Nút Hành Động */}
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    <button
                        type="button"
                        onClick={onExport}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-bold rounded-lg text-xs transition-all border border-slate-200/80 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                        <Download className="w-3.5 h-3.5 text-sky-600" />
                        <span>Xuất Báo Cáo</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenCreateModal}
                        className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                        <PlusCircle className="w-4 h-4 text-white" />
                        <span>Nạp Tiền Tại Quầy</span>
                    </button>
                </div>
            </div>

            {/* ===== HÀNG 2: 4 DROPDOWN LỌC — ĐỒNG MÀU ĐEN + ICON CHUYÊN BIỆT ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                {/* Dropdown 1: Thời Gian (Icon Calendar) */}
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all">
                    <Calendar className="w-3.5 h-3.5 text-sky-600 ml-3 shrink-0 pointer-events-none" />
                    <span className="pl-1.5 text-xs text-slate-900 font-bold select-none pointer-events-none shrink-0">
                        Thời gian:
                    </span>
                    <select
                        value={filters.dateRange || 'all'}
                        onChange={(e) => onFilterChange('dateRange', e.target.value)}
                        className="w-full py-2 pl-1 pr-8 bg-transparent border-none outline-none appearance-none shadow-none focus:ring-0 focus:outline-none text-xs font-bold text-slate-900 cursor-pointer"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    >
                        <option value="today">Hôm nay</option>
                        <option value="7days">7 ngày qua</option>
                        <option value="30days">Tháng này</option>
                        <option value="all">Tất cả</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none stroke-[2]" />
                </div>

                {/* Dropdown 2: Khoản Mục (Icon Tag) */}
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all">
                    <Tag className="w-3.5 h-3.5 text-indigo-600 ml-3 shrink-0 pointer-events-none" />
                    <span className="pl-1.5 text-xs text-slate-900 font-bold select-none pointer-events-none shrink-0">
                        Khoản mục:
                    </span>
                    <select
                        value={filters.category || 'all'}
                        onChange={(e) => onFilterChange('category', e.target.value)}
                        className="w-full py-2 pl-1 pr-8 bg-transparent border-none outline-none appearance-none shadow-none focus:ring-0 focus:outline-none text-xs font-bold text-slate-900 cursor-pointer"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    >
                        <option value="all">Tất cả</option>
                        <option value="MEMBER_TOPUP">Nạp Giờ Chơi</option>
                        <option value="SERVICE_SALE">Dịch Vụ F&B</option>
                        <option value="COMBO_PURCHASE">Mua Combo</option>
                        <option value="REFUND">Hoàn Tiền</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none stroke-[2]" />
                </div>

                {/* Dropdown 3: Phương Thức (Icon CreditCard) */}
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 ml-3 shrink-0 pointer-events-none" />
                    <span className="pl-1.5 text-xs text-slate-900 font-bold select-none pointer-events-none shrink-0">
                        Thanh toán:
                    </span>
                    <select
                        value={filters.paymentMethod || 'all'}
                        onChange={(e) => onFilterChange('paymentMethod', e.target.value)}
                        className="w-full py-2 pl-1 pr-8 bg-transparent border-none outline-none appearance-none shadow-none focus:ring-0 focus:outline-none text-xs font-bold text-slate-900 cursor-pointer"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    >
                        <option value="all">Tất cả</option>
                        <option value="cash">Tiền mặt</option>
                        <option value="vietqr">VietQR Pro</option>
                        <option value="pos">Thẻ POS</option>
                        <option value="momo">Ví MoMo</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none stroke-[2]" />
                </div>

                {/* Dropdown 4: Trạng Thái (Icon Activity) */}
                <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 transition-all">
                    <Activity className="w-3.5 h-3.5 text-amber-600 ml-3 shrink-0 pointer-events-none" />
                    <span className="pl-1.5 text-xs text-slate-900 font-bold select-none pointer-events-none shrink-0">
                        Trạng thái:
                    </span>
                    <select
                        value={filters.status || 'all'}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        className="w-full py-2 pl-1 pr-8 bg-transparent border-none outline-none appearance-none shadow-none focus:ring-0 focus:outline-none text-xs font-bold text-slate-900 cursor-pointer"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    >
                        <option value="all">Tất cả</option>
                        <option value="completed">🟢 Thành công</option>
                        <option value="pending">🟡 Đang xử lý</option>
                        <option value="failed">🔴 Thất bại</option>
                        <option value="refunded">🟣 Hoàn tiền</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none stroke-[2]" />
                </div>
            </div>
        </div>
    );
}
