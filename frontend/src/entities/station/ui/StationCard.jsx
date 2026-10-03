import React from 'react';
import { User, Cloud, Power, Wrench, Clock, Thermometer, Wifi, Lock } from 'lucide-react';
import { STATION_TYPES } from '../../../shared/constants/stationConstants';

const typeIconMap = {
    local: User,
    cloud: Cloud,
    ready: Power,
    maint: Wrench,
    off: Power,
    locked: Lock
};

export default function StationCard({ station, onClick }) {
    if (!station) return null;

    const statusUpper = String(station.status || '').toUpperCase();
    const isOffline = statusUpper === 'OFFLINE' || station.type === 'off';
    const isMaint = statusUpper === 'MAINTENANCE' || station.type === 'maint';
    const isLocked = statusUpper === 'LOCKED' || station.type === 'locked';
    const isOnlineReady = (statusUpper === 'ONLINE' || station.type === 'ready') && !station.user;

    const currentType = isOffline ? 'off' : isMaint ? 'maint' : isLocked ? 'locked' : isOnlineReady ? 'ready' : (station.type || 'local');

    const typeDef = STATION_TYPES[currentType] || {
        label: isOffline ? 'Tắt Nguồn' : isMaint ? 'Bảo Trì' : isLocked ? 'Tạm Khóa' : 'Sẵn Sàng',
        bg: isOffline ? 'bg-slate-100' : isMaint ? 'bg-rose-100' : isLocked ? 'bg-amber-100' : 'bg-emerald-100',
        text: isOffline ? 'text-slate-600' : isMaint ? 'text-rose-950' : isLocked ? 'text-amber-950' : 'text-emerald-950',
        border: isOffline ? 'border-slate-300' : isMaint ? 'border-rose-300' : isLocked ? 'border-amber-300' : 'border-emerald-300'
    };
    
    const IconComponent = typeIconMap[currentType] || Power;
    const isNonSession = isOffline || isMaint || isLocked || isOnlineReady || !station.user;

    const tooltipText = `Máy ${station.id} • ${
        station.user
            ? `Tài khoản: ${station.user} (${station.game || 'Game'})`
            : isOffline
            ? 'Đã tắt nguồn (Offline)'
            : isMaint
            ? 'Đang kiểm tra bảo trì'
            : isLocked
            ? 'Trạm đang tạm khóa'
            : 'Sẵn sàng phục vụ khách'
    }`;

    return (
        <div
            onClick={() => onClick && onClick(station)}
            title={tooltipText}
            className="cursor-pointer group rounded-xl p-3 bg-white border border-slate-200/80 shadow-sm hover:shadow hover:border-sky-300 transition-all duration-200 flex flex-col justify-between w-40"
        >
            <div className="flex flex-col gap-2">
                {/* Top Row: ID & Icon */}
                <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-sm font-black text-slate-900" title={`Mã số máy: ${station.id}`}>
                        {station.id}
                    </span>
                    <button 
                        className="p-1 -mt-1 -mr-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                        title="Thao tác"
                        onClick={(e) => { e.stopPropagation(); onClick && onClick(station); }}
                    >
                        <IconComponent className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Status Row */}
                <div className="flex items-center gap-1.5">
                    {isOffline ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                            <span className="text-[12px] font-bold text-slate-600">Tắt nguồn</span>
                        </>
                    ) : isMaint ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                            <span className="text-[12px] font-bold text-rose-600">Bảo trì</span>
                        </>
                    ) : isLocked ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                            <span className="text-[12px] font-bold text-amber-600">Tạm khóa</span>
                        </>
                    ) : isOnlineReady ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                            <span className="text-[12px] font-bold text-emerald-600">Sẵn sàng</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                            <span className="text-[12px] font-bold text-sky-600">Đang chơi</span>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Row / Middle: User Info (Only if active session) */}
            {!isNonSession && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex-1 flex flex-col justify-end">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 truncate leading-tight" title={`Tên người dùng: ${station.user}`}>
                                {station.user}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate font-semibold mt-0.5" title={`Ứng dụng/Game: ${station.game || 'League of Legends'}`}>
                                {station.game || 'League of Legends'}
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                                <Clock className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                                {station.time || '0h 0m'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-50 text-slate-700 border border-slate-200 truncate">
                                {station.latency ? (
                                    <>
                                        <Wifi className="w-3 h-3 shrink-0 text-sky-600" strokeWidth={2.5} />
                                        {station.latency}
                                    </>
                                ) : (
                                    <>
                                        <Thermometer className="w-3 h-3 shrink-0 text-slate-500" strokeWidth={2.5} />
                                        {station.telemetry ? station.telemetry.split('•')[0].trim() : '38°C'}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
