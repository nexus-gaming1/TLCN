import { X, Cpu, MemoryStick, Gamepad2, HardDrive, Thermometer, Activity } from 'lucide-react';

const TELEMETRY_SPEC_ROWS = [
  {
    key: 'cpu',
    label: 'CPU Model',
    icon: Cpu,
    iconColor: 'text-sky-600',
    getValue: (hw) => hw.cpu?.model || 'Chưa thiết lập',
    valueClass: 'font-bold text-slate-900'
  },
  {
    key: 'gpu',
    label: 'Card Đồ Họa',
    icon: Gamepad2,
    iconColor: 'text-indigo-600',
    getValue: (hw) => hw.gpu?.model || 'Chưa thiết lập',
    valueClass: 'font-bold text-slate-900'
  },
  {
    key: 'ram',
    label: 'RAM Dung Lượng',
    icon: MemoryStick,
    iconColor: 'text-purple-600',
    getValue: (hw) => hw.ram?.capacity || 'Chưa thiết lập',
    valueClass: 'font-bold text-slate-900'
  },
  {
    key: 'sanPing',
    label: 'SAN BootROM Latency',
    icon: HardDrive,
    iconColor: 'text-emerald-600',
    getValue: (hw) => hw.telemetry?.sanPing ?? '0ms',
    valueClass: 'font-mono font-bold text-emerald-700'
  }
];

export default function HardwareTelemetryModal({ isOpen, onClose, hardware }) {
  if (!isOpen || !hardware) return null;

  const cpuTemp = hardware.telemetry?.cpuTemp ?? '--';
  const gpuTemp = hardware.telemetry?.gpuTemp ?? '--';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 font-bold shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                <span className="truncate">Chi Tiết Telemetry {hardware.profileName || hardware.id}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase shrink-0">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate">
                {hardware.zoneName} • {hardware.statusLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-4">
          {/* Temperatures Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-500 block uppercase">Nhiệt Độ CPU</span>
                <span className="text-xl font-mono font-extrabold text-slate-900">{cpuTemp}°C</span>
              </div>
              <Thermometer className="w-6 h-6 text-sky-600 shrink-0" />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-500 block uppercase">Nhiệt Độ GPU</span>
                <span className="text-xl font-mono font-extrabold text-slate-900">{gpuTemp}°C</span>
              </div>
              <Thermometer className="w-6 h-6 text-indigo-600 shrink-0" />
            </div>
          </div>

          {/* Specs Details */}
          <div className="space-y-2.5 pt-2">
            {TELEMETRY_SPEC_ROWS.map((row) => {
              const IconComponent = row.icon;
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/60"
                >
                  <span className="text-slate-600 font-medium flex items-center gap-2 shrink-0">
                    <IconComponent className={`w-4 h-4 ${row.iconColor}`} /> {row.label}
                  </span>
                  <span className={`${row.valueClass} text-right truncate`}>
                    {row.getValue(hardware)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
}
