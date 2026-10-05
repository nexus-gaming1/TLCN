import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sliders, Gamepad2, ShieldCheck, LogOut, Home, ChevronDown, User, Settings } from 'lucide-react';

export default function Header({ user, searchQuery, setSearchQuery, metrics, onLogout, variant = 'full' }) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileDropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (variant === 'simple') {
        return (
            <header className="flex items-center justify-between pb-4">
                <a className="flex items-center space-x-3 group" href="#" title="NEXUS Cyber Command Home">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200">
                        <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-1.5">
                            <span className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-brand-700">NEXUS</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-200/70 uppercase tracking-widest">CLOUD</span>
                        </div>
                        <p className="text-[10px] tracking-widest text-slate-600 font-semibold uppercase">Cyber OS & Cloud Gaming</p>
                    </div>
                </a>

                <div className="flex items-center space-x-3 text-xs">
                    <div className="hidden sm:flex items-center space-x-1.5 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="font-semibold text-xs text-slate-800">VIE / VNĐ</span>
                    </div>
                    <a className="inline-flex items-center text-slate-700 hover:text-brand-600 font-medium transition-colors" href="#">
                        <span>Trở về trang chủ</span>
                        <Home className="w-3.5 h-3.5 ml-1" />
                    </a>
                </div>
            </header>
        );
    }

    const m = metrics || { totalStations: 120, localCount: 56, cloudCount: 28, readyCount: 28, maintCount: 8, shiftRevenue: 14850000 };

    return (
        <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b border-slate-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-sky-200">
                        <Gamepad2 className="w-5 h-5 shrink-0" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">NEXUS</span>
                        <span className="font-mono text-[10px] tracking-wider text-slate-400 leading-none mt-1 uppercase font-semibold">Cyber OS Cloud</span>
                    </div>
                </div>

            </div>

            {/* Central Global Search */}
            {setSearchQuery && (
                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 absolute left-3 text-slate-500" strokeWidth={2.5} />
                        <input
                            className="w-full h-9 pl-9 pr-4 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                            placeholder="Tìm kiếm máy (ESP-01, VIP-..), hội viên, IP..."
                            type="text"
                            value={searchQuery || ''}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Actions & User Profile */}
            <div className="flex items-center gap-3 flex-shrink-0">

                <button
                    className="relative p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 transition-colors"
                    title="Thông báo hệ thống">
                    <Bell className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full shadow-sm"></span>
                </button>


                {/* Admin Profile Dropdown Container */}
                <div className="relative pl-2 border-l border-slate-200" ref={profileDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsProfileOpen((prev) => !prev)}
                        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100/90 transition-all cursor-pointer group focus:outline-none"
                        title="Tùy chọn tài khoản quản trị"
                    >
                        <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-300 flex items-center justify-center text-white font-extrabold text-xs shadow-xs group-hover:scale-105 transition-transform">
                            {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'AD'}
                        </div>
                        <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[13px] font-extrabold text-slate-900 leading-tight group-hover:text-sky-700 transition-colors">
                                {user?.full_name || 'Quản Trị Viên'}
                            </span>
                            <span className="font-mono text-[10px] text-purple-700 leading-tight font-bold flex items-center gap-1 mt-0.5">
                                <ShieldCheck className="w-3 h-3 inline text-purple-700" strokeWidth={2.5} /> {user?.role || 'ADMIN'}
                            </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Header Info Inside Dropdown */}
                            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                                <p className="text-xs font-extrabold text-slate-900 truncate">
                                    {user?.full_name || 'Quản Trị Viên System'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono font-medium truncate mt-0.5">
                                    {user?.email || 'admin@nexuscyber.vn'}
                                </p>
                                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-extrabold">
                                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                                    <span>Quyền hạn: {user?.role || 'ADMIN'}</span>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="px-1.5 py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        alert(`Hồ sơ quản trị viên: ${user?.full_name || 'Quản Trị Viên'}`);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                                >
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span>Hồ Sơ Quản Trị</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        alert('Cài đặt hệ thống Cyber OS');
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Settings className="w-4 h-4 text-slate-500" />
                                    <span>Cài Đặt Hệ Thống</span>
                                </button>
                            </div>

                            {/* Logout Action */}
                            {onLogout && (
                                <div className="border-t border-slate-100 px-1.5 pt-1 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            onLogout();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-extrabold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4 text-rose-600" />
                                        <span>Đăng Xuất (Thoát)</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
