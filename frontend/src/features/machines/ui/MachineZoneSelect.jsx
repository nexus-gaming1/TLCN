import React from 'react';
import { Cpu } from 'lucide-react';

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

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase font-mono font-bold text-slate-600">
          Phân Khu &amp; Cấu Hình Phần Cứng *
        </label>

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
            {zones.map((z) => (
              <option key={z.zone_id} value={z.zone_id}>
                {z.zone_name} (Tier #{z.tier_level})
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedZone && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
          <Cpu className={`w-5 h-5 ${iconColor} shrink-0`} />
          <div className="flex flex-col text-[11px]">
            <span className="font-extrabold text-slate-900">{selectedZone.zone_name}</span>
            <span className="text-slate-600 font-medium leading-relaxed">
              {selectedZone.description || 'Cấu hình phần cứng khu vực.'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

