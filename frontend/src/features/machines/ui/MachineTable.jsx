import React from 'react';
import { Monitor, Eye, Edit, HardDrive, Cpu, CheckCircle, PowerOff, Wrench } from 'lucide-react';

/**
 * MachineTable component displaying complete fleet list populated directly from CSDL
 */
export default function MachineTable({
  machines = [],
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onLiveMirror,
  onEdit,
  onToggleStatus
}) {
  const isAllSelected = machines.length > 0 && selectedIds.length === machines.length;

  return (
    <div className="w-full flex flex-col">
      {/* Table Header Micro-Action Strip — đồng bộ trang Giao Dịch & Cấu Hình Máy */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-sm text-slate-900">
            Danh Sách Trạm Máy
          </span>
          <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wider">
            {machines.length} MÁY TRẠM
          </span>
        </div>

        {/* Realtime Status */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>
            Trạng thái trạm máy: <strong className="text-emerald-700 font-bold">Trực tiếp (Realtime)</strong>
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1050px]" id="machineFleetTable">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider select-none border-b-2 border-slate-300 font-extrabold">
              <th className="w-12 py-3 px-4 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded w-4 h-4 text-sky-600 accent-sky-600 focus:ring-0 cursor-pointer"
                  id="selectAllCheckbox"
                />
              </th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[200px]">Mã Máy / Địa Chỉ IP & MAC</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[160px]">Phân Khu &amp; Đơn Giá</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[300px] max-w-[340px]">Cấu Hình Phần Cứng</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 min-w-[200px]">Hội Viên / Phiên Chơi</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-center min-w-[170px] whitespace-nowrap">Trạng Thái</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-right pr-6 min-w-[130px] whitespace-nowrap">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
            {machines.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Monitor className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                    <span className="text-sm font-semibold text-slate-700">Không tìm thấy máy trạm nào</span>
                    <span className="text-xs text-slate-400">Thử thay đổi bộ lọc tìm kiếm hoặc khai báo máy mới</span>
                  </div>
                </td>
              </tr>
            ) : (
              machines.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                const statusUpper = String(m.status || '').toUpperCase();

              return (
                <tr
                  key={m.id}
                  className={`hover:bg-slate-50/80 transition-colors group ${
                    isSelected ? 'bg-sky-50/70' : ''
                  }`}
                  data-status={m.status}
                  data-zone={m.zoneId}
                >
                  {/* Checkbox */}
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect && onToggleSelect(m.id)}
                      className="row-checkbox rounded w-4 h-4 accent-sky-600 cursor-pointer"
                    />
                  </td>

                  {/* PC ID / IP & MAC Address */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-extrabold shadow-sm shrink-0">
                        {m.numericId || String(m.computer_id || '00').padStart(2, '0')}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-sm font-extrabold text-slate-900 leading-tight" title={m.id}>
                          {m.id}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              statusUpper === 'ONLINE'
                                ? 'bg-emerald-500'
                                : statusUpper === 'IN_USE'
                                ? 'bg-sky-500'
                                : statusUpper === 'MAINTENANCE'
                                ? 'bg-rose-500'
                                : statusUpper === 'LOCKED'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          ></span>
                          {m.ip || '192.168.1.100'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-normal">
                          MAC: {m.mac_address || 'F4:D4:88:5A:00:00'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Zone & Hourly Price */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 border border-slate-300/80 text-xs font-bold rounded-md">
                        <span className="material-symbols-outlined text-[15px] text-sky-700">
                          {m.zoneIcon || 'grid_view'}
                        </span>
                        {m.zoneName}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 font-extrabold">
                        {m.price_per_hour ? `${m.price_per_hour.toLocaleString()}đ/h` : '10.000đ/h'}
                      </span>
                    </div>
                  </td>

                  {/* Hardware & BootROM */}
                  <td className="py-4 px-4 max-w-[340px]">
                    <div className="flex flex-col gap-1.5 max-w-[320px]">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono font-medium text-slate-700">
                        {/* CPU */}
                        <span className="inline-flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-slate-500" />
                          {m.cpu}
                        </span>
                        <span className="text-slate-400">•</span>
                        {/* GPU */}
                        <span className="inline-flex items-center gap-1 font-bold">
                          {m.gpu}
                        </span>
                        <span className="text-slate-400">•</span>
                        {/* RAM */}
                        <span className="inline-flex items-center gap-1">
                          {m.ram}
                        </span>
                      </div>

                      {/* Hardware Spec Description */}
                      {m.specDescription && (
                        <div className="text-[10px] text-slate-600 font-semibold truncate" title={m.specDescription}>
                          {m.specDescription}
                        </div>
                      )}

                      {/* BootROM Image Status */}
                      <div className="text-[11px] font-mono flex items-center gap-1.5 text-slate-600">
                        <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[280px]" title={m.bootImage}>
                          BootROM: {m.bootImage}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* User / Session Info */}
                  <td className="py-4 px-4">
                    {m.userName ? (
                      <div className="flex items-center gap-2.5">
                        {m.userInitials && (
                          <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                            {m.userInitials}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate" title={m.userName}>
                              {m.userName}
                            </span>
                            {m.userRank && (
                              <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[10px] px-1.5 py-0.2 rounded font-extrabold shrink-0">
                                {m.userRank}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5" title={m.currentGame || m.cleanStatus}>
                            {m.currentGame || m.cleanStatus}
                          </div>
                        </div>
                      </div>
                    ) : statusUpper === 'ONLINE' || m.status === 'online' ? (
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">Sẵn sàng nạp khách</span>
                          <span className="text-[11px] text-slate-600">{m.cleanStatus}</span>
                        </div>
                      </div>
                    ) : statusUpper === 'OFFLINE' || m.status === 'offline' ? (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <PowerOff className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">Tắt nguồn</span>
                          <span className="text-[11px] text-slate-600">{m.cleanStatus}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-700">
                        <Wrench className="w-4 h-4 text-rose-600 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900">Đang bảo trì</span>
                          <span className="text-[11px] text-slate-600">{m.cleanStatus}</span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Trạng thái (với direct Toggle Switch 1-click) */}
                  <td className="py-4 px-4 text-center min-w-[170px] whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleStatus && onToggleStatus(m)}
                        role="switch"
                        aria-checked={statusUpper !== 'MAINTENANCE'}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                          statusUpper !== 'MAINTENANCE' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={statusUpper !== 'MAINTENANCE' ? 'Đang hoạt động - Click để chuyển bảo trì' : 'Đang bảo trì - Click để kích hoạt'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            statusUpper !== 'MAINTENANCE' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[11px] font-bold select-none ${
                          statusUpper !== 'MAINTENANCE' ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {statusUpper !== 'MAINTENANCE' ? 'Hoạt động' : 'Bảo trì'}
                      </span>
                    </div>
                  </td>

                  {/* Thao Tác */}
                  <td className="py-3.5 px-4 text-right pr-6 min-w-[130px] whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onLiveMirror && onLiveMirror(m.id)}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-sky-600 hover:bg-sky-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Xem màn hình từ xa (Live Mirror)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit && onEdit(m)}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                        title="Chỉnh sửa thông số / Cấu hình"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
