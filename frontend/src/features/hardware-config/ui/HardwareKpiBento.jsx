import React from 'react';
import { Monitor, Cpu, MemoryStick, HardDrive } from 'lucide-react';

/**
 * HardwareKpiBento component
 * Renders 4 high-density bento summary cards for fleet hardware telemetry
 */
export default function HardwareKpiBento({ metrics = {} }) {
  const {
    totalMachines = 120,
    activeZones = 4,
    availability = '100%',
    topGpuRatio = 'RTX 4090 / 4080S',
    topGpuCount = 30,
    topGpuPercent = '25%',
    avgRamRange = '32GB - 64GB',
    ramSpeed = 'DDR5 6000MHz Low-CL',
    totalRamCapacity = '4.8 TB Total',
    bootromHealth = '100% Đồng Bộ',
    sanNetwork = 'Dual SAN NVMe 40Gbps Fiber',
    ioErrors = 0
  } = metrics;

  const cards = [
    {
      id: 'fleet',
      label: 'TỔNG MÁY TRẠM FLEET',
      title: `${totalMachines} Máy Trạm`,
      icon: Monitor,
      subText: `${activeZones} Phân Khu Hoạt Động`,
      badge: `${availability} Khả dụng`,
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-200/80',
      dotColor: 'bg-sky-500',
      badgeColor: 'text-sky-700 font-bold'
    },
    {
      id: 'gpu',
      label: 'CẤU HÌNH ĐỒ HỌA ĐỈNH CAO',
      title: topGpuRatio,
      icon: Cpu,
      subText: `${topGpuCount} Nodes Thi Đấu & Stream`,
      badge: `${topGpuPercent} Hạm đội`,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
      dotColor: 'bg-indigo-500',
      badgeColor: 'text-indigo-700 font-bold'
    },
    {
      id: 'ram',
      label: 'DUNG LƯỢNG RAM TRUNG BÌNH',
      title: avgRamRange,
      icon: MemoryStick,
      subText: ramSpeed,
      badge: totalRamCapacity,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-200/80',
      dotColor: 'bg-purple-500',
      badgeColor: 'text-purple-700 font-bold'
    },
    {
      id: 'bootrom',
      label: 'DISKLESS BOOTROM HEALTH',
      title: bootromHealth,
      icon: HardDrive,
      subText: sanNetwork,
      badge: `${ioErrors} IO Errors`,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
      dotColor: 'bg-emerald-500',
      badgeColor: 'text-emerald-700 font-bold'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((c) => {
        const IconComponent = c.icon;

        return (
          <div
            key={c.id}
            className="bg-white rounded-lg p-4 sm:p-5 shadow-flat border border-slate-200 flex flex-col justify-between hover:shadow-sm transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col space-y-1 min-w-0">
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-600 font-medium">
                  {c.label}
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                  {c.title}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <span className={`w-2 h-2 rounded-full ${c.dotColor} shrink-0`}></span>
                <span className="truncate font-medium">{c.subText}</span>
              </span>
              <span className={`font-mono text-xs ${c.badgeColor} shrink-0 ml-1`}>
                {c.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
