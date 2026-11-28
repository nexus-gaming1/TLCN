
import React, { useState, useEffect } from 'react';
import { Monitor, RefreshCw, Search } from 'lucide-react';

import { useStations } from '../../shared/hooks/useRemoteMachine';
import { findPricingPlan } from '../../shared/utils/pricing';
import { socket, connectSocket } from '../../shared/socket/socket';
import UserStationCard from '../../entities/station/ui/UserStationCard';
import RentalModal from '../../entities/station/ui/RentalModal';
import CustomerLayout from '../../widgets/layouts/customer/CustomerLayout';

export default function RentalPage() {
    const {
        data: stations = [],
        isLoading,
        isError,
        error,
        refetch,
        isFetching
    } = useStations();

    const [selectedStation, setSelectedStation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Lắng nghe socket để cập nhật trạng thái máy realtime
    useEffect(() => {
        connectSocket();

        const handleRealtimeUpdate = () => {
            refetch();
        };

        socket.on('machine:updated', handleRealtimeUpdate);
        socket.on('machine:status', handleRealtimeUpdate);
        socket.on('remote:pairing:cancelled', handleRealtimeUpdate);
        socket.on('remote:pairing:started', handleRealtimeUpdate);

        return () => {
            socket.off('machine:updated', handleRealtimeUpdate);
            socket.off('machine:status', handleRealtimeUpdate);
            socket.off('remote:pairing:cancelled', handleRealtimeUpdate);
            socket.off('remote:pairing:started', handleRealtimeUpdate);
        };
    }, [refetch]);

    // Select station for rental
    const handleSelectStation = (station) => {
        if (station.status !== 'ONLINE') return;

        const applicablePlan = findPricingPlan(station, new Date(), 'REMOTE');
        if (!applicablePlan) return;

        setSelectedStation(station);
    };

    // Filter stations by name or zone
    const keyword = searchQuery.trim().toLowerCase();

    const filteredStations = stations.filter((station) => {
        const computerName = station.computer_name?.toLowerCase() || '';
        const zoneName = station.ComputerZone?.zone_name?.toLowerCase() || '';

        return (
            computerName.includes(keyword) ||
            zoneName.includes(keyword)
        );
    });

    return (
        <CustomerLayout>
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-7xl mx-auto">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">
                                Thuê máy từ xa
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Chọn máy và kết nối để bắt đầu trải nghiệm.
                            </p>
                        </div>

                        <button
                            onClick={() => refetch() }
                            disabled={isFetching}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={isFetching ? 'animate-spin' : ''}
                            />
                            Làm mới
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-sm mb-6">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm theo tên máy hoặc khu vực..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-sky-400"
                        />
                    </div>

                    {/* Station count */}
                    {!isLoading && !isError && (
                        <div className="flex items-center gap-2 mb-4">
                            <Monitor size={17} className="text-slate-500" />
                            <span className="text-sm font-bold text-slate-700">
                                {filteredStations.length} máy
                            </span>
                        </div>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex justify-center py-20 text-slate-500">
                            Đang tải danh sách máy...
                        </div>
                    )}

                    {/* Error */}
                    {isError && (
                        <div className="text-center py-16">
                            <p className="text-sm text-rose-600 mb-3">
                                {error?.message || 'Không thể tải danh sách máy.'}
                            </p>

                            <button
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="text-sm font-bold text-sky-600 hover:underline"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Empty */}
                    {!isLoading && !isError && filteredStations.length === 0 && (
                        <div className="flex flex-col items-center py-20 text-slate-400">
                            <Monitor size={40} className="mb-3" />
                            <p className="font-bold">
                                {keyword
                                    ? 'Không tìm thấy máy nào'
                                    : 'Chưa có máy cho thuê từ xa'}
                            </p>
                            <p className="text-sm mt-1">
                                Vui lòng thử từ khóa khác.
                            </p>
                        </div>
                    )}

                    {/* Station list */}
                    {!isLoading && !isError && filteredStations.length > 0 && (
                        <div className="flex flex-wrap gap-4">
                            {filteredStations.map((station) => (
                                <UserStationCard
                                    key={station.computer_id}
                                    station={station}
                                    onClick={handleSelectStation}
                                />
                            ))}
                        </div>
                    )}

                    {/* Rental modal */}
                    <RentalModal
                        station={selectedStation}
                        isOpen={!!selectedStation}
                        onClose={() => {
                            setSelectedStation(null);
                            refetch();
                        }}
                    />

                </div>
            </div>
        </CustomerLayout>
    );
}
