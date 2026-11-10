import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import SubHeader from '../../widgets/station-grid/SubHeader';
import KpiCards from '../../widgets/station-grid/KpiCards';
import ZoneSection from '../../widgets/station-grid/ZoneSection';
import StationListView from '../../widgets/station-grid/StationListView';
import StationDrawer from '../../features/station-drawer/ui/StationDrawer';
import BootromLogModal from '../../features/bootrom/BootromLogModal';
import dashboardService from '../../shared/api/dashboard.service';
import machineService from '../../shared/api/machine.service';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useMachines } from '../../shared/hooks/useMachines';
import { useMachineSocket } from '../../shared/hooks/useMachineSocket';
export default function AdminDashboardPage({ user, onLogout }) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name_asc');
    const [selectedStation, setSelectedStation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [overviewData, setOverviewData] = useState(null);
    const [allStationsList, setAllStationsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBootromModalOpen, setIsBootromModalOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    const showGlobalToast = (text, isError = false) => {
        setToastMessage({ text, isError });
        setTimeout(() => setToastMessage(null), 3500);
    };
const {
        data: machines = {},
        isLoading,
        isError,
    } = useMachines();
    const loadDashboardData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        const data = await dashboardService.getOverview();
        if (data) {
            setOverviewData(data);
            const flatStations = (data.zones || []).flatMap((z) => z.stations || []);
            setAllStationsList(flatStations);
        }
        if (showLoading) setLoading(false);
    }, []);
  useMachineSocket();

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedStation(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Action Handler for station status change (ONLINE, OFFLINE, LOCKED, MAINTENANCE)
    const handleStationAction = async (computerId, newStatus) => {
        // 1. Optimistic UI update for allStationsList immediately
        setAllStationsList((prevList) =>
            prevList.map((st) => {
                if (Number(st.computer_id) === Number(computerId) || st.id === computerId || st.id === `PC-${computerId}`) {
                    const typeMap = {
                        ONLINE: 'ready',
                        OFFLINE: 'off',
                        LOCKED: 'locked',
                        MAINTENANCE: 'maint',
                        IN_USE: 'local'
                    };
                    return {
                        ...st,
                        status: newStatus,
                        type: typeMap[newStatus] || st.type,
                        cleanStatus: newStatus === 'OFFLINE' ? 'Tắt nguồn' : newStatus === 'LOCKED' ? 'Tạm khóa' : st.cleanStatus
                    };
                }
                return st;
            })
        );

        // 2. Optimistic UI update for zones inside overviewData
        setOverviewData((prev) => {
            if (!prev || !prev.zones) return prev;
            const updatedZones = prev.zones.map((z) => ({
                ...z,
                stations: (z.stations || []).map((st) => {
                    if (Number(st.computer_id) === Number(computerId) || st.id === computerId || st.id === `PC-${computerId}`) {
                        const typeMap = {
                            ONLINE: 'ready',
                            OFFLINE: 'off',
                            LOCKED: 'locked',
                            MAINTENANCE: 'maint',
                            IN_USE: 'local'
                        };
                        return {
                            ...st,
                            status: newStatus,
                            type: typeMap[newStatus] || st.type,
                            cleanStatus: newStatus === 'OFFLINE' ? 'Tắt nguồn' : newStatus === 'LOCKED' ? 'Tạm khóa' : st.cleanStatus
                        };
                    }
                    return st;
                })
            }));
            return { ...prev, zones: updatedZones };
        });

        // 3. Close Drawer automatically
        setSelectedStation(null);

        try {
            await machineService.changeStatus(computerId, newStatus);
            showGlobalToast(`Đã gửi lệnh điều khiển (${newStatus}) tới máy ID #${computerId} thành công!`);
            await loadDashboardData(false);
        } catch (error) {
            showGlobalToast(error.message || 'Lỗi khi gửi lệnh điều khiển trạm máy', true);
            await loadDashboardData(false);
        }
    };

    // Action Handler for station switching
    const handleStationSwitch = async (fromId, toId, memberId) => {
        setSelectedStation(null);
        try {
            await machineService.switchStation(fromId, toId, memberId);
            showGlobalToast(`Đã chuyển phiên chơi từ máy ID #${fromId} sang máy ID #${toId} thành công!`);
            await loadDashboardData(false);
        } catch (error) {
            showGlobalToast(error.message || 'Lỗi khi thực hiện chuyển trạm máy', true);
        }
    };

    // Action Handler for Wake-on-LAN Batch Power On
    const handleTriggerWakeOnLan = async () => {
        try {
            const res = await machineService.wakeOnLan();
            showGlobalToast(res.message || 'Đã gửi gói tin Wake-on-LAN thành công!');
            await loadDashboardData(false);
        } catch (error) {
            showGlobalToast(error.message || 'Lỗi khi phát lệnh Wake-on-LAN', true);
        }
    };

    // Apply Filters & Sorting to Stations
    const getSortedFilteredStations = (stations) => {
        let list = [...stations];

        // Filter by Status
        if (filter !== 'all') {
            list = list.filter((st) => {
                if (filter === 'in_use') return st.status === 'IN_USE' || st.type === 'in_use';
                if (filter === 'ready') return st.status === 'ONLINE' || st.type === 'ready';
                if (filter === 'remote') return st.status === 'REMOTE' || st.type === 'remote';
                if (filter === 'maint') return st.status === 'MAINTENANCE' || st.type === 'maint';
                return true;
            });
        }

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (st) =>
                    st.id?.toLowerCase().includes(q) ||
                    st.user?.toLowerCase().includes(q) ||
                    st.game?.toLowerCase().includes(q) ||
                    st.ip_address?.includes(q)
            );
        }

        // Sorting
        list.sort((a, b) => {
            if (sortBy === 'name_asc') {
                return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
            }
            if (sortBy === 'status') {
                const priority = { ONLINE: 1, ready: 1, IN_USE: 2, in_use: 2, LOCKED: 3, locked: 3, MAINTENANCE: 4, maint: 4, OFFLINE: 5, off: 5 };
                return (priority[a.status] || 9) - (priority[b.status] || 9);
            }
            if (sortBy === 'zone') {
                return (a.zone_id || 1) - (b.zone_id || 1);
            }
            return 0;
        });

        return list;
    };

    const metrics = overviewData?.metrics;
    const zones = overviewData?.zones || [];
    const sortedGlobalList = getSortedFilteredStations(allStationsList);

    return (
        <div className="bg-[#F8F9FA] font-sans text-slate-800 antialiased min-h-screen relative">
            {/* Global Toast Notification */}
            {toastMessage && (
                <div
                    className={`fixed top-20 right-6 z-50 p-4 rounded-xl border font-bold text-xs flex items-center gap-2.5 shadow-xl animate-in slide-in-from-right duration-200 ${
                        toastMessage.isError
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                >
                    {toastMessage.isError ? (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* TOP UNIFIED HEADER */}
            <Header
                user={user}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                metrics={metrics}
                onLogout={onLogout}
            />

            {/* LEFT UNIFIED SIDEBAR */}
            <Sidebar role="ADMIN" />

            {/* MAIN CONTENT WRAPPER */}
            <div className="lg:pl-[240px]">
                <main className="w-full pt-16 min-h-screen bg-[#F8F9FA] pb-20">
                    <section className="p-6 bg-white border-b border-slate-200/80">
                        <SubHeader
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            onOpenBootromLogs={() => setIsBootromModalOpen(true)}
                            onTriggerWakeOnLan={handleTriggerWakeOnLan}
                        />

                        <KpiCards
                            metrics={metrics}
                            filter={filter}
                            setFilter={setFilter}
                        />
                    </section>

                    <div className="p-6 space-y-6">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 font-mono text-xs">
                                ⏳ Đang nạp dữ liệu trạm máy từ CSDL Sequelize...
                            </div>
                        ) : viewMode === 'list' ? (
                            /* EXCEL-LIKE LIST VIEW */
                            <StationListView
                                stations={sortedGlobalList}
                                onSelectStation={(st) => setSelectedStation(st)}
                                onAction={handleStationAction}
                                onSwitchModalOpen={(st) => setSelectedStation(st)}
                            />
                        ) : (
                            /* GRID VIEW BY ZONES */
                            zones.map((zone) => {
                                const zoneStations = getSortedFilteredStations(zone.stations || []);
                                return (
                                    <ZoneSection
                                        key={zone.id || zone.zone_id}
                                        zone={{ ...zone, stations: zoneStations }}
                                        filter={filter}
                                        searchQuery={searchQuery}
                                        onSelectStation={(st) => setSelectedStation(st)}
                                    />
                                );
                            })
                        )}
                    </div>
                </main>
            </div>

            {/* FIXED UNIFIED FOOTER */}
            <Footer metrics={metrics} />

            {/* FEATURE DRAWER */}
            <StationDrawer
                station={selectedStation}
                isOpen={!!selectedStation}
                onClose={() => setSelectedStation(null)}
                onAction={handleStationAction}
                onSwitchStation={handleStationSwitch}
                availableStations={allStationsList}
                machines= {machines}
            />

            {/* BOOTROM LOGS TECHNICAL MODAL */}
            <BootromLogModal
                isOpen={isBootromModalOpen}
                onClose={() => setIsBootromModalOpen(false)}
            />
        </div>
    );
}
