import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Download,
  Tag,
  Wifi,
  CheckCircle2,
  ChevronDown,
  Check,
  Loader2,
  X
} from 'lucide-react';

/**
 * Custom Dropdown Filter Component
 * Thay thế hoàn toàn HTML <select> mặc định bằng menu nổi tùy chỉnh đồng bộ UI/UX
 */
function FilterDropdown({
  label,
  icon: Icon,
  iconColor,
  options,
  selectedValue,
  onChange,
  isOpen,
  onToggle,
  onClose
}) {
  const currentOption = options.find((opt) => String(opt.value) === String(selectedValue)) || options[0];

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer border shadow-2xs ${
          isOpen
            ? 'bg-white border-sky-500 ring-2 ring-sky-500/20'
            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/90 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
          <span className="text-slate-500 font-semibold shrink-0">{label}:</span>
          <div className="flex items-center gap-1.5 truncate">
            {currentOption?.dotColor && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${currentOption.dotColor}`} />
            )}
            <span className="font-bold text-slate-900 truncate">
              {currentOption?.label}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 min-w-full">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(selectedValue);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-sky-50 text-sky-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {opt.dotColor && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GameFilterBar({
  filters,
  categories = [],
  onFilterChange,
  onResetFilters,
  onOpenCreateModal,
  onExport,
  isSearching = false
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterBarRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        onFilterChange('search', searchTerm);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm('');
    onFilterChange('search', '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onFilterChange('search', searchTerm);
    }
  };

  // Đóng dropdown khi click bên ngoài hoặc nhấn phím ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterBarRef.current && !filterBarRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDownGlobal = (event) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDownGlobal);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, []);

  // Cấu hình danh sách lựa chọn cho Thể loại
  const categoryOptions = [
    { value: 'all', label: 'Tất cả thể loại', dotColor: 'bg-slate-400' },
    ...categories.map((cat) => ({
      value: String(cat.category_id),
      label: cat.name,
      dotColor: 'bg-sky-500'
    }))
  ];

  // Cấu hình danh sách lựa chọn cho Remote Play
  const remotePlayOptions = [
    { value: 'all', label: 'Tất cả', dotColor: 'bg-slate-400' },
    { value: 'true', label: 'Có hỗ trợ WebRTC', dotColor: 'bg-indigo-500' },
    { value: 'false', label: 'Chỉ chơi tại trạm (Local)', dotColor: 'bg-slate-400' }
  ];

  // Cấu hình danh sách lựa chọn cho Trạng thái phục vụ
  const statusOptions = [
    { value: 'all', label: 'Tất cả trạng thái', dotColor: 'bg-slate-400' },
    { value: 'true', label: 'Sẵn sàng phục vụ', dotColor: 'bg-emerald-500' },
    { value: 'false', label: 'Tạm ngưng / Bảo trì', dotColor: 'bg-amber-500' }
  ];

  return (
    <div
      ref={filterBarRef}
      className="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-slate-200/90"
    >
      {/* ===== HÀNG 1: Ô TÌM KIẾM (TRÁI) & CÁC NÚT HÀNH ĐỘNG (PHẢI) ===== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Ô Tìm Kiếm Debounced & Cố định vị trí phụ trợ */}
        <div className="relative flex-1 min-w-[260px] max-w-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm tên game, đường dẫn thực thi .exe..."
            className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all shadow-2xs"
          />
          {/* Cụm biểu tượng phụ có kích thước cố định tuyệt đối, không làm xô lệch text input */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6">
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
            ) : searchTerm ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="font-mono text-[10px] font-bold text-slate-400 px-1.5 py-0.5 bg-slate-200/70 rounded pointer-events-none select-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* 2 Nút Hành Động */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
          {/* Nút Xuất Báo Cáo */}
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-200 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Xuất Danh Sách</span>
          </button>

          {/* Nút Thêm Game Mới */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Thêm Game Mới</span>
          </button>
        </div>
      </div>

      {/* ===== HÀNG 2: 3 CUSTOM DROPDOWNS ĐỒNG BỘ GIAO DIỆN ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-slate-100">
        {/* Dropdown 1: Thể Loại */}
        <FilterDropdown
          label="Thể loại"
          icon={Tag}
          iconColor="text-sky-600"
          options={categoryOptions}
          selectedValue={filters.category_id || 'all'}
          onChange={(val) => onFilterChange('category_id', val)}
          isOpen={openDropdown === 'category'}
          onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
          onClose={() => setOpenDropdown(null)}
        />

        {/* Dropdown 2: Remote Play */}
        <FilterDropdown
          label="Remote Play"
          icon={Wifi}
          iconColor="text-indigo-600"
          options={remotePlayOptions}
          selectedValue={filters.is_remote_supported !== undefined ? String(filters.is_remote_supported) : 'all'}
          onChange={(val) => onFilterChange('is_remote_supported', val)}
          isOpen={openDropdown === 'remote'}
          onToggle={() => setOpenDropdown(openDropdown === 'remote' ? null : 'remote')}
          onClose={() => setOpenDropdown(null)}
        />

        {/* Dropdown 3: Trạng Thái Phục Vụ */}
        <FilterDropdown
          label="Trạng thái"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          options={statusOptions}
          selectedValue={filters.is_available !== undefined ? String(filters.is_available) : 'all'}
          onChange={(val) => onFilterChange('is_available', val)}
          isOpen={openDropdown === 'status'}
          onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
          onClose={() => setOpenDropdown(null)}
        />
      </div>
    </div>
  );
}
