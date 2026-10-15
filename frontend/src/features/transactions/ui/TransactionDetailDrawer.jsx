import React from 'react';
import { X, Receipt, Printer, RotateCcw, CheckCircle2, Clock, XCircle, User, Monitor, Calendar, ShieldCheck, FileText } from 'lucide-react';
import { printTransactionReceipt } from '../utils/receiptPrinter';

export default function TransactionDetailDrawer({ transaction, onClose, onRefund }) {
    if (!transaction) return null;

    const txnCode = transaction.txnCode || transaction.txn_code || `TXN-${String(transaction.transaction_id || transaction.id).padStart(5, '0')}`;
    const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transaction.amount || 0);

    const d = new Date(transaction.createdAt || transaction.created_at || Date.now());
    const formattedDate = d.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-bold text-slate-900">{txnCode}</span>
                        </div>
                        <span className="text-xs text-slate-500">Chi Tiết Hóa Đơn Điện Tử</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Amount Header Banner */}
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 text-center flex flex-col items-center gap-1">
                    <span className="text-xs text-sky-800 uppercase font-mono tracking-wider font-semibold">Tổng Giá Trị Giao Dịch</span>
                    <span className="font-mono text-3xl font-extrabold text-sky-700">
                        {transaction.type === 'REFUND' ? '-' : '+'}{amountStr}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã xác nhận & ghi sổ kế toán</span>
                    </span>
                </div>

                {/* Information List */}
                <div className="space-y-3 border-t border-b border-slate-100 py-4">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Hội Viên / KH:
                        </span>
                        <span className="font-semibold text-slate-900">
                            {transaction.memberName || transaction.member_name || transaction.customer_name || 'Khách Vãng Lai'}
                        </span>
                    </div>

                    {(transaction.phone || transaction.member_phone) && (
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Số Điện Thoại:</span>
                            <span className="font-mono font-medium text-slate-800">{transaction.phone || transaction.member_phone}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5" /> Trạm Máy:
                        </span>
                        <span className="font-mono font-bold text-sky-700">{transaction.computerName || transaction.computer_name || 'Quầy Thu Ngân POS'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Thời Gian:
                        </span>
                        <span className="font-mono text-slate-800">{formattedDate}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Khoản Mục:</span>
                        <span className="font-semibold text-slate-900">{transaction.category || 'Giờ Chơi & Services'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Phương Thức:</span>
                        <span className="font-semibold text-slate-900 capitalize">{transaction.paymentMethod || transaction.payment_method || 'Tiền Mặt'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> Nhân Viên Thực Hiện:
                        </span>
                        <span className="font-medium text-slate-800">{transaction.staffName || transaction.staff_name || 'Thu Ngân Quầy'}</span>
                    </div>

                    {transaction.notes && (
                        <div className="flex justify-between items-start text-xs pt-1">
                            <span className="text-slate-500 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> Ghi Chú:
                            </span>
                            <span className="font-medium text-slate-700 max-w-[200px] text-right">{transaction.notes}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                    onClick={() => printTransactionReceipt(transaction)}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                    <Printer className="w-4 h-4" />
                    <span>In Phiếu Thu</span>
                </button>

                {transaction.status === 'completed' && transaction.type !== 'REFUND' && (
                    <button
                        onClick={() => onRefund && onRefund(transaction)}
                        className="py-2.5 px-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>Hoàn Tiền</span>
                    </button>
                )}
            </div>
        </div>
    );
}
