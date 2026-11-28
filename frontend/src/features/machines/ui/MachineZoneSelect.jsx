import { Cpu, Plus, ShieldAlert } from 'lucide-react';

/**
 * MachineZoneSelect
 * Reusable component for Zone selection and hardware profile summary
 * Adheres to DRY principle, eliminating duplicate markup across modals.
 */
export default function MachineZoneSelect({
  zones = [],
  selectedZoneId = '',
  loadingZones = false,
  onChange,
  onOpenZoneManagement,
  onOpenCreateZone,
  name = 'zone_id',
  accentColor = 'sky'
}) {
  const selectedZone = zones.find(
    (z) => String(z.zone_id) === String(selectedZoneId) || `zone-${z.zone_id}` === String(selectedZoneId)
  ) || zones[0];

  const focusRing = accentColor === 'indigo'
    ? 'focus:ring-indigo-500/30'
    : 'focus:ring-sky-500/30';
  const iconColor = accentColor === 'indigo'
    ? 'text-indigo-600'
    : 'text-sky-600';

  const currentCount = Number(selectedZone?.computer_count || 0);
  const maxCap = selectedZone?.max_capacity !== null && selectedZone?.max_capacity !== undefined
    ? Number(selectedZone.max_capacity)
    : null;
  const isSelectedFull = maxCap !== null && currentCount >= maxCap;

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] uppercase font-mono font-bold text-slate-600">
            Phân Khu &amp; Cấu Hình Phần Cứng *
          </label>
          <div className="flex items-center gap-2">
            {onOpenCreateZone && (
              <button
                type="button"
                onClick={onOpenCreateZone}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                title="Tạo mới một phân khu phòng máy"
              >
                <Plus className="w-3 h-3" />
                <span>+ Thêm phân khu</span>
              </button>
            )}
            {onOpenZoneManagement && (
              <button
                type="button"
                onClick={onOpenZoneManagement}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Xem danh sách và cấu hình phân khu"
              >
                <span>(Quản lý)</span>
              </button>
            )}
          </div>
        </div>

        {loadingZones ? (
          <div className="px-3 py-2 bg-slate-100 rounded-xl text-slate-500 font-mono text-xs flex items-center gap-2">
            <span className="animate-spin">⏳</span> Đang tải danh sách phân khu...
          </div>
        ) : (
          <select
            name={name}
            value={selectedZoneId}
            onChange={onChange}
            className={`px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 ${focusRing} focus:outline-none cursor-pointer`}
          >
            {zones.map((z) => {
              const count = Number(z.computer_count || 0);
              const cap = z.max_capacity !== null && z.max_capacity !== undefined ? Number(z.max_capacity) : null;
              const isFull = cap !== null && count >= cap;
              const capText = cap !== null ? ` - [${count}/${cap} máy${isFull ? ' - ĐÃ ĐẦY' : ''}]` : '';

              return (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_name} (Tier #{z.tier_level}){capText}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {selectedZone && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isSelectedFull
              ? 'bg-rose-50 border-rose-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Cpu className={`w-5 h-5 ${isSelectedFull ? 'text-rose-600' : iconColor} shrink-0`} />
            <div className="flex flex-col text-[11px]">
              <span className="font-extrabold text-slate-900 flex items-center gap-2">
                <span>{selectedZone.zone_name}</span>
                {selectedZone.code_prefix && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-200/80 font-mono text-[10px] text-slate-700">
                    Prefix: {selectedZone.code_prefix}
                  </span>
                )}
              </span>
              <span className="text-slate-600 font-medium leading-relaxed">
                {selectedZone.description || 'Cấu hình phần cứng phân khu.'}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div
              className={`font-mono text-xs font-extrabold ${
                isSelectedFull ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {currentCount} / {maxCap !== null ? `${maxCap} máy` : '∞'}
            </div>
            {isSelectedFull && (
              <span className="text-[10px] font-extrabold text-rose-600 flex items-center gap-0.5 justify-end">
                <ShieldAlert className="w-3 h-3" />
                ĐÃ ĐẦY
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

