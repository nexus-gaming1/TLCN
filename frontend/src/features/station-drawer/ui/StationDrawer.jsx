import React, { useState } from 'react';
import { X, Power, Lock, Unlock, ArrowRightLeft, Clock, User, Gamepad2, Cpu, CheckCircle2, AlertCircle, MemoryStick, HardDrive, MonitorCog, RotateCw, LogOut, Wallet, Coins, Gift, CreditCard } from 'lucide-react';
import { STATION_TYPES } from '../../../shared/constants/stationConstants';
import AmountInputModal from '../../transactions/ui/AmountInputModal';

export default function StationDrawer({ station, isOpen, onClose, onAction, onCommand, onSwitchStation, onReload, currentUser, availableStations, machines = [] }) {
    const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [amountModalAction, setAmountModalAction] = useState(null);
    if (!station || !isOpen) return null;
    console.log('Station Data:', station);
    const currentMachine = Object.values(machines).find(
        machine => String(machine.localIp || '').trim().toLowerCase()
            === String(station?.ip || station?.ip_address || '').trim().toLowerCase()
    );

    const currentStatusUpper = String(station.status || '').toUpperCase();
    const isOffline = currentStatusUpper === 'OFFLINE';
    const isOnline = currentStatusUpper === 'ONLINE' || currentStatusUpper === 'READY';
    const isLocked = currentStatusUpper === 'LOCKED' || currentStatusUpper === 'PAUSE';
    const typeDef = STATION_TYPES[station.type] || {
        label: isOffline ? 'Tắt nguồn' : isLocked ? 'Tạm khóa' : 'Sẵn sàng',
        color: isOffline ? 'slate' : isLocked ? 'amber' : 'emerald',
        bg: isOffline ? 'bg-slate-100' : isLocked ? 'bg-amber-100' : 'bg-emerald-100',
        text: isOffline ? 'text-slate-600' : isLocked ? 'text-amber-900' : 'text-emerald-950',
        border: isOffline ? 'border-slate-300' : isLocked ? 'border-amber-300' : 'border-emerald-300'
    };

    const showToast = (msg, isError = false) => {
        setToastMessage({ text: msg, isError });
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handlePowerAction = async (targetStatus) => {
        if (!onAction) return;
        setIsSubmitting(true);
        try {
            await onAction(station.computer_id || station.id, targetStatus);
            showToast(`Đã gửi lệnh ${targetStatus} tới máy ${station.id} thành công!`);
            // Automatically close drawer upon successful control action
            setTimeout(() => {
                onClose();
            }, 300);
        } catch (error) {
            showToast(error.message || 'Lỗi khi gửi lệnh điều khiển máy', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSwitch = async () => {
        if (!selectedTargetId) {
            showToast('Vui lòng chọn máy đích để chuyển!', true);
            return;
        }
        if (!onSwitchStation) return;

        setIsSubmitting(true);
        try {
            await onSwitchStation(station.computer_id || station.id, selectedTargetId, station.member_id);
            showToast(`Đã chuyển khách từ ${station.id} sang máy ${selectedTargetId} thành công!`);
            setIsSwitchModalOpen(false);
            onClose();
        } catch (error) {
            showToast(error.message || 'Lỗi khi thực hiện chuyển trạm máy', true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCommand = async (command) => {
        if (!onCommand) return;
        setIsSubmitting(true);
        try {
            await onCommand(station, command);
            showToast(`Đã gửi lệnh ${command} tới máy ${station.id}.`);
        } catch (error) {
            showToast(error.message || `Không thể gửi lệnh ${command}.`, true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const readyStations = availableStations.filter(
        (s) => s.computer_id !== station.computer_id && (String(s.status).toUpperCase() === 'ONLINE' || s.type === 'ready')
    );

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity duration-300">
            {/* Main Drawer Container */}
            <div
                className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Toast Notification inside Drawer */}
                {toastMessage && (
                    <div
                        className={`absolute top-4 left-4 right-4 z-50 p-3 rounded-xl border font-semibold text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${toastMessage.isError
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}
                    >
                        {toastMessage.isError ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Header Drawer */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-extrabold text-sm shadow-md">
                                {station.id}
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-800">{station.id} - Chi tiết máy</h3>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${typeDef.bg} ${typeDef.text} border ${typeDef.border}`}>
                                    {typeDef.label}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Control Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            disabled={isSubmitting || isOnline}
                            onClick={() => handlePowerAction('ONLINE')}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-200/80 font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Power className="w-4 h-4" /> Bật máy
                        </button>
                        <button
                            disabled={isSubmitting || isOffline}
                            onClick={() => handlePowerAction(isLocked ? 'ONLINE' : 'LOCKED')}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-700 border border-amber-200/80 font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            {isLocked ? 'Mở khóa máy' : 'Tạm khóa máy'}
                        </button>
                        <button
                            disabled={isSubmitting || isOffline}
                            onClick={() => setIsSwitchModalOpen(true)}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 border border-sky-200/80 font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowRightLeft className="w-4 h-4" /> Chuyển máy
                        </button>
                        <button
                            disabled={isSubmitting || isOffline}
                            onClick={() => handlePowerAction('OFFLINE')}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200/80 font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Power className="w-4 h-4" /> Tắt máy
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                            Lệnh máy trạm
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                disabled={isSubmitting || isOffline}
                                onClick={() => handleCommand('LOGOUT')}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <LogOut className="h-3.5 w-3.5" /> Đăng xuất
                            </button>
                            <button
                                disabled={isSubmitting || isOffline}
                                onClick={() => handleCommand('RESTART')}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <RotateCw className="h-3.5 w-3.5" /> Khởi động lại
                            </button>
                            <button
                                disabled={isSubmitting || isOffline}
                                onClick={() => handleCommand('SHUTDOWN')}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Power className="h-3.5 w-3.5" /> Tắt máy
                            </button>
                        </div>
                    </div>

                    {/* Balance Operations Section (Ported from ComputersScreen.cs & AmountInputForm.cs) */}
                    {(station.user || station.member_id) && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-extrabold uppercase text-slate-500 font-mono tracking-wider flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-blue-600" /> Giao Dịch Số Dư Hội Viên
                                </h4>
                                {station.hasActiveCombo && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                        Đang dùng Combo
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/70">
                                    <span className="text-[10px] font-bold text-blue-700 block uppercase">Số dư tài khoản</span>
                                    <span className="font-mono text-sm font-extrabold text-blue-700">
                                        {station.real_balance != null ? `${Number(station.real_balance).toLocaleString('vi-VN')}đ` : '--'}
                                    </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/70">
                                    <span className="text-[10px] font-bold text-purple-700 block uppercase">Số dư miễn phí</span>
                                    <span className="font-mono text-sm font-extrabold text-purple-700">
                                        {station.bonus_balance != null ? `${Number(station.bonus_balance).toLocaleString('vi-VN')}đ` : '--'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setAmountModalAction('TOPUP')}
                                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 font-bold text-xs transition cursor-pointer shadow-2xs"
                                >
                                    <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Nạp tiền
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAmountModalAction('WITHDRAW')}
                                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 border border-rose-200 font-bold text-xs transition cursor-pointer shadow-2xs"
                                >
                                    <Coins className="w-3.5 h-3.5 text-rose-600" /> Rút tiền
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAmountModalAction('BONUS_ADD')}
                                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-800 border border-purple-200 font-bold text-xs transition cursor-pointer shadow-2xs"
                                >
                                    <Gift className="w-3.5 h-3.5 text-purple-600" /> Tặng miễn phí
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAmountModalAction('BONUS_DEDUCT')}
                                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-200 font-bold text-xs transition cursor-pointer shadow-2xs"
                                >
                                    <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Trừ miễn phí
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active Session Info */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                        <h4 className="text-xs font-extrabold uppercase text-slate-400 font-mono tracking-wider">Thông Tin Phiên Sử Dụng</h4>

                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                            <span className="text-slate-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Tên người chơi:</span>
                            <span className="font-bold text-slate-800">{station.user || 'Chưa đăng nhập'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                            <span className="text-slate-500 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5 text-slate-400" /> Tựa game / Ứng dụng:</span>
                            <span className="font-bold text-slate-800">{station.game || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                            <span className="text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Thời gian đã chơi:</span>
                            <span className="font-mono font-bold text-emerald-600">{station.time || '00:00'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-500 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-slate-400" /> Telemetry / Loại node:</span>
                            <span className="font-mono text-slate-700">{station.telemetry || 'Standard Node'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200/50">
                            <span className="text-slate-500">Thời gian bắt đầu:</span>
                            <span className="font-mono text-slate-700">
                                {station.sessionStartedAt
                                    ? new Date(station.sessionStartedAt).toLocaleString('vi-VN')
                                    : '--'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-500">Thời gian còn lại:</span>
                            <span className="font-mono font-bold text-amber-700">
                                {station.remainingMinutes != null ? `${station.remainingMinutes} phút` : '--'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-500">Combo đang dùng:</span>
                            <span className="font-bold text-slate-700">{station.hasActiveCombo ? 'Có' : 'Không'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200/50">
                            <span className="text-slate-500">Địa chỉ mạng:</span>
                            <span className="font-mono text-slate-700">{station.ip || station.ip_address || '--'}</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 font-mono tracking-wider">
                        Hiệu Năng Máy
                    </h4>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-slate-400" />
                            CPU:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {currentMachine?.performance?.cpuUsage != null
                                ? `${currentMachine.performance.cpuUsage}%`
                                : '—'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <MemoryStick className="w-3.5 h-3.5 text-slate-400" />
                            RAM:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {currentMachine?.performance?.ramUsage != null
                                ? `${currentMachine.performance.ramUsage}%`
                                : '—'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                            Disk:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {currentMachine?.performance?.diskUsage != null
                                ? `${currentMachine.performance.diskUsage}%`
                                : '—'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <MonitorCog className="w-3.5 h-3.5 text-slate-400" />
                            GPU:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {currentMachine?.performance?.gpuUsage != null
                                ? `${currentMachine.performance.gpuUsage}%`
                                : '—'}
                        </span>
                    </div>
                </div>
                {/* Footer Action - Clean single close button */}
                <div className="pt-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                    >
                        Đóng cửa sổ
                    </button>
                </div>
            </div>

            {/* Switch Station Modal */}
            {isSwitchModalOpen && (
                <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5 text-sky-600" />
                                <h4 className="font-bold text-slate-800 text-sm">Chuyển Trạm Máy</h4>
                            </div>
                            <button
                                onClick={() => setIsSwitchModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600">
                            Chuyển phiên chơi hiện tại từ máy <span className="font-bold text-slate-800">{station.id}</span> sang máy rảnh khác:
                        </p>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase font-mono">Chọn máy đích (Đang Sẵn Sàng):</label>
                            <select
                                value={selectedTargetId}
                                onChange={(e) => setSelectedTargetId(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                <option value="">-- Chọn máy sẵn sàng --</option>
                                {readyStations.map((st) => (
                                    <option key={st.computer_id || st.id} value={st.computer_id || st.id}>
                                        {st.id} ({st.zone_name || 'Khu vực'} - {st.price_per_hour?.toLocaleString()}đ/h)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setIsSwitchModalOpen(false)}
                                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                disabled={isSubmitting || !selectedTargetId}
                                onClick={handleConfirmSwitch}
                                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md cursor-pointer"
                            >
                                Xác nhận chuyển
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Amount Input Modal for Balance Actions */}
            {amountModalAction && (
                <AmountInputModal
                    isOpen={Boolean(amountModalAction)}
                    action={amountModalAction}
                    station={station}
                    currentUser={currentUser}
                    onClose={() => setAmountModalAction(null)}
                    onSuccess={(msg) => {
                        showToast(msg);
                        onReload?.();
                    }}
                />
            )}
        </div>
    );
}
