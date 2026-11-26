import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * MachinePagination component for fleet table pagination
 */
export default function MachinePagination({
  currentPage = 1,
  totalPages = 15,
  pageSize = 10,
  totalItems = 120,
  selectedCount = 0,
  onPageChange,
  onPageSizeChange
}) {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="px-space-base py-space-sm bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-space-sm text-xs text-slate-700 select-none border-t border-slate-200/80">
      <div className="flex items-center gap-space-md">
        <span>
          Hiển thị <strong className="text-slate-900 font-bold">{startItem} - {endItem}</strong> của <strong className="text-slate-900 font-bold">{totalItems}</strong> máy trạm
        </span>
        <div className="hidden sm:flex items-center gap-space-xs text-slate-500 font-semibold">
          <span>|</span>
          <span className={selectedCount > 0 ? 'text-sky-700 font-bold' : ''}>
            Đang chọn {selectedCount} / {totalItems} máy
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-md">
        {/* Rows per page */}
        <div className="flex items-center gap-space-xs">
          <span className="text-slate-600 font-semibold">Hiển thị mỗi trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
            className="bg-white px-2.5 py-1 rounded border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none shadow-xs cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => currentPage > 1 && onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 transition-colors shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange && onPageChange(page)}
              className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-colors ${
                currentPage === page
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {page}
            </button>
          ))}

          <span className="px-1 text-slate-400 font-mono">...</span>

          <button
            type="button"
            onClick={() => onPageChange && onPageChange(totalPages)}
            className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-colors ${
              currentPage === totalPages
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {totalPages}
          </button>

          <button
            type="button"
            onClick={() => currentPage < totalPages && onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center disabled:opacity-40 transition-colors shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
