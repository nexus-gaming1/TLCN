import React, { useState, useMemo, useEffect } from 'react';
import {
  Cpu,
  MemoryStick,
  Gamepad2,
  HardDrive,
  Activity,
  Edit,
  Trash2,
  RefreshCw,
  Columns,
  Wrench,
  CheckCircle,
  PowerOff
} from 'lucide-react';
import Pagination from '../../../shared/ui/Pagination';

/**
 * High-Density Hardware Inventory Table matching manageconfig.html
 */
export default function HardwareSpecsTable({
  specs = [],
  onOpenTelemetry,
  onEdit,
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
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-sm text-slate-900">
            Danh Sách Cấu Hình Phần Cứng
          </span>
          <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wider">
            {specs.length} THIẾT BỊ
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

      {/* Scrollable High-Density Table Body */}
      <div className="w-full overflow-x-auto">
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
              <th className="py-3 px-4 font-extrabold text-slate-800 text-right pr-6 min-w-[120px]">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
            {paginatedSpecs.map((item) => {
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
                        {item.id}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.status === 'online'
                            ? 'bg-emerald-500'
                            : item.status === 'ready'
                            ? 'bg-slate-400'
                            : 'bg-rose-500'
                        }`}
                        title={item.statusLabel}
                      ></span>
                    </div>
                    <span className="inline-block mt-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                      {item.zoneName}
                    </span>
                  </td>

                  {/* CPU */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="text-slate-500 shrink-0 mt-0.5">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 leading-tight">
                          {item.cpu.model}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 font-medium mt-0.5">
                          {item.cpu.specs}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* RAM */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="text-slate-500 shrink-0 mt-0.5">
                        <MemoryStick className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 leading-tight">
                          {item.ram.capacity}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 font-medium mt-0.5">
                          {item.ram.specs}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* GPU */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="text-slate-500 shrink-0 mt-0.5">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 leading-tight">
                          {item.gpu.model}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 font-medium mt-0.5">
                          {item.gpu.edition}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Storage / BootROM */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="text-slate-500 shrink-0 mt-0.5">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 leading-tight">
                          {item.storage.type}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]" title={item.storage.specs}>
                          {item.storage.specs}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenTelemetry && onOpenTelemetry(item)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition-colors"
                        title="Xem Telemetry Nhiệt độ & Băng thông"
                      >
                        <Activity className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit && onEdit(item)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                        title="Chỉnh sửa cấu hình"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete && onDelete(item.id)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        title="Xóa cấu hình"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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
