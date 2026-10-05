import React, { useState, useEffect } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import ZoneSection from '../../widgets/station-grid/ZoneSection';
import StationDrawer from '../../features/station-drawer/ui/StationDrawer';
import { STATION_TYPES } from '../../shared/constants/stationConstants';
import dashboardService from '../../shared/api/dashboard.service';
import authService from '../../shared/api/auth.service';
import { LogOut, User, Wallet, Award, Gamepad2 } from 'lucide-react';

export default function MemberDashboardPage({ user, onLogout }) {
    const [filter, setFilter] = useState('all');
    const [selectedStation, setSelectedStation] = useState(null);
    const [overviewData, setOverviewData] = useState(null);
    const [loading, setLoading] = useState(true);

    const memberInfo = user?.memberProfile || {};

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const data = await dashboardService.getOverview();
            setOverviewData(data);
            setLoading(false);
        };
        loadData();
    }, []);

    const handleLogout = () => {
        authService.logout();
        if (onLogout) onLogout();
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedStation(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const metrics = overviewData?.metrics;
    const zones = overviewData?.zones || [];

    return (
        <div className="bg-[#F8F9FA] font-sans text-slate-800 min-h-screen">
            {/* Top Bar for Member Navigation */}
            <div className="bg-slate-900 text-white border-b border-slate-800 px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 text-xs">
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 text-[10px]">
                        ROLE: MEMBER
                    </span>
                    <span className="font-extrabold text-slate-200">PORTAL HỘI VIÊN NEXUS</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tài khoản chính: <strong className="text-emerald-400 font-mono">{parseFloat(memberInfo.real_balance || 0).toLocaleString('vi-VN')}đ</strong></span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>Hạng: <strong className="text-amber-300 font-bold">{memberInfo.MembershipRank?.name || 'Đồng'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-bold">{user?.full_name || 'Khách Hàng VIP'}</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold transition"
                    >
                        <LogOut className="w-3 h-3" />
                        <span>Thoát</span>
                    </button>
                </div>
            </div>

            {/* UNIFIED HEADER & SIDEBAR */}
            <Header user={user} onLogout={handleLogout} />
            <Sidebar role="MEMBER" />

            <div className="pl-[240px]">
                <main className="w-full pt-16 pb-20">

                    <section className="p-6 bg-white border-b border-slate-200/80">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                    <Gamepad2 className="w-6 h-6 text-indigo-600" />
                                    Sơ Đồ Phòng Máy & Trạm Cloud Gaming
                                </h1>
                                <p className="text-xs text-slate-500 mt-1">
                                    Chọn trạm máy trống để kích hoạt phiên chơi Cloud độ trễ siêu thấp 1.1ms
                                </p>
                            </div>
                        </div>

                        {/* KPI & FILTER BUTTONS */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                            <button
                                onClick={() => setFilter('all')}
                                className={`p-4 text-left rounded-xl border shadow-xs transition-all ${filter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}
                            >
                                <span className={`text-[11px] font-bold uppercase ${filter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Tất Cả Trạm Máy</span>
                                <div className="mt-2 text-2xl font-extrabold font-mono">{metrics?.totalStations || 120}</div>
                            </button>

                            {Object.values(STATION_TYPES).map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setFilter(type.id)}
                                    className={`p-4 text-left rounded-xl border shadow-xs transition-all ${type.bg} ${filter === type.id ? 'ring-2 ring-offset-1 ring-sky-500' : type.border}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[11px] font-bold uppercase ${type.text}`}>{type.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* RENDERING ZONES */}
                    <div className="p-6 space-y-6">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 font-mono text-xs">
                                ⏳ Đang tải dữ liệu trạm máy...
                            </div>
                        ) : (
                            zones.map((zone) => (
                                <ZoneSection
                                    key={zone.id || zone.zone_id}
                                    zone={zone}
                                    filter={filter}
                                    onSelectStation={(st) => setSelectedStation(st)}
                                />
                            ))
                        )}
                    </div>
                </main>
            </div>

            <Footer metrics={metrics} />

            {/* DRAWER MODAL */}
            <StationDrawer
                station={selectedStation}
                isOpen={!!selectedStation}
                onClose={() => setSelectedStation(null)}
            />
        </div>
    );
}
