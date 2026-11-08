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
import AmountInputModal from '../../features/transactions/ui/AmountInputModal';
import dashboardService from '../../shared/api/dashboard.service';
import machineService from '../../shared/api/machine.service';
import { CheckCircle2, AlertCircle, RotateCw, Power, LogOut, Info, Lock, Unlock, ArrowRightLeft, Wallet, Coins, Gift, CreditCard } from 'lucide-react';
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
    const [contextMenu, setContextMenu] = useState(null);
    const [balanceModal, setBalanceModal] = useState({ isOpen: false, action: 'TOPUP', station: null });

    const showGlobalToast = (text, isError = false) => {
        setToastMessage({ text, isError });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const openBalanceModal = (action, station) => {
        if (!station) return;
        if (!station.user && !station.member_id) {
            showGlobalToast('Máy hiện chưa có hội viên đăng nhập.', true);
            setContextMenu(null);
            return;
        }
        setBalanceModal({ isOpen: true, action, station });
        setContextMenu(null);
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

    const updateStationFromSocket = useCallback((machine) => {
        if (!machine) return;

        const matchesMachine = (station) => {
            if (!station) return false;

            // 1. So khớp ID máy / Computer ID
            const machineCompId = machine.computerId || machine.computer_id;
            const stationCompId = station.computer_id || station.computerId;
            if (machineCompId && stationCompId && Number(machineCompId) === Number(stationCompId)) {
                return true;
            }

            // 2. So khớp tên máy / machineId
            const mId = String(machine.machineId || machine.computerName || '').trim().toLowerCase();
            const sId = String(station.id || station.computer_name || '').trim().toLowerCase();
            if (mId && sId && (sId === mId || station.id === machine.machineId)) {
                return true;
            }

            // 3. So khớp địa chỉ IP
            const socketIp = String(machine.localIp || '').trim().toLowerCase();
            const stationIp = String(station.ip || station.ip_address || '').trim().toLowerCase();
            if (socketIp && stationIp && socketIp === stationIp) {
                return true;
            }

            // 4. So khớp địa chỉ MAC
            const socketMac = String(machine.macAddress || '').replace(/[:-]/g, '').trim().toLowerCase();
            const stationMac = String(station.mac_address || station.macAddress || '').replace(/[:-]/g, '').trim().toLowerCase();
            if (socketMac && stationMac && socketMac === stationMac) {
                return true;
            }

            return false;
        };

        const updateStation = (station) => {
            if (!matchesMachine(station)) return station;

            const status = String(machine.status || station.status || 'OFFLINE').toUpperCase();
            const typeMap = {
                ONLINE: 'ready',
                IN_USE: machine.isRemote ? 'cloud' : 'local',
                OFFLINE: 'off',
                LOCKED: 'locked',
                MAINTENANCE: 'maint',
                REMOTE: 'cloud'
            };

            return {
                ...station,
                status,
                type: typeMap[status] || station.type,
                user: machine.currentUser || (status === 'ONLINE' ? null : station.user),
                userName: machine.currentUser || (status === 'ONLINE' ? null : station.userName),
                member_id: machine.memberId !== undefined ? machine.memberId : station.member_id,
                sessionStartedAt: machine.sessionStartedAt !== undefined ? machine.sessionStartedAt : station.sessionStartedAt,
                remainingMinutes: machine.remainingMinutes !== undefined
                    ? machine.remainingMinutes
                    : (status === 'ONLINE' || status === 'OFFLINE' ? null : station.remainingMinutes),
                real_balance: machine.realBalance !== undefined ? machine.realBalance : station.real_balance,
                bonus_balance: machine.bonusBalance !== undefined ? machine.bonusBalance : station.bonus_balance,
                hasActiveCombo: machine.hasActiveCombo !== undefined ? machine.hasActiveCombo : station.hasActiveCombo,
                ip: station.ip || machine.localIp,
                ip_address: station.ip_address || machine.localIp,
                mac_address: station.mac_address || machine.macAddress,
                performance: machine.performance || station.performance,
                telemetry: machine.performance
                    ? `CPU ${Number(machine.performance.cpuUsage || 0).toFixed(1)}% • RAM ${Number(machine.performance.ramUsage || 0).toFixed(1)}% • GPU ${machine.performance.gpuUsage == null ? '--' : `${Number(machine.performance.gpuUsage).toFixed(1)}%`}`
                    : station.telemetry
            };
        };

        setAllStationsList((stations) => stations.map(updateStation));
        setSelectedStation((station) => station ? updateStation(station) : station);
        setOverviewData((current) => {
            if (!current?.zones) return current;

            const updatedZones = current.zones.map((zone) => ({
                ...zone,
                stations: (zone.stations || []).map(updateStation)
            }));
            const updatedStations = updatedZones.flatMap((zone) => zone.stations || []);
            const inUse = updatedStations.filter((station) => station.status === 'IN_USE').length;
            const remote = updatedStations.filter((station) =>
                station.status === 'REMOTE' || station.type === 'cloud'
            ).length;
            const online = updatedStations.filter((station) => station.status === 'ONLINE' || station.type === 'ready').length;
            const maintenance = updatedStations.filter((station) =>
                ['MAINTENANCE', 'OFFLINE'].includes(station.status) || station.type === 'maint' || station.type === 'off'
            ).length;

            return {
                ...current,
                metrics: {
                    ...current.metrics,
                    totalStations: updatedStations.length,
                    occupancyRate: updatedStations.length
                        ? (((inUse + remote) / updatedStations.length) * 100).toFixed(1)
                        : '0.0',
                    localCount: inUse,
                    cloudCount: remote,
                    readyCount: online,
                    maintCount: maintenance
                },
                zones: updatedZones
            };
        });
    }, []);

    const handleMachinesList = useCallback((machinesList) => {
        Object.values(machinesList || {}).forEach(updateStationFromSocket);
    }, [updateStationFromSocket]);

    const handleHeartbeat = useCallback(({ localIp, performance }) => {
        if (!localIp || !performance) return;
        updateStationFromSocket({ localIp, performance });
    }, [updateStationFromSocket]);

    useMachineSocket({
        onMachinesList: handleMachinesList,
        onMachineUpdated: updateStationFromSocket,
        onHeartbeat: handleHeartbeat,
        onSessionTimeUpdated: updateStationFromSocket
    });

    useEffect(() => {
        handleMachinesList(machines);
    }, [handleMachinesList, machines]);

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

    useEffect(() => {
        const closeContextMenu = () => setContextMenu(null);
        window.addEventListener('click', closeContextMenu);
        return () => window.removeEventListener('click', closeContextMenu);
    }, []);

    const handleCommand = async (command) => {
        if (!contextMenu?.station) return;
        const station = contextMenu.station;
        const ipAddress = station.ip || station.ip_address;
        if (!ipAddress) {
            showGlobalToast('Không tìm thấy địa chỉ IP của máy.', true);
            return;
        }

        try {
            if (command === 'LOGOUT') {
                await machineService.logoutByAddress(ipAddress, station.mac_address);
            } else {
                await machineService.sendCommandByAddress(ipAddress, station.mac_address, command);
            }
            showGlobalToast(`Đã gửi lệnh ${command} tới ${station.id}.`);
        } catch (error) {
            showGlobalToast(error.message || `Không thể gửi lệnh ${command}.`, true);
        } finally {
            setContextMenu(null);
        }
    };

    const handleStationCommand = async (station, command) => {
        const ipAddress = station.ip || station.ip_address;
        if (!ipAddress) {
            throw new Error('Không tìm thấy địa chỉ IP của máy.');
        }

        if (command === 'LOGOUT') {
            await machineService.logoutByAddress(ipAddress, station.mac_address);
        } else {
            await machineService.sendCommandByAddress(ipAddress, station.mac_address, command);
        }
    };

    const handleContextStatusAction = async (status) => {
        if (!contextMenu?.station) return;
        const station = contextMenu.station;
        setContextMenu(null);
        await handleStationAction(station.computer_id, status);
    };

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
            <div className="pl-[240px]">
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
                                onContextMenu={(event, station) => {
                                    event.preventDefault();
                                    setContextMenu({ x: event.clientX, y: event.clientY, station });
                                }}
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
                                        onContextMenu={(event, station) => {
                                            event.preventDefault();
                                            setContextMenu({ x: event.clientX, y: event.clientY, station });
                                        }}
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
                onCommand={handleStationCommand}
                onSwitchStation={handleStationSwitch}
                onReload={() => loadDashboardData(false)}
                currentUser={user}
                availableStations={allStationsList}
                machines={machines}
            />

            {/* BOOTROM LOGS TECHNICAL MODAL */}
            <BootromLogModal
                isOpen={isBootromModalOpen}
                onClose={() => setIsBootromModalOpen(false)}
            />

            {/* AMOUNT INPUT MODAL FOR CONTEXT MENU ACTIONS */}
            {balanceModal.isOpen && (
                <AmountInputModal
                    isOpen={balanceModal.isOpen}
                    action={balanceModal.action}
                    station={balanceModal.station}
                    currentUser={user}
                    onClose={() => setBalanceModal({ isOpen: false, action: 'TOPUP', station: null })}
                    onSuccess={(msg) => {
                        showGlobalToast(msg);
                        loadDashboardData(false);
                    }}
                />
            )}

            {contextMenu && (
                <div
                    className="fixed z-[60] min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => { setSelectedStation(contextMenu.station); setContextMenu(null); }}>
                        <Info className="h-4 w-4" /> Thông tin máy
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleCommand('LOGOUT')}>
                        <LogOut className="h-4 w-4" /> Đăng xuất máy
                    </button>

                    {/* Giao dịch số dư tài khoản & tiền miễn phí (Bám sát ComputersScreen.cs:367-382) */}
                    {(contextMenu.station.user || contextMenu.station.member_id) && (
                        <>
                            <div className="my-1 border-t border-slate-100" />
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => openBalanceModal('TOPUP', contextMenu.station)}>
                                <Wallet className="h-4 w-4 text-emerald-600" /> Nạp tiền
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => openBalanceModal('WITHDRAW', contextMenu.station)}>
                                <Coins className="h-4 w-4 text-rose-600" /> Rút tiền
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-purple-700 hover:bg-purple-50" onClick={() => openBalanceModal('BONUS_ADD', contextMenu.station)}>
                                <Gift className="h-4 w-4 text-purple-600" /> Tặng tiền miễn phí
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50" onClick={() => openBalanceModal('BONUS_DEDUCT', contextMenu.station)}>
                                <CreditCard className="h-4 w-4 text-amber-600" /> Trừ tiền miễn phí
                            </button>
                        </>
                    )}

                    <div className="my-1 border-t border-slate-100" />
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100" onClick={() => handleCommand('RESTART')}>
                        <RotateCw className="h-4 w-4" /> Khởi động lại
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => handleCommand('SHUTDOWN')}>
                        <Power className="h-4 w-4" /> Tắt máy
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => handleContextStatusAction('ONLINE')}>
                        <Power className="h-4 w-4" /> Bật máy
                    </button>
                    <button
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        onClick={() => handleContextStatusAction(contextMenu.station.status === 'LOCKED' ? 'ONLINE' : 'LOCKED')}
                    >
                        {contextMenu.station.status === 'LOCKED' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {contextMenu.station.status === 'LOCKED' ? 'Mở khóa máy' : 'Tạm khóa máy'}
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => handleContextStatusAction('OFFLINE')}>
                        <Power className="h-4 w-4" /> Tắt trạng thái máy
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-sky-700 hover:bg-sky-50" onClick={() => { setSelectedStation(contextMenu.station); setContextMenu(null); }}>
                        <ArrowRightLeft className="h-4 w-4" /> Chuyển máy
                    </button>
                </div>
            )}
        </div>
    );
}
