import { X, Receipt, Printer, RotateCcw, CheckCircle2, User, Monitor, Calendar, ShieldCheck, FileText } from 'lucide-react';
import { printTransactionReceipt } from '../utils/receiptPrinter';

export default function TransactionDetailDrawer({ transaction, onClose, onRefund }) {
  if (!transaction) return null;

  const txnCode = transaction.txnCode || transaction.txn_code || `TXN-${String(transaction.transaction_id || transaction.id).padStart(5, '0')}`;
  const amountStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transaction.amount || 0);
  const statusUpper = String(transaction.status || '').toUpperCase();
  const categoryUpper = String(transaction.category || '').toUpperCase();
  const typeUpper = String(transaction.type || '').toUpperCase();
  const isNegative = typeUpper === 'EXPENSE' || categoryUpper === 'REFUND';
  const canRefund = statusUpper === 'COMPLETED' && categoryUpper !== 'REFUND' && typeUpper !== 'EXPENSE';

  const d = new Date(transaction.createdAt || transaction.created_at || Date.now());
  const formattedDate = d.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const detailRows = [
    {
      key: 'member',
      label: 'Hội Viên / KH:',
      icon: User,
      value: transaction.memberName || transaction.member_name || transaction.customer_name || 'Khách Vãng Lai',
      valueClass: 'font-semibold text-slate-900'
    },
    ...(transaction.phone || transaction.member_phone
      ? [{
          key: 'phone',
          label: 'Số Điện Thoại:',
          value: transaction.phone || transaction.member_phone,
          valueClass: 'font-mono font-medium text-slate-800'
        }]
      : []),
    {
      key: 'computer',
      label: 'Trạm Máy:',
      icon: Monitor,
      value: transaction.computerName || transaction.computer_name || 'Quầy Thu Ngân POS',
      valueClass: 'font-mono font-bold text-sky-700'
    },
    {
      key: 'date',
      label: 'Thời Gian:',
      icon: Calendar,
      value: formattedDate,
      valueClass: 'font-mono text-slate-800'
    },
    {
      key: 'category',
      label: 'Khoản Mục:',
      value: transaction.category || 'Giờ Chơi & Services',
      valueClass: 'font-semibold text-slate-900'
    },
    {
      key: 'method',
      label: 'Phương Thức:',
      value: transaction.paymentMethod || transaction.payment_method || 'CASH',
      valueClass: 'font-semibold text-slate-900'
    },
    {
      key: 'staff',
      label: 'Nhân Viên Thực Hiện:',
      icon: ShieldCheck,
      value: transaction.staffName || transaction.staff_name || 'Thu Ngân Quầy',
      valueClass: 'font-medium text-slate-800'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-base font-bold text-slate-900 truncate">{txnCode}</span>
              <span className="text-xs text-slate-500">Chi Tiết Hóa Đơn Điện Tử</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Amount Header Banner */}
          <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 text-center flex flex-col items-center gap-1">
            <span className="text-xs text-sky-800 uppercase font-mono tracking-wider font-semibold">Tổng Giá Trị Giao Dịch</span>
            <span className={`font-mono text-2xl sm:text-3xl font-extrabold ${isNegative ? 'text-rose-600' : 'text-sky-700'}`}>
              {isNegative ? '-' : '+'}{amountStr}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{statusUpper === 'REFUNDED' ? 'Đã hoàn tiền trên sổ cái' : 'Đã xác nhận & ghi sổ kế toán'}</span>
            </span>
          </div>

          {/* Information List */}
          <div className="space-y-3 border-t border-b border-slate-100 py-4">
            {detailRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.key} className="flex justify-between items-center gap-3 text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{row.label}</span>
                  </span>
                  <span className={`${row.valueClass} text-right truncate`}>{row.value}</span>
                </div>
              );
            })}

            {transaction.notes && (
              <div className="flex justify-between items-start gap-3 text-xs pt-1">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <FileText className="w-3.5 h-3.5" /> Ghi Chú:
                </span>
                <span className="font-medium text-slate-700 max-w-[220px] text-right break-words">{transaction.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => printTransactionReceipt(transaction)}
            className="flex-1 py-2.5 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Phiếu Thu</span>
          </button>

          {canRefund && onRefund && (
            <button
              type="button"
              onClick={() => onRefund(transaction)}
              className="py-2.5 px-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Hoàn Tiền</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
