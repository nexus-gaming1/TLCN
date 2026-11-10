import { useState, useMemo, useEffect } from 'react';
import {
  Cpu,
  MemoryStick,
  Gamepad2,
  HardDrive,
  Activity,
  Edit,
  Trash2
} from 'lucide-react';
import Pagination from '../../../shared/ui/Pagination';

/**
 * Helper cell component for hardware spec columns (CPU, RAM, GPU, Storage)
 */
function ComponentSpecCell({ icon: Icon, title, subText, truncateSub = false }) {
  return (
    <td className="py-3.5 px-4">
      <div className="flex items-start gap-2.5">
        <div className="text-slate-500 shrink-0 mt-0.5">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-slate-900 leading-tight">
            {title || 'Chưa thiết lập'}
          </span>
          <span
            className={`font-mono text-[11px] text-slate-600 font-medium mt-0.5 ${
              truncateSub ? 'truncate max-w-[200px]' : ''
            }`}
            title={truncateSub ? subText || '' : undefined}
          >
            {subText || ''}
          </span>
        </div>
      </div>
    </td>
  );
}

function StatusToggle({ item, isToggling, onToggleActive }) {
  const isActive = item.is_active !== false;
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={isToggling}
        onClick={() => onToggleActive && onToggleActive(item)}
        role="switch"
        aria-checked={isActive}
        className={`relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
          isActive ? 'bg-emerald-500' : 'bg-slate-300'
        } ${isToggling ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
        title={isActive ? 'Đang áp dụng - Click để tạm ngưng' : 'Tạm ngưng - Click để kích hoạt'}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            isActive ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span
        className={`text-[11px] font-bold select-none ${
          isActive ? 'text-emerald-700' : 'text-slate-400'
        }`}
      >
        {isActive ? 'Đang mở' : 'Tạm tắt'}
      </span>
    </div>
  );
}

function RowActions({ item, onOpenTelemetry, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onOpenTelemetry && onOpenTelemetry(item)}
        className="w-8 h-8 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-colors cursor-pointer"
        title="Xem Telemetry Nhiệt độ & Băng thông"
      >
        <Activity className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => onEdit && onEdit(item)}
        className="w-8 h-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
        title="Chỉnh sửa cấu hình"
      >
        <Edit className="w-4 h-4" />
      </button>

      {onDelete && item.profile_id > 0 && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
          title="Xóa mẫu cấu hình"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function EmptyHardwareState({ totalSpecsCount, onResetFilters }) {
  return (
    <div className="py-12 px-4 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
      <HardDrive className="w-8 h-8 text-slate-300" />
      <p className="font-semibold text-sm text-slate-700">
        {totalSpecsCount === 0
          ? 'Chưa có cấu hình phần cứng nào được ghi nhận'
          : 'Không tìm thấy cấu hình phần cứng phù hợp với bộ lọc'}
      </p>
      <p className="text-xs text-slate-400 max-w-md">
        {totalSpecsCount === 0
          ? 'Hệ thống chưa có mẫu cấu hình nào. Bạn có thể nhấn "Tạo Mẫu Cấu Hình" bên trên để thiết lập cấu hình chuẩn.'
          : 'Vui lòng thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc phân khu / trạng thái.'}
      </p>
      {onResetFilters && totalSpecsCount > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 px-3.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold border border-sky-200 transition-all cursor-pointer shadow-2xs"
        >
          Đặt lại bộ lọc
        </button>
      )}
    </div>
  );
}

/**
 * High-Density Hardware Inventory Table (Responsive: Cards on Mobile, Table on Desktop)
 */
export default function HardwareSpecsTable({
  specs = [],
  totalSpecsCount = specs.length,
  togglingId = null,
  onResetFilters,
  onOpenTelemetry,
  onEdit,
  onToggleActive,
  onDelete
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 if specs changes and currentPage is out of bounds
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(specs.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(1);
    }
  }, [specs.length, pageSize, currentPage]);

  const paginatedSpecs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return specs.slice(start, start + pageSize);
  }, [specs, currentPage, pageSize]);

  const isAllSelected = paginatedSpecs.length > 0 && paginatedSpecs.every((item) => selectedIds.includes(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedSpecs.some((s) => s.id === id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...paginatedSpecs.map((item) => item.id)])));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col">
      {/* Table Header Micro-Action Strip */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-sm text-slate-900">
            Danh Sách Cấu Hình Phần Cứng
          </span>
          <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wider">
            {specs.length} CẤU HÌNH
          </span>
        </div>

        {/* Realtime SAN Sync Heartbeat */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>
            Đồng bộ BootROM SAN: <strong className="text-emerald-700 font-bold">Trực tiếp (0.1s)</strong>
          </span>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden divide-y divide-slate-200">
        {paginatedSpecs.length === 0 ? (
          <EmptyHardwareState totalSpecsCount={totalSpecsCount} onResetFilters={onResetFilters} />
        ) : (
          paginatedSpecs.map((item) => (
            <div key={item.id} className="p-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 truncate">
                    {item.profileName || item.id}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                      {item.zoneName || 'Phân khu'}
                    </span>
                    {item.assignedComputers && item.assignedComputers.length > 0 && (
                      <span className="font-mono text-[10px] text-slate-500">
                        {item.assignedComputers.length} máy
                      </span>
                    )}
                  </div>
                </div>
                <StatusToggle
                  item={item}
                  isToggling={togglingId === item.id}
                  onToggleActive={onToggleActive}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200/70">
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{item.cpu?.model || 'Chưa thiết lập'}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{item.gpu?.model || 'Chưa thiết lập'}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <MemoryStick className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{item.ram?.capacity || 'Chưa thiết lập'}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{item.storage?.type || 'Chưa thiết lập'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <RowActions
                  item={item}
                  onOpenTelemetry={onOpenTelemetry}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop High-Density Table (>= md) */}
      <div className="hidden md:block w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1050px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider select-none border-b-2 border-slate-300 font-extrabold">
              <th className="py-3 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded accent-sky-600 cursor-pointer w-4 h-4"
                />
              </th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[150px]">Mã Máy / Phân Khu</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[240px]">Bộ Xử Lý (CPU)</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[200px]">Bộ Nhớ RAM</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[240px]">Card Đồ Họa (GPU)</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[220px]">Lưu Trữ / BootROM</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-center min-w-[150px] whitespace-nowrap">Trạng Thái</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-right pr-6 min-w-[140px]">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
            {paginatedSpecs.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyHardwareState totalSpecsCount={totalSpecsCount} onResetFilters={onResetFilters} />
                </td>
              </tr>
            ) : (
              paginatedSpecs.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-100 transition-colors group ${
                      isSelected ? 'bg-sky-50/70' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded accent-sky-600 cursor-pointer w-4 h-4"
                      />
                    </td>

                    {/* ID & Zone */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {item.profileName || item.id}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'online'
                              ? 'bg-emerald-500'
                              : item.status === 'ready'
                              ? 'bg-slate-400'
                              : 'bg-rose-500'
                          }`}
                          title={item.statusLabel || item.status}
                        ></span>
                      </div>
                      <div className="flex flex-col items-start gap-1 mt-1">
                        <span className="inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                          {item.zoneName || 'Phân khu'}
                        </span>
                        {item.assignedComputers && item.assignedComputers.length > 0 && (
                          <span className="font-mono text-[10px] text-slate-500 font-medium">
                            {item.assignedComputers.length} máy ({item.assignedComputers.slice(0, 2).join(', ')}{item.assignedComputers.length > 2 ? '...' : ''})
                          </span>
                        )}
                      </div>
                    </td>

                    <ComponentSpecCell icon={Cpu} title={item.cpu?.model} subText={item.cpu?.specs} />
                    <ComponentSpecCell icon={MemoryStick} title={item.ram?.capacity} subText={item.ram?.specs} />
                    <ComponentSpecCell icon={Gamepad2} title={item.gpu?.model} subText={item.gpu?.edition} />
                    <ComponentSpecCell icon={HardDrive} title={item.storage?.type} subText={item.storage?.specs} truncateSub />

                    <td className="py-3.5 px-4 text-center min-w-[150px] whitespace-nowrap">
                      <StatusToggle
                        item={item}
                        isToggling={togglingId === item.id}
                        onToggleActive={onToggleActive}
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                      <RowActions
                        item={item}
                        onOpenTelemetry={onOpenTelemetry}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Reusable Dynamic Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={specs.length}
        pageSize={pageSize}
        pageSizeOptions={[8, 10, 20, 50]}
        selectedCount={selectedIds.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        itemLabel="cấu hình máy"
      />
    </div>
  );
}
