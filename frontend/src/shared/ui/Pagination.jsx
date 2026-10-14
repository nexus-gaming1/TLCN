import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Pagination Component (Phân trang dùng chung cho toàn bộ Admin UI)
 * Chuẩn Clean Code, Responsive, hỗ trợ tính toán dynamic số trang và kích thước trang.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'mục',
  selectedCount = 0,
  className = ''
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Thuật toán hiển thị các số trang thông minh với dấu "..."
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (validCurrentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ];
    }

    return [
      1,
      '...',
      validCurrentPage - 1,
      validCurrentPage,
      validCurrentPage + 1,
      '...',
      totalPages
    ];
  }, [totalPages, validCurrentPage]);

  const handlePageClick = (page) => {
    if (typeof page === 'number' && page !== validCurrentPage && onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <div
      className={`px-4 py-3 bg-slate-50 border-t border-slate-200/90 rounded-b-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600 select-none ${className}`}
    >
      {/* Thông tin số lượng & Lựa chọn số dòng mỗi trang */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2">
          <span>
            Hiển thị{' '}
            <strong className="font-bold text-slate-900">
              {startItem} - {endItem}
            </strong>{' '}
            trên tổng số{' '}
            <strong className="font-bold text-slate-900">
              {totalItems.toLocaleString()}
            </strong>{' '}
            {itemLabel}
          </span>

          {selectedCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
              (Đang chọn {selectedCount})
            </span>
          )}
        </div>
      </div>

      {/* Điều hướng chuyển trang */}
      <div className="flex items-center gap-1">
        {/* Nút về trang đầu */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={validCurrentPage === 1}
          className="w-7 h-7 rounded-md bg-white border border-gray-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-gray-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Trang đầu"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Nút lùi 1 trang */}
        <button
          type="button"
          onClick={() => handlePageClick(validCurrentPage - 1)}
          disabled={validCurrentPage === 1}
          className="w-7 h-7 rounded-md bg-white border border-gray-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-gray-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Trang trước"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Danh sách các số trang */}
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1 text-slate-400 font-mono text-xs">
                ...
              </span>
            );
          }

          const isActive = p === validCurrentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => handlePageClick(p)}
              className={`w-7 h-7 rounded-md font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${isActive
                  ? 'bg-sky-600 text-white shadow-xs border border-sky-600'
                  : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-gray-200 hover:border-gray-300 shadow-xs'
                }`}
            >
              {p}
            </button>
          );
        })}

        {/* Nút tiến 1 trang */}
        <button
          type="button"
          onClick={() => handlePageClick(validCurrentPage + 1)}
          disabled={validCurrentPage === totalPages}
          className="w-7 h-7 rounded-md bg-white border border-gray-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-gray-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Trang kế tiếp"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Nút đến trang cuối */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={validCurrentPage === totalPages}
          className="w-7 h-7 rounded-md bg-white border border-gray-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-gray-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          title="Trang cuối"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
