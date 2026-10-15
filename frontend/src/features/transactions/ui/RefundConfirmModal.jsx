import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function RefundConfirmModal({ isOpen, onClose, onSubmit, transaction }) {
    const [reason, setReason] = useState(' Nhầm lẫn');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !transaction) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(transaction, reason);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        Xác nhận hoàn tiền
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-sm text-rose-700">
                        Bạn đang yêu cầu hoàn tiền cho giao dịch <strong>{transaction.txnCode}</strong> của <strong>{transaction.memberName}</strong>.
                        Hành động này không thể hoàn tác.
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lý do hoàn tiền <span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !reason.trim()}
                            className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Hoàn Tiền'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
