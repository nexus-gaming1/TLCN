
import React from 'react';
import { Monitor, Power, Wrench, Lock, MapPin, Tag } from 'lucide-react';
import { findPricingPlan, formatCurrency } from '../../../shared/utils/pricing';

const STATUS_CONFIG = {
    ONLINE: {
        label: 'Sẵn sàng',
        color: 'text-emerald-600',
        dot: 'bg-emerald-500',
        icon: Power,
        canRent: true
    },
    OFFLINE: {
        label: 'Ngoại tuyến',
        color: 'text-slate-500',
        dot: 'bg-slate-400',
        icon: Power,
        canRent: false
    },
    IN_USE: {
        label: 'Đang được thuê',
        color: 'text-sky-600',
        dot: 'bg-sky-500',
        icon: Monitor,
        canRent: false
    },
    LOCKED: {
        label: 'Đang giữ chỗ',
        color: 'text-amber-600',
        dot: 'bg-amber-500',
        icon: Lock,
        canRent: false
    },
    MAINTENANCE: {
        label: 'Đang bảo trì',
        color: 'text-rose-600',
        dot: 'bg-rose-500',
        icon: Wrench,
        canRent: false
    }
};

export default function StationCard({ station, onClick }) {
    if (!station) return null;

    // API fields
    const id = station.computer_id;
    const name = station.computer_name || `PC-${id}`;
    const zoneName = station.ComputerZone?.zone_name || 'Khu vực thường';

    // Áp dụng logic findPricingPlan trong billingService.js
    const activePricingPlan = findPricingPlan(station, new Date(), 'REMOTE');

    const pricePerHour = activePricingPlan?.price_per_hour != null
        ? Number(activePricingPlan.price_per_hour)
        : null;

    const status = String(station.status || 'OFFLINE').toUpperCase();
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;

    // Cannot rent if no remote pricing exists
    const canRent = config.canRent && pricePerHour !== null;
    const StatusIcon = config.icon;

    return (
        <div
            onClick={() => canRent && onClick?.(station)}
            title={canRent ? 'Nhấn để thuê máy' : config.label}
            className={`
                group rounded-xl p-3 bg-white border shadow-sm
                transition-all duration-200 flex flex-col justify-between w-40
                ${canRent
                    ? 'cursor-pointer border-slate-200/80 hover:shadow hover:border-sky-300'
                    : 'cursor-not-allowed border-slate-200 opacity-75'
                }
            `}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-black text-slate-900">
                    {name}
                </span>

                <StatusIcon
                    className={`w-4 h-4 shrink-0 ${config.color}`}
                    strokeWidth={2.5}
                />
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5 mt-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
                <span className={`text-xs font-bold ${config.color}`}>
                    {config.label}
                </span>
            </div>

            {/* Details */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                    <MapPin size={12} className="shrink-0" />
                    <span className="text-[11px] font-semibold truncate">
                        {zoneName}
                    </span>
                </div>

                <div className="flex flex-col">
                    {pricePerHour !== null ? (
                        <>
                            <span className="text-lg font-black text-slate-900">
                                {formatCurrency(pricePerHour)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium truncate" title={activePricingPlan?.name || 'Theo giờ'}>
                                {activePricingPlan?.name ? `${activePricingPlan.name} • / giờ` : '/ giờ'}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">
                            Chưa có bảng giá
                        </span>
                    )}
                </div>
            </div>

            {/* Action */}
            <div
                className={`
                    mt-3 py-2 rounded-lg text-center text-xs font-bold transition-colors
                    ${canRent
                        ? 'bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white'
                        : 'bg-slate-50 text-slate-400'
                    }
                `}
            >
                {canRent ? 'Thuê máy' : 'Không khả dụng'}
            </div>
        </div>
    );
}
