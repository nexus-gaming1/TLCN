import React from 'react';

/**
 * MachineKpiCards component for Fleet Summary Statuses
 * Responsive grid with gap-4/gap-5 and wrap protection to prevent squishing
 */
export default function MachineKpiCards({
  metrics = {},
  selectedStatus = 'all',
  onSelectStatus
}) {
  const {
    totalMachines = 0,
    onlineCount = 0,
    onlinePercent = '0.0%',
    inUseCount = 0,
    inUsePercent = '0.0%',
    reservedCount = 0,
    reservedPercent = '0.0%',
    maintenanceCount = 0,
    maintenancePercent = '0.0%',
    offlineCount = 0,
    offlinePercent = '0.0%'
  } = metrics;

  const cards = [
    {
      id: 'online',
      title: 'Online',
      count: onlineCount,
      percent: onlinePercent,
      sub: 'Sẵn sàng đón khách',
      bgColor: 'bg-[#f0fdf4]',
      titleColor: 'text-[#15803d]',
      percentBg: 'bg-[#dcfce7]',
      percentColor: 'text-[#166534]',
      countColor: 'text-[#14532d]',
      subColor: 'text-[#166534]',
      dotBg: 'bg-[#16a34a]',
      pulse: true
    },
    {
      id: 'in-use',
      title: 'Đang Sử Dụng',
      count: inUseCount,
      percent: inUsePercent,
      sub: 'Phiên chơi đang hoạt động',
      bgColor: 'bg-[#f0f9ff]',
      titleColor: 'text-[#0369a1]',
      percentBg: 'bg-[#e0f2fe]',
      percentColor: 'text-[#075985]',
      countColor: 'text-[#0c4a6e]',
      subColor: 'text-[#075985]',
      dotBg: 'bg-[#0284c7]'
    },
    {
      id: 'reserved',
      title: 'Đặt Trước / Khóa',
      count: reservedCount,
      percent: reservedPercent,
      sub: 'Trạm bị khóa hoặc tạm dừng',
      bgColor: 'bg-[#faf5ff]',
      titleColor: 'text-[#7e22ce]',
      percentBg: 'bg-[#f3e8ff]',
      percentColor: 'text-[#6b21a8]',
      countColor: 'text-[#581c87]',
      subColor: 'text-[#6b21a8]',
      dotBg: 'bg-[#9333ea]'
    },
    {
      id: 'maintenance',
      title: 'Bảo Trì',
      count: maintenanceCount,
      percent: maintenancePercent,
      sub: 'Đang kiểm tra thiết bị',
      bgColor: 'bg-[#fff1f2]',
      titleColor: 'text-[#be123c]',
      percentBg: 'bg-[#ffe4e6]',
      percentColor: 'text-[#9f1239]',
      countColor: 'text-[#881337]',
      subColor: 'text-[#9f1239]',
      dotBg: 'bg-[#e11d48]'
    },
    {
      id: 'offline',
      title: 'Offline',
      count: offlineCount,
      percent: offlinePercent,
      sub: 'Tắt nguồn trạm máy',
      bgColor: 'bg-[#f8fafc]',
      titleColor: 'text-[#475569]',
      percentBg: 'bg-[#e2e8f0]',
      percentColor: 'text-[#334155]',
      countColor: 'text-[#1e293b]',
      subColor: 'text-[#475569]',
      dotBg: 'bg-[#64748b]'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
      {cards.map((c) => {
        const isSelected = selectedStatus === c.id;

        return (
          <div
            key={c.id}
            onClick={() => onSelectStatus && onSelectStatus(isSelected ? 'all' : c.id)}
            className={`bg-white p-4 sm:p-5 rounded-lg flex flex-col justify-between shadow-flat hover:shadow-sm transition-all cursor-pointer border ${
              isSelected ? 'ring-2 ring-sky-600 border-sky-600' : 'border-slate-200'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {c.pulse && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.dotBg} opacity-75`}></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.dotBg}`}></span>
                </span>
                <span className={`text-xs sm:text-sm font-extrabold truncate ${c.titleColor}`}>
                  {c.title}
                </span>
              </div>
              <span className={`font-mono text-[10px] sm:text-xs font-extrabold ${c.percentColor} ${c.percentBg} px-2 py-0.5 rounded-full shrink-0 ml-1`}>
                {c.percent}
              </span>
            </div>

            {/* Card Body */}
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${c.countColor}`}>
                  {c.count}
                </span>
                <span className={`text-xs font-bold ${c.subColor}`}>
                  / {totalMachines} máy
                </span>
              </div>
              <div className={`text-xs ${c.subColor} mt-1 font-semibold leading-relaxed line-clamp-2`}>
                {c.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
