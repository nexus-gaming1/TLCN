import React, { useState } from 'react';
import {
    Copy, Check, Receipt, Printer, RotateCcw, AlertCircle,
    CheckCircle2, Clock, XCircle, Gamepad2, Utensils, Moon,
    CreditCard, QrCode, Banknote, Wallet
} from 'lucide-react';

export default function TransactionTable({
    transactions = [],
    loading = false,
    onSelectReceipt,
    onRefundTransaction,
    page = 1,
    totalPages = 1,
    onPageChange
}) {
    const [copiedId, setCopiedId] = useState(null);

    const handleCopy = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Helper functions for category badges
    const renderCategoryBadge = (category) => {
        const cat = (category || '').toUpperCase();
        switch (cat) {
            case 'MEMBER_TOPUP':
            case 'TOPUP':
            case 'NẠP GIỜ CHƠI':
            case 'PC TIME':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono text-xs font-semibold">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Nạp Giờ Chơi</span>
                    </span>
                );
            case 'SERVICE_SALE':
            case 'SERVICE_FOOD':
            case 'DỊCH VỤ F&B':
            case 'ẨM THỰC F&B':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-xs font-semibold">
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Dịch Vụ F&B</span>
                    </span>
                );
            case 'COMBO_PURCHASE':
            case 'NIGHT_COMBO':
            case 'COMBO ĐÊM':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-mono text-xs font-semibold">
                        <Moon className="w-3.5 h-3.5" />
                        <span>Combo Đêm</span>
                    </span>
                );
            case 'COMBINED':
            case 'GIỜ + F&B':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono text-xs font-semibold">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Giờ + F&B</span>
                    </span>
                );
            case 'REFUND':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-mono text-xs font-semibold">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hoàn Tiền</span>
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>{category || 'Khác'}</span>
                    </span>
                );
        }
    };

    // Helper functions for payment method
    const renderPaymentMethod = (method) => {
        const lower = (method || '').toLowerCase();
        if (lower.includes('vietqr') || lower.includes('qr')) {
            return (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium">
                    <QrCode className="w-3.5 h-3.5 text-sky-600" />
                    <span>VietQR Pro</span>
                </span>
            );
        }
        if (lower.includes('cash') || lower.includes('tiền mặt')) {
            return (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium">
                    <Banknote className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tiền Mặt (Cash)</span>
                </span>
            );
        }
        if (lower.includes('momo') || lower.includes('ví')) {
            return (
                <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium">
                    <Wallet className="w-3.5 h-3.5 text-pink-600" />
                    <span>Ví MoMo POS</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thẻ POS / Card</span>
            </span>
        );
    };

    // Helper functions for status badge
    const renderStatusBadge = (status) => {
        const lower = (status || '').toLowerCase();
        if (lower === 'completed' || lower === 'thành công' || lower === 'success') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold border border-emerald-200/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Thành công</span>
                </span>
            );
        }
        if (lower === 'pending' || lower === 'đang xử lý') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono text-xs font-semibold border border-amber-200/50">
                    <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Đang xử lý</span>
                </span>
            );
        }
        if (lower === 'refunded' || lower === 'hoàn tiền') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-mono text-xs font-semibold border border-purple-200/50">
                    <RotateCcw className="w-3 h-3 text-purple-600" />
                    <span>Hoàn tiền</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-mono text-xs font-semibold border border-red-200/50">
                <XCircle className="w-3 h-3 text-red-600" />
                <span>Thất bại</span>
            </span>
        );
    };

    // Format currency
    const formatCurrency = (amt) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt || 0);
    };

    // Format date & time
    const formatDateTime = (dateStr) => {
        if (!dateStr) return { time: '--:--', date: '--/--/----' };
        const d = new Date(dateStr);
        const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return { time, date };
    };

    // Server-side pagination means we just render what we get
    const paginatedItems = transactions;

    return (
        <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                    <thead className="border-b border-slate-200/80 bg-slate-50 text-slate-600 font-mono text-[11px] uppercase tracking-wider">
                        <tr>
                            <th className="py-3 px-4 font-semibold">Mã GD (TXN)</th>
                            <th className="py-3 px-4 font-semibold">Thời Gian</th>
                            <th className="py-3 px-4 font-semibold">Hội Viên / Khách Hàng</th>
                            <th className="py-3 px-4 font-semibold">Khoản Mục</th>
                            <th className="py-3 px-4 font-semibold">
                                <div className="flex justify-end w-full">Số Tiền</div>
                            </th>
                            <th className="py-3 px-4 font-semibold">Phương Thức</th>
                            <th className="py-3 px-4 font-semibold text-center">Trạng Thái</th>
                            <th className="py-3 px-4 font-semibold text-center">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Đang tải dữ liệu sổ cái từ CSDL MySQL...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <AlertCircle className="w-8 h-8 text-slate-300" />
                                        <span className="font-medium">Không tìm thấy giao dịch nào phù hợp với bộ lọc.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((txn) => {
                                const rowId = txn.transaction_id || txn.id;
                                const { time, date } = formatDateTime(txn.created_at || txn.createdAt);
                                const txnCode = txn.txn_code || `TXN-${String(rowId).padStart(5, '0')}`;
                                const isCopied = copiedId === rowId;

                                return (
                                    <tr key={rowId} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Mã GD */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                                                    {txnCode}
                                                </span>
                                                <button
                                                    onClick={() => handleCopy(txnCode, rowId)}
                                                    className="text-slate-400 hover:text-sky-600 transition-colors p-0.5"
                                                    title="Sao chép mã TXN"
                                                >
                                                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </td>

                                        {/* Thời Gian */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs font-semibold text-slate-800">{time}</span>
                                                <span className="text-[11px] text-slate-400">{date}</span>
                                            </div>
                                        </td>

                                        {/* Hội Viên / Khách Hàng */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shadow-xs border border-sky-200">
                                                    {(txn.member_name || txn.customer_name || 'KH').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-slate-900">
                                                            {txn.member_name || txn.customer_name || 'Khách Vãng Lai'}
                                                        </span>
                                                        {txn.member_rank && (
                                                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                                                {txn.member_rank}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                                                        <span>{txn.member_phone || txn.phone || 'POS'}</span>
                                                        {txn.computer_name && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="font-bold text-sky-600">{txn.computer_name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Khoản Mục */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {renderCategoryBadge(txn.category)}
                                        </td>

                                        {/* Số Tiền */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="flex justify-end w-full">
                                                <span className={`font-mono text-base font-semibold tracking-wide ${
                                                    (txn.type === 'EXPENSE' || txn.category === 'REFUND') ? 'text-rose-600' : 'text-emerald-600'
                                                }`}>
                                                    {(txn.type === 'EXPENSE' || txn.category === 'REFUND') ? '-' : '+'}{formatCurrency(txn.amount)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Phương Thức */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {renderPaymentMethod(txn.payment_method)}
                                        </td>

                                        {/* Trạng Thái */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {renderStatusBadge(txn.status)}
                                        </td>

                                        {/* Thao Tác */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => onSelectReceipt && onSelectReceipt(txn)}
                                                    className="w-8 h-8 rounded-lg bg-slate-100 text-sky-600 hover:bg-sky-600 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Xem chi tiết hóa đơn"
                                                >
                                                    <Receipt className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => window.print()}
                                                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                                    title="In hóa đơn"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                {['completed', 'thành công', 'success'].includes(String(txn.status || '').toLowerCase()) && txn.type !== 'REFUND' && onRefundTransaction && (
                                                    <button
                                                        onClick={() => onRefundTransaction(txn)}
                                                        className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center justify-center transition-colors"
                                                        title="Hoàn tiền giao dịch"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1 font-mono ml-auto">
                        <button
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-2.5 py-1 rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 border border-slate-300 transition-colors"
                        >
                            Trước
                        </button>
                        <span className="px-3 py-1 font-semibold text-slate-800">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="px-2.5 py-1 rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 border border-slate-300 transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
