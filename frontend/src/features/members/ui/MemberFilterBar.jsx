import { useMemo } from 'react';
import { Search, Download, Printer, UserPlus } from 'lucide-react';
import { USER_STATUS_LABELS } from '../../../shared/constants/userConstants';

export default function MemberFilterBar({
  members = [],
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

  // Tính toán số lượng từng tầng hạng động từ dữ liệu thực tế, không hardcode
  const tierCounts = useMemo(() => {
    const all = members.length;
    const diamond = members.filter((m) => m.tier === 'diamond').length;
    const gold = members.filter((m) => m.tier === 'gold').length;
    const silver = members.filter((m) => m.tier === 'silver').length;
    const normal = members.filter((m) => m.tier === 'normal').length;
    return { all, diamond, gold, silver, normal };
  }, [members]);

  const tierOptions = [
    { id: 'all', label: `Tất cả (${tierCounts.all})` },
    { id: 'diamond', label: `💎 Kim Cương (${tierCounts.diamond})` },
    { id: 'gold', label: `⭐ Vàng (${tierCounts.gold})` },
    { id: 'silver', label: `🥈 Bạc (${tierCounts.silver})` },
    { id: 'normal', label: `🥉 Đồng (${tierCounts.normal})` },
  ];

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

      {/* Filter Pills Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] uppercase text-slate-600 font-bold mr-1">Tầng Hạng:</span>
          {tierOptions.map((tier) => (
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
          <span className="font-mono text-[11px] uppercase text-slate-600 font-bold mr-1">Trạng thái:</span>
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
  );
}
