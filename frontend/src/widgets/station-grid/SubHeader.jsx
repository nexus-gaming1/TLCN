import React, { useState } from 'react';
import { ArrowUpDown, Zap, Gauge, Grid, LayoutList, ChevronDown, Check } from 'lucide-react';

export default function SubHeader({
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    onOpenBootromLogs,
    onTriggerWakeOnLan
}) {
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isWolConfirmOpen, setIsWolConfirmOpen] = useState(false);
    const [wolLoading, setWolLoading] = useState(false);

    const sortOptions = [
        { id: 'name_asc', label: 'Tên trạm máy (A ➔ Z)' },
        { id: 'status', label: 'Trạng thái máy (Sẵn sàng ➔ Đang dùng)' },
        { id: 'zone', label: 'Phân khu máy (Zone 1 ➔ Zone 5)' }
    ];

    const currentSortLabel = sortOptions.find((opt) => opt.id === sortBy)?.label || 'Sắp xếp';

    const handleConfirmWol = async () => {
        setWolLoading(true);
        try {
            await onTriggerWakeOnLan();
            setIsWolConfirmOpen(false);
        } catch (error) {
            console.error('Lỗi khi kích hoạt WOL:', error);
        } finally {
            setWolLoading(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200/80">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-mono font-bold shadow-flat">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    THỜI GIAN THỰC
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
                    Sơ Đồ Phòng Máy
                </h1>
            </div>

            <div className="flex items-center gap-3">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode && setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Grid className="w-4 h-4" />
                        <span className="hidden sm:inline">Bàn Lưới</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode && setViewMode('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <LayoutList className="w-4 h-4" />
                        <span className="hidden sm:inline">Danh Sách</span>
                    </button>
                </div>

                {/* Secondary Action Toolbar */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 relative">
                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-flat transition cursor-pointer"
                        >
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-[120px]">{currentSortLabel}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {isSortOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-flat border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-400 border-b border-slate-100">
                                    Tiêu chí sắp xếp
                                </div>
                                {sortOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => {
                                            setSortBy && setSortBy(opt.id);
                                            setIsSortOpen(false);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition text-left cursor-pointer"
                                    >
                                        <span>{opt.label}</span>
                                        {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-sky-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Batch Wake-on-LAN Button */}
                    <button
                        type="button"
                        onClick={() => setIsWolConfirmOpen(true)}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-white shadow-flat transition font-bold cursor-pointer"
                        title="Phát gói tin Wake-on-LAN (WOL) bật toàn bộ máy trạm đang tắt"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Bật tất cả (WOL)</span>
                    </button>

                    {/* Bootrom Technical Log Button */}
                    <button
                        type="button"
                        onClick={() => onOpenBootromLogs && onOpenBootromLogs()}
                        className="flex items-center gap-1 px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition font-bold cursor-pointer shadow-flat"
                        title="Mở nhật ký máy chủ Bootrom iCafe/Gcafe LAN"
                    >
                        <Gauge className="w-3.5 h-3.5 text-sky-400" />
                        <span>Bootrom Log</span>
                    </button>
                </div>
            </div>

            {/* Wake-on-LAN Confirmation Modal */}
            {isWolConfirmOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-lg shadow-flat border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-2 border-b pb-3">
                            <Zap className="w-5 h-5 text-amber-500" />
                            <h4 className="font-extrabold text-slate-900 text-sm">Bật Hàng Loạt Máy (Wake-on-LAN)</h4>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Hệ thống sẽ phát tín hiệu <strong>Wake-on-LAN (WOL Broadcast)</strong> qua mạng nội bộ để bật tất cả các máy trạm đang tắt (OFFLINE) với độ trễ an toàn 2 giây giữa các máy chống sụt áp điện.
                        </p>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setIsWolConfirmOpen(false)}
                                className="flex-1 py-2 rounded-md border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                disabled={wolLoading}
                                onClick={handleConfirmWol}
                                className="flex-1 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-flat"
                            >
                                {wolLoading ? 'Đang gửi gói WOL...' : 'Xác nhận bật máy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
