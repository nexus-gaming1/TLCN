import React, { useState } from 'react';
import { Bell, Send, X, AlertCircle } from 'lucide-react';

export default function SendNotificationModal({ isOpen, onClose, station, onSend }) {
    const isBroadcast = !station;
    const [title, setTitle] = useState(isBroadcast ? 'Thông báo toàn phòng máy' : 'Thông báo từ Quản trị viên');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('SYSTEM');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            setError('Vui lòng nhập nội dung thông báo');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await onSend({
                machineId: station ? (station.computer_name || station.id || station.computer_id) : null,
                title: title.trim() || (isBroadcast ? 'Thông báo toàn phòng máy' : 'Thông báo từ Quản trị viên'),
                message: message.trim(),
                type
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Không thể gửi thông báo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${isBroadcast ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                {isBroadcast ? 'Gửi thông báo tới TẤT CẢ máy' : `Gửi thông báo tới ${station.name || station.computer_name || 'Máy trạm'}`}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {isBroadcast ? 'Tất cả các máy đang kết nối sẽ nhận được' : `Người dùng tại ${station.ip || station.ip_address || 'máy'} sẽ nhận được`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Loại thông báo */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loại thông báo</label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            {[
                                { id: 'SYSTEM', label: 'Hệ thống', color: 'border-slate-300 text-slate-700' },
                                { id: 'WARNING', label: 'Cảnh báo', color: 'border-amber-300 text-amber-700' },
                                { id: 'URGENT', label: 'Khẩn cấp', color: 'border-rose-300 text-rose-700' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setType(item.id)}
                                    className={`py-2 px-3 rounded-lg border font-bold text-center transition cursor-pointer ${
                                        type === item.id
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tiêu đề */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tiêu đề</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề thông báo..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                    </div>

                    {/* Nội dung tin nhắn */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                            Nội dung thông báo <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Nhập nội dung muốn thông báo tới máy trạm..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
                            required
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>{loading ? 'Đang gửi...' : (isBroadcast ? 'Phát thông báo tất cả' : 'Gửi thông báo')}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
