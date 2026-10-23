import { Thermometer, Zap, AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * HardwareDiagnostics Peek Section matching manageconfig.html
 */
export default function HardwareDiagnostics({ diagnostics = {} }) {
  const {
    zonesTemp = [
      { name: 'Zone 1 (Thi Đấu - i9/RTX 4080S)', temp: '54°C', fan: 'Fan 62%', percentage: 58, color: 'bg-sky-500' },
      { name: 'Zone 2 (VIP Pro - i7/RTX 4070Ti)', temp: '49°C', fan: 'Fan 50%', percentage: 49, color: 'bg-indigo-500' },
      { name: 'Zone 4 (Stream Studio - Ryzen 9/RTX 4090)', temp: '58°C', fan: 'Fan 68%', percentage: 65, color: 'bg-purple-500' }
    ],
    sanThroughput = {
      current: '8.42 Gbps',
      label: 'Tải cao điểm (84 máy đang chơi)',
      gameLoadTime: '2.4 giây'
    },
    alert = {
      machineId: 'ST-02',
      title: 'Máy ST-02: Thay Keo Tản Nhiệt',
      description: 'Cảnh báo nhiệt độ CPU vượt 78°C khi chơi Cyberpunk 2077. Đã tạm tắt nhận khách.',
      schedule: 'Chủ Nhật 02:00'
    }
  } = diagnostics || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
      {/* Card 1: Temperatures */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-sky-600" />
              <span className="font-extrabold text-sm text-slate-900">
                Nhiệt Độ CPU &amp; GPU Fleet
              </span>
            </div>
            <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
              Bình thường
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Nhiệt độ trung bình toàn hệ thống đạt mức tối ưu nhờ hệ thống tản nhiệt phòng lạnh 21°C.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {zonesTemp.map((z, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 truncate max-w-[200px]" title={z.name}>{z.name}</span>
                <span className="font-mono font-bold text-sky-700">{z.temp} / {z.fan}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${z.color || 'bg-sky-500'}`}
                  style={{ width: `${z.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: BootROM SAN Throughput */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span className="font-extrabold text-sm text-slate-900">
                Băng Thông BootROM SAN
              </span>
            </div>
            <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">
              10Gbps iSCSI
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Thời gian nạp game Black Myth: Wukong, Valorant, CS2 đồng loạt dưới {sanThroughput.gameLoadTime} trên tất cả máy trạm.
          </p>
        </div>

        <div className="flex items-end justify-between gap-4 pt-2">
          <div className="flex flex-col">
            <span className="text-2xl font-black font-mono text-slate-900 leading-none">
              {sanThroughput.current}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1">
              {sanThroughput.label}
            </span>
          </div>
          <div className="w-28 h-10 pb-1">
            <svg className="w-full h-full text-indigo-600" fill="none" preserveAspectRatio="none" viewBox="0 0 120 30">
              <path
                d="M2 24 C 20 22, 35 12, 50 16 C 65 20, 80 6, 95 10 C 105 13, 112 4, 118 6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Card 3: Alert & Maintenance */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-slate-200/90 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-extrabold text-sm text-slate-900">
                Cảnh Báo Nâng Cấp &amp; Bảo Trì
              </span>
            </div>
            <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
              1 Node
            </span>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/70 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col space-y-0.5">
              <span className="text-xs font-bold text-amber-900">
                {alert.title}
              </span>
              <span className="text-[11px] text-amber-800/90 leading-normal font-medium">
                {alert.description}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Bảo dưỡng định kỳ: <strong className="text-slate-900 font-bold">{alert.schedule}</strong>
          </span>
          <button
            type="button"
            onClick={() => alert('Đang mở lịch trình bảo dưỡng định kỳ!')}
            className="text-sky-600 hover:text-sky-700 font-extrabold flex items-center gap-1 transition-colors"
          >
            <span>Xem Lịch Trình</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
