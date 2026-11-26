import { Monitor, Settings, ShieldAlert } from 'lucide-react';
import StationCard from '../../entities/station/ui/StationCard';

export default function ZoneSection({
    zone,
    filter = 'all',
    searchQuery = '',
    onSelectStation,
    onEditZone,
    onContextMenu
}) {
    if (!zone) return null;

    const filteredStations = (zone.stations || []).filter(st => {
        const matchesFilter = filter === 'all' || st.type === filter;
        const matchesSearch = !searchQuery ||
            st.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (st.user && st.user.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (st.game && st.game.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    if (filteredStations.length === 0 && (filter !== 'all' || searchQuery)) {
        return null;
    }

    const stationCount = zone.totalCount || zone.stations?.length || 0;
    const maxCapacity = zone.maxCapacity !== undefined && zone.maxCapacity !== null
        ? Number(zone.maxCapacity)
        : (zone.max_capacity !== undefined && zone.max_capacity !== null ? Number(zone.max_capacity) : null);
    const isFull = maxCapacity !== null && stationCount >= maxCapacity;
    const capacityPercent = maxCapacity ? Math.min(100, Math.round((stationCount / maxCapacity) * 100)) : 0;

    return (
        <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-flat relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />

            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sky-600 bg-sky-50 font-bold border border-sky-100">
                        <Monitor className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>{zone.name}</span>
                        {zone.codePrefix && (
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                {zone.codePrefix}
                            </span>
                        )}
                    </h2>

                    {/* Capacity Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                        <span>
                            {stationCount} / {maxCapacity !== null ? `${maxCapacity} máy` : '∞ máy'}
                        </span>
                        {maxCapacity !== null && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                                ({capacityPercent}%)
                            </span>
                        )}
                    </div>

                    {/* Sức chứa cảnh báo */}
                    {isFull && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono text-[10px] font-extrabold border border-rose-200 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>ĐÃ ĐẦY</span>
                        </span>
                    )}

                    {zone.pricingPlan && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-mono text-[10px] font-bold border border-sky-200">
                            {zone.pricingPlan}: {zone.pricePerHour ? zone.pricePerHour.toLocaleString() : '10.000'}đ/h
                        </span>
                    )}
                </div>

                {/* Right Zone Controls: Edit Zone Gear Button */}
                <div className="flex items-center gap-3">
                    {/* Mini Capacity Progress Bar */}
                    {maxCapacity !== null && (
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        isFull
                                            ? 'bg-rose-500'
                                            : capacityPercent >= 80
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${capacityPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {onEditZone && (
                        <button
                            type="button"
                            onClick={() => onEditZone(zone)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Cấu hình phân khu & sức chứa"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden md:inline text-[11px]">Cấu hình</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                {filteredStations.map(station => (
                    <StationCard
                        key={station.id}
                        station={station}
                        onClick={(st) => onSelectStation && onSelectStation(st)}
                        onContextMenu={onContextMenu}
                    />
                ))}
            </div>
        </section>
    );
}
