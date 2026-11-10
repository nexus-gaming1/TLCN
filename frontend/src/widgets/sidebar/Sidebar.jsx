import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, UserCheck, Cpu, Gamepad2, BarChart3, Sliders, Tag, Receipt, Coffee, X } from 'lucide-react';

export default function Sidebar({ activeNav = 'grid', setActiveNav }) {
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => setMobileOpen((prev) => !prev);
        window.addEventListener('nexus:toggle-sidebar', handleToggle);
        return () => window.removeEventListener('nexus:toggle-sidebar', handleToggle);
    }, []);

    const navItems = [
        { id: 'grid', label: 'Sơ đồ phòng máy', icon: LayoutGrid, path: '/admin' },
        { id: 'members', label: 'Hội viên', icon: UserCheck, path: '/admin/members' },
        { id: 'hardware', label: 'Danh sách máy', icon: Cpu, path: '/admin/machines' },
        { id: 'config', label: 'Cấu hình máy', icon: Sliders, path: '/admin/config' },
        { id: 'promotions', label: 'Bảng giá & Giờ vàng', icon: Tag, path: '/admin/pricing-plans' },
        { id: 'transactions', label: 'Giao dịch', icon: Receipt, path: '/admin/transactions' },
        { id: 'catalog', label: 'Dịch vụ (F&B)', icon: Coffee, path: '/admin/catalog' },
        { id: 'games', label: 'Kho game & BootROM', icon: Gamepad2, path: '/admin/games' },
        { id: 'reports', label: 'Báo cáo doanh thu', icon: BarChart3, path: '/admin/reports' },
    ];

    const handleNavClick = (item, e) => {
        e.preventDefault();
        if (setActiveNav) setActiveNav(item.id);
        setMobileOpen(false);
        if (item.path) {
            navigate(item.path);
        }
    };

    return (
        <>
            {/* Mobile backdrop overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed left-0 top-0 h-full w-[240px] bg-white border-r border-slate-200/80 z-30 flex flex-col pt-16 pb-4 transition-transform duration-200 ease-in-out ${
                    mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="px-5 py-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-slate-400 font-semibold">
                        ĐIỀU HÀNH &amp; PHÂN KHU
                    </span>
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Đóng menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = (activeNav || 'grid') === item.id;
                        return (
                            <a
                                key={item.id}
                                href={item.path || '#'}
                                onClick={(e) => handleNavClick(item, e)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all ${isActive
                                        ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200/80 shadow-xs'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                    }`}
                            >
                                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} strokeWidth={2.2} />
                                <span className="truncate">{item.label}</span>
                            </a>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
