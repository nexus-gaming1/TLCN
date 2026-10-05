import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, UserCheck, CreditCard, Cpu, Gamepad2, BarChart3, Settings, Sliders, Tag, Receipt, Coffee} from 'lucide-react';

export default function Sidebar({ activeNav = 'grid', setActiveNav, bootromStatus = 'ONLINE' }) {
    const navigate = useNavigate();

    const navItems = [
        { id: 'grid', label: 'Sơ Đồ Phòng Máy', icon: LayoutGrid, path: '/admin' },
        { id: 'members', label: 'Quản Lý Hội Viên', icon: UserCheck, path: '/admin/members' },
        { id: 'hardware', label: 'Quản Lý Danh Sách Máy', icon: Cpu, path: '/admin/machines' },
        { id: 'config', label: 'Cấu Hình Máy', icon: Sliders, path: '/admin/config' },
        { id: 'promotions', label: 'Quản Lý Khuyến Mãi', icon: Tag, path: '/admin/promotions' },
        { id: 'transactions', label: 'Quản Lý Giao Dịch', icon: Receipt, path: '/admin/transactions' },
        { id: 'catalog', label: 'Quản Lý Dịch Vụ (F&B)', icon: Coffee, path: '/admin/catalog' },
        { id: 'games', label: 'Kho Game & BootROM', icon: Gamepad2 },
        { id: 'reports', label: 'Báo Cáo Doanh Thu', icon: BarChart3 },
    ];

    const handleNavClick = (item, e) => {
        e.preventDefault();
        if (setActiveNav) setActiveNav(item.id);
        if (item.path) {
            navigate(item.path);
        }
    };

    return (
        <aside className="fixed left-0 top-0 h-full w-[240px] bg-white border-r border-slate-200/80 z-30 flex flex-col pt-16 pb-4">
            <div className="px-5 py-3">
                <span className="font-mono text-[10px] tracking-wider uppercase text-slate-400 font-semibold">ĐIỀU HÀNH & PHÂN KHU</span>
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
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all ${
                                isActive
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
    );
}
