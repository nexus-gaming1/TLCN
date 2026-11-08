import React from 'react';
import { Info, Monitor } from 'lucide-react';
import StationCard from '../../entities/station/ui/StationCard';

export default function ZoneSection({ zone, filter = 'all', searchQuery = '', onSelectStation, onContextMenu }) {
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

    return (
        <section className="bg-white rounded-lg p-5 border border-slate-200 shadow-flat">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                        <Monitor className="w-4 h-4" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 tracking-tight">{zone.name}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                        {zone.totalCount || zone.stations.length} máy
                    </span>
                    {zone.pricingPlan && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-mono text-[10px] font-bold border border-sky-200">
                            {zone.pricingPlan}: {zone.pricePerHour ? zone.pricePerHour.toLocaleString() : '10.000'}đ/h
                        </span>
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
