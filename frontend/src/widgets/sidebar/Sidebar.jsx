import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, UserCheck, Cpu, Gamepad2, BarChart3, Sliders, Tag, Receipt, Coffee, Store, X } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';

export default function Sidebar({ activeNav, setActiveNav }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => setMobileOpen((prev) => !prev);
        window.addEventListener('nexus:toggle-sidebar', handleToggle);
        return () => window.removeEventListener('nexus:toggle-sidebar', handleToggle);
    }, []);

    const isStaff = role === 'STAFF' || role === 'EMPLOYEE';

    // 1. Menu cho Nhân Viên (STAFF): Chỉ các chức năng được phép tại phòng máy
    const staffNavItems = [
        { id: 'grid', label: 'Sơ đồ phòng máy', icon: LayoutGrid, path: '/admin' },
        { id: 'pos', label: 'Quầy Thu Ngân dịch vụ F&B', icon: Store, path: '/staff' },
        { id: 'members', label: 'Quản lý hội viên', icon: UserCheck, path: '/admin/members' },
        { id: 'transactions', label: 'Sổ cái giao dịch', icon: Receipt, path: '/admin/transactions' },
        { id: 'reports', label: 'Báo cáo doanh thu', icon: BarChart3, path: '/admin/reports' },
    ];

    // 2. Menu cho Quản Trị Viên (ADMIN): Đầy đủ toàn quyền
    const adminNavItems = [
        { id: 'grid', label: 'Sơ đồ phòng máy', icon: LayoutGrid, path: '/admin' },
        { id: 'members', label: 'Hội viên', icon: UserCheck, path: '/admin/members' },
        { id: 'hardware', label: 'Danh sách máy', icon: Cpu, path: '/admin/machines' },
        { id: 'config', label: 'Cấu hình máy', icon: Sliders, path: '/admin/config' },
        { id: 'promotions', label: 'Bảng giá & Giờ vàng', icon: Tag, path: '/admin/pricing-plans' },
        { id: 'transactions', label: 'Giao dịch', icon: Receipt, path: '/admin/transactions' },
        { id: 'catalog', label: 'Quản lý dịch vụ F&B', icon: Coffee, path: '/admin/catalog' },
        { id: 'games', label: 'Kho game & BootROM', icon: Gamepad2, path: '/admin/games' },
        { id: 'reports', label: 'Báo cáo doanh thu', icon: BarChart3, path: '/admin/reports' },
    ];
    
    const navItems = isStaff ? staffNavItems : adminNavItems;

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
                        {isStaff ? 'NGHIỆP VỤ CA TRỰC' : 'ĐIỀU HÀNH & PHÂN KHU'}
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
                        const isActive = activeNav
                            ? activeNav === item.id
                            : (location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)));
                        return (
                            <a
                                key={item.id}
                                href={item.path || '#'}
                                onClick={(e) => handleNavClick(item, e)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all ${
                                    isActive
                                        ? 'bg-cyan-50 text-cyan-700 font-bold border border-cyan-200/80 shadow-xs'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                                }`}
                            >
                                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`} strokeWidth={2.2} />
                                <span className="truncate">{item.label}</span>
                            </a>
                        );
                    })}
                </nav>
                {isStaff && (
                    <div className="p-3 mx-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
                        <p className="font-bold text-slate-700">Trạm thu ngân: #01</p>
                        <p className="text-[11px] font-mono">Ca trực: 07:00 - 15:00</p>
                    </div>
                )}
            </aside>
        </>
    );
}
