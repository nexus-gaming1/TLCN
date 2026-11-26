import { useMemo } from 'react';
import { Search, Download, Printer, UserPlus } from 'lucide-react';
import { USER_STATUS_LABELS } from '../../../shared/constants/userConstants';

export default function MemberFilterBar({
  members = [],
  ranks = [],
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierChange,
  statusFilter,
  onStatusChange,
  onOpenCreateModal,
  onOpenExportModal,
  onPrintList,
}) {
  const selectedTier = tierFilter;
  const setSelectedTier = onTierChange;
  const selectedStatus = statusFilter;
  const setSelectedStatus = onStatusChange;

  // Xây dựng danh sách tùy chọn lọc hạng động từ bảng CSDL membership_rank
  const tierOptions = useMemo(() => {
    const list = [{ id: 'all', label: `Tất cả hạng (${members.length})` }];
    if (ranks && ranks.length > 0) {
      ranks.forEach((r) => {
        const count = members.filter(
          (m) => m.rankId === r.rank_id || m.rankName === r.name
        ).length;
        list.push({
          id: String(r.rank_id),
          label: `${r.name} (${count})`
        });
      });
    } else {
      const uniqueRankNames = [...new Set(members.map((m) => m.rankName).filter(Boolean))];
      uniqueRankNames.forEach((name) => {
        const count = members.filter((m) => m.rankName === name).length;
        list.push({ id: name, label: `${name} (${count})` });
      });
    }
    return list;
  }, [ranks, members]);

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
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            title="Mở hộp thoại xuất báo cáo Excel/PDF"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Xuất Báo Cáo</span>
          </button>
          <button
            type="button"
            onClick={onPrintList}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            title="In danh sách hội viên qua trình duyệt (A4)"
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

      {/* Filter Dropdowns Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Dropdown Tầng Hạng */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase text-slate-600 font-bold">Tầng Hạng:</span>
            <select
              value={selectedTier || 'all'}
              onChange={(e) => setSelectedTier && setSelectedTier(e.target.value)}
              aria-label="Lọc theo tầng hạng hội viên"
              className="h-8 pl-3 pr-8 py-1 bg-slate-50 hover:bg-white text-slate-800 font-sans text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 shadow-2xs cursor-pointer transition-all"
            >
              {tierOptions.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Trạng Thái */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase text-slate-600 font-bold">Trạng thái:</span>
            <select
              value={selectedStatus || 'all'}
              onChange={(e) => setSelectedStatus && setSelectedStatus(e.target.value)}
              aria-label="Lọc theo trạng thái tài khoản"
              className="h-8 pl-3 pr-8 py-1 bg-slate-50 hover:bg-white text-slate-800 font-sans text-xs font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 shadow-2xs cursor-pointer transition-all"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(USER_STATUS_LABELS).map(([statusKey, config]) => (
                <option key={statusKey} value={statusKey}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
