import React from 'react';
import { Monitor, User, Cloud, Power, Wrench, DollarSign } from 'lucide-react';

export default function KpiCards({ metrics, filter, setFilter }) {
    const m = metrics || {
        totalStations: 120,
        occupancyRate: '70.0',
        localCount: 56,
        cloudCount: 28,
        readyCount: 28,
        maintCount: 8,
        shiftRevenue: 14850000
    };

    const cards = [
        {
            id: 'all',
            title: 'Tổng máy trạm',
            value: m.totalStations,
            sub: `Công suất: ${m.occupancyRate}%`,
            icon: Monitor,
            border: filter === 'all' ? 'border-slate-400 shadow-sm ring-1 ring-slate-200' : 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-slate-900 text-white'
        },
        {
            id: 'local',
            title: 'Tại quán',
            value: m.localCount,
            sub: 'Khách ngồi trực tiếp',
            icon: User,
            border: filter === 'local' ? 'border-slate-400 shadow-sm ring-1 ring-slate-200' : 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-amber-500 text-white'
        },
        {
            id: 'cloud',
            title: 'Cloud Remote',
            value: m.cloudCount,
            sub: 'Stream kết nối xa',
            icon: Cloud,
            border: filter === 'cloud' ? 'border-slate-400 shadow-sm ring-1 ring-slate-200' : 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-sky-500 text-white'
        },
        {
            id: 'ready',
            title: 'Sẵn sàng',
            value: m.readyCount,
            sub: 'Máy trống chờ kết nối',
            icon: Power,
            border: filter === 'ready' ? 'border-slate-400 shadow-sm ring-1 ring-slate-200' : 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-emerald-500 text-white'
        },
        {
            id: 'maint',
            title: 'Bảo trì',
            value: m.maintCount,
            sub: 'Đang sửa / Cập nhật',
            icon: Wrench,
            border: filter === 'maint' ? 'border-slate-400 shadow-sm ring-1 ring-slate-200' : 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-rose-500 text-white'
        },
        {
            id: 'revenue',
            title: 'Doanh thu ca',
            value: m.shiftRevenue ? m.shiftRevenue.toLocaleString() : '14.850.000',
            suffix: 'đ',
            sub: 'Cập nhật thu ngân',
            icon: DollarSign,
            border: 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-indigo-600 text-white'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {cards.map(card => {
                const IconComp = card.icon;

                return (
                    <div
                        key={card.id}
                        onClick={() => setFilter && setFilter(card.id)}
                        className={`cursor-pointer rounded-xl p-3 border ${card.border} ${card.bg} shadow-sm hover:shadow transition-all duration-200 flex flex-col justify-between`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-slate-700">
                                {card.title}
                            </span>
                            <div className={`w-8 h-8 rounded-md ${card.iconBg} flex items-center justify-center`}>
                                <IconComp className="w-4 h-4 shrink-0" />
                            </div>
                        </div>

                        <div className="mt-3 mb-1">
                            <span className={`text-2xl font-bold tracking-tight text-slate-900 font-mono ${card.suffix ? 'whitespace-nowrap' : ''}`}>
                                {card.value}
                                {card.suffix && <span className="text-sm font-medium ml-1">{card.suffix}</span>}
                            </span>
                        </div>

                        <p className="text-xs text-slate-500 font-normal truncate">
                            {card.sub}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
