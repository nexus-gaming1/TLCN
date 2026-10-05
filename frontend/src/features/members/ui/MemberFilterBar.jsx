import React from 'react';
import { Search, Download, Printer, UserPlus, RefreshCw } from 'lucide-react';

export default function MemberFilterBar({
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierChange,
  statusFilter,
  onStatusChange,
  onOpenCreateModal,
  onRefresh,
}) {
  const selectedTier = tierFilter;
  const setSelectedTier = onTierChange;
  const selectedStatus = statusFilter;
  const setSelectedStatus = onStatusChange;

  return (
    <div className="bg-white p-3.5 rounded-lg shadow-flat border border-slate-200 space-y-3">
      {/* Top Search & Actions Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full pl-10 pr-12 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-medium"
            placeholder="Tìm kiếm theo Tên, Username, SĐT, ID hội viên (UID-xxxx)..."
            type="text"
            value={searchQuery || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold">⌘K</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-md text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Xuất Báo Cáo</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-md text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">In Danh Sách</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-md text-xs font-bold shadow-flat shadow-sky-500/20 hover:shadow-sky-500/35 transition-all transform hover:-translate-y-0.5 border border-cyan-300/40 relative overflow-hidden group"
          >
            <UserPlus className="w-4 h-4 text-cyan-100" />
            <span className="tracking-wide">+ Thêm Hội Viên Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Pills Strip (Tightened Spacing & Grouped Filter Pills) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] uppercase text-slate-600 font-bold mr-1">Tầng Hạng:</span>
          {[
            { id: 'all', label: 'Tất cả (3,420)' },
            { id: 'diamond', label: '💎 VIP Diamond (24)' },
            { id: 'gold', label: '⭐ VIP Gold (118)' },
            { id: 'normal', label: '🎮 Normal Standard (3,278)' },
          ].map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedTier && setSelectedTier(tier.id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-colors ${
                selectedTier === tier.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase text-slate-600 font-bold mr-1">Trạng thái:</span>
          <select
            value={selectedStatus || 'all'}
            onChange={(e) => setSelectedStatus && setSelectedStatus(e.target.value)}
            className="px-3 py-1 bg-slate-100 text-slate-800 font-sans text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 border-0 cursor-pointer"
          >
            <option value="all">Toàn bộ trạng thái (100%)</option>
            <option value="playing-local">🟢 Đang chơi tại trạm (Local)</option>
            <option value="playing-remote">⚡ Đang chơi Cloud Gaming (Remote)</option>
            <option value="idle">🔵 Online sảnh / Rảnh</option>
            <option value="offline">⚪ Ngoại tuyến (Offline)</option>
            <option value="locked">🔴 Tài khoản tạm khóa</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            title="Làm mới bảng"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
