import React from 'react';
import { User, Gamepad2, Clock, Monitor, ExternalLink } from 'lucide-react';
import { STATION_TYPES } from '../../shared/constants/stationConstants';

export default function StationListView({ stations = [], onSelectStation, onContextMenu }) {
    if (!stations || stations.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 font-mono text-xs bg-white rounded-2xl border border-slate-200">
                Không tìm thấy máy trạm phù hợp với bộ lọc.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100/80 text-[11px] font-mono font-bold uppercase text-slate-600 border-b border-slate-200">
                            <th className="p-3.5">Trạm Máy</th>
                            <th className="p-3.5">Phân Khu & Giá Tiền</th>
                            <th className="p-3.5">Trạng Thái</th>
                            <th className="p-3.5">Hội Viên Đang Chơi</th>
                            <th className="p-3.5">Tựa Game / Tải</th>
                            <th className="p-3.5">Thời Gian Chơi</th>
                            <th className="p-3.5">IP & Telemetry</th>
                            <th className="p-3.5 text-right">Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {stations.map((st) => {
                            const typeDef = STATION_TYPES[st.type] || {
                                label: 'Sẵn sàng',
                                bg: 'bg-slate-100',
                                text: 'text-slate-600',
                                border: 'border-slate-200'
                            };

                            return (
                                <tr key={st.computer_id || st.id} onContextMenu={(event) => onContextMenu?.(event, st)} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-3.5 font-mono font-extrabold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono shadow-xs">
                                                {st.id}
                                            </div>
                                            <span className="font-extrabold">{st.id}</span>
                                        </div>
                                    </td>

                                    <td className="p-3.5">
                                        <div className="font-bold text-slate-800">{st.zone_name || 'Khu Thường'}</div>
                                        <div className="text-[11px] font-mono text-emerald-600 font-bold">
                                            {st.price_per_hour ? `${st.price_per_hour.toLocaleString()}đ/h` : '10.000đ/h'}
                                        </div>
                                    </td>

                                    <td className="p-3.5">
                                        <span
                                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${typeDef.bg} ${typeDef.text} border ${typeDef.border}`}
                                        >
                                            {typeDef.label}
                                        </span>
                                    </td>

                                    <td className="p-3.5">
                                        {st.user ? (
                                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{st.user}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-[11px] font-normal">Chưa đăng nhập</span>
                                        )}
                                    </td>

                                    <td className="p-3.5">
                                        {st.game ? (
                                            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                                                <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>{st.game}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-[11px]">N/A</span>
                                        )}
                                    </td>

                                    <td className="p-3.5 font-mono">
                                        {st.time ? (
                                            <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{st.time}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">00:00</span>
                                        )}
                                        {st.remainingMinutes != null && (
                                            <div className="text-[11px] text-amber-700 font-bold mt-0.5">
                                                Còn {st.remainingMinutes} phút
                                                {st.hasActiveCombo ? ' (Combo)' : ''}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-3.5 font-mono text-[11px]">
                                        <div className="text-slate-800 font-semibold">{st.ip_address || '192.168.1.100'}</div>
                                        <div className="text-slate-400">{st.telemetry || 'Standard Node'}</div>
                                    </td>

                                    <td className="p-3.5 text-right">
                                        <div className="flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => onSelectStation && onSelectStation(st)}
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 transition cursor-pointer"
                                                title="Mở chi tiết Drawer"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
