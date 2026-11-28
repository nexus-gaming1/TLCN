import { useState } from 'react';
import {
  Copy, Check, Receipt, Printer, RotateCcw, AlertCircle,
  Clock, XCircle, Gamepad2, Utensils, Moon,
  CreditCard, QrCode, Banknote, Wallet
} from 'lucide-react';
import Pagination from '../../../shared/ui/Pagination';
import { printTransactionReceipt } from '../utils/receiptPrinter';

const CATEGORY_MAP = {
  TOPUP: { label: 'Nạp Giờ Chơi', cls: 'bg-indigo-100 text-indigo-700', icon: Gamepad2 },
  MEMBER_TOPUP: { label: 'Nạp Giờ Chơi', cls: 'bg-indigo-100 text-indigo-700', icon: Gamepad2 },
  MEMBER_WITHDRAW: { label: 'Rút Tiền Quầy', cls: 'bg-orange-100 text-orange-700', icon: Banknote },
  SERVICE_FOOD: { label: 'Dịch Vụ F&B', cls: 'bg-amber-100 text-amber-800', icon: Utensils },
  SERVICE_SALE: { label: 'Dịch Vụ F&B', cls: 'bg-amber-100 text-amber-800', icon: Utensils },
  COMBO_PURCHASE: { label: 'Mua Combo', cls: 'bg-purple-100 text-purple-700', icon: Moon },
  NIGHT_COMBO: { label: 'Mua Combo', cls: 'bg-purple-100 text-purple-700', icon: Moon },
  COMBINED: { label: 'Giờ + F&B', cls: 'bg-sky-100 text-sky-800', icon: Gamepad2 },
  REFUND: { label: 'Hoàn Tiền', cls: 'bg-rose-100 text-rose-700', icon: RotateCcw }
};

function CategoryBadge({ category }) {
  const cat = String(category || '').toUpperCase().trim();
  const cfg = CATEGORY_MAP[cat] || { label: category || 'Khác', cls: 'bg-slate-100 text-slate-600', icon: Gamepad2 };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${cfg.cls} font-mono text-xs font-semibold whitespace-nowrap`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label}</span>
    </span>
  );
}

function PaymentBadge({ method }) {
  const lower = String(method || '').toLowerCase();
  let cfg = { label: 'Thẻ POS / Card', icon: CreditCard, color: 'text-indigo-600' };
  if (lower.includes('vietqr') || lower.includes('qr')) {
    cfg = { label: 'VietQR Pro', icon: QrCode, color: 'text-sky-600' };
  } else if (lower.includes('cash') || lower.includes('tiền mặt')) {
    cfg = { label: 'Tiền Mặt (Cash)', icon: Banknote, color: 'text-amber-600' };
  } else if (lower.includes('wallet') || lower.includes('momo') || lower.includes('ví')) {
    cfg = { label: 'Ví Hội Viên', icon: Wallet, color: 'text-pink-600' };
  }
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 font-medium whitespace-nowrap">
      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      <span>{cfg.label}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const lower = String(status || '').toLowerCase();
  if (lower === 'completed' || lower === 'thành công' || lower === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold border border-emerald-200/50">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
}

function RowActions({ txn, onSelectReceipt, onRefundTransaction }) {
  const statusUpper = String(txn.status || '').toUpperCase();
  const catUpper = String(txn.category || '').toUpperCase();
  const typeUpper = String(txn.type || '').toUpperCase();
  const canRefund = statusUpper === 'COMPLETED' && catUpper !== 'REFUND' && typeUpper !== 'EXPENSE' && onRefundTransaction;

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelectReceipt && onSelectReceipt(txn)}
        className="w-8 h-8 rounded-lg bg-slate-100 text-sky-600 hover:bg-sky-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        title="Xem chi tiết hóa đơn"
      >
        <Receipt className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => printTransactionReceipt(txn)}
        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        title="In hóa đơn"
      >
        <Printer className="w-4 h-4" />
      </button>
      {canRefund && (
        <button
          type="button"
          onClick={() => onRefundTransaction(txn)}
          className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Hoàn tiền giao dịch"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

const formatCurrency = (amt) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt || 0);

const formatDateTime = (dateStr) => {
  if (!dateStr) return { time: '--:--', date: '--/--/----' };
  const d = new Date(dateStr);
  return {
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  };
};

function getAmountMeta(txn) {
  const catUpper = String(txn.category || '').toUpperCase();
  const typeUpper = String(txn.type || '').toUpperCase();
  const isNegative = typeUpper === 'EXPENSE' || catUpper === 'REFUND' || catUpper === 'MEMBER_WITHDRAW';
  return {
    prefix: isNegative ? '-' : '+',
    colorClass: isNegative ? 'text-rose-600' : 'text-emerald-700'
  };
}

function EmptyTransactionsState({ onResetFilters }) {
  return (
    <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
      <AlertCircle className="w-8 h-8 text-slate-300" />
      <span className="font-semibold text-sm text-slate-600">Không tìm thấy giao dịch nào phù hợp với bộ lọc.</span>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-1 px-3.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold border border-sky-200 transition-all cursor-pointer"
        >
          Đặt lại bộ lọc
        </button>
      )}
    </div>
  );
}

export default function TransactionTable({
  transactions = [],
  totalItems,
  currentPage = 1,
  pageSize = 10,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
  onSelectReceipt,
  onRefundTransaction
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (code, id) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  const resolvedTotal = totalItems !== undefined ? totalItems : transactions.length;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col">
      {/* Table Header Micro-Action Strip */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-sm text-slate-900">Sổ Cái Giao Dịch</span>
          <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase tracking-wider">
            {resolvedTotal} GIAO DỊCH
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>
            Kiểm toán MySQL: <strong className="text-emerald-700 font-bold">Trực tiếp (Realtime)</strong>
          </span>
        </div>
      </div>

      {/* Mobile Card List (< md) */}
      <div className="md:hidden divide-y divide-slate-200">
        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2 text-xs">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải dữ liệu sổ cái từ CSDL MySQL...</span>
          </div>
        ) : transactions.length === 0 ? (
          <EmptyTransactionsState onResetFilters={onResetFilters} />
        ) : (
          transactions.map((txn) => {
            const id = txn.transaction_id || txn.id;
            const txnCode = txn.txnCode || txn.txn_code || `TXN-${String(id).padStart(5, '0')}`;
            const { time, date } = formatDateTime(txn.createdAt || txn.created_at);
            const memberName = txn.memberName || txn.member_name || txn.customer_name || 'Khách Vãng Lai';
            const amtMeta = getAmountMeta(txn);

            return (
              <div key={id} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                    {txnCode}
                  </span>
                  <StatusBadge status={txn.status} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{memberName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {date} • {time}
                    </div>
                  </div>
                  <span className={`font-mono text-base font-extrabold shrink-0 ${amtMeta.colorClass}`}>
                    {amtMeta.prefix}{formatCurrency(txn.amount)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={txn.category} />
                    <PaymentBadge method={txn.paymentMethod || txn.payment_method} />
                  </div>
                  <RowActions
                    txn={txn}
                    onSelectReceipt={onSelectReceipt}
                    onRefundTransaction={onRefundTransaction}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop High-Density Table (>= md) */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[1050px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wider select-none border-b-2 border-slate-300 font-extrabold">
              <th className="py-3 px-4 font-extrabold text-slate-800">Mã GD</th>
              <th className="py-3 px-4 font-extrabold text-slate-800">Thời Gian</th>
              <th className="py-3 px-4 font-extrabold text-slate-800">Hội Viên / Khách Hàng</th>
              <th className="py-3 px-4 font-extrabold text-slate-800">Khoản Mục</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-right">Số Tiền</th>
              <th className="py-3 px-4 font-extrabold text-slate-800">Phương Thức</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-center">Trạng Thái</th>
              <th className="py-3 px-4 font-extrabold text-slate-800 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải dữ liệu sổ cái từ CSDL MySQL...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <EmptyTransactionsState onResetFilters={onResetFilters} />
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const id = txn.transaction_id || txn.id;
                const { time, date } = formatDateTime(txn.createdAt || txn.created_at);
                const txnCode = txn.txnCode || txn.txn_code || `TXN-${String(id).padStart(5, '0')}`;
                const isCopied = copiedId === id;
                const memberName = txn.memberName || txn.member_name || txn.customer_name || 'Khách Vãng Lai';
                const rankName = txn.rankName || txn.member_rank;
                const phone = txn.phone || txn.member_phone || 'POS';
                const computerName = txn.computerName || txn.computer_name;
                const amtMeta = getAmountMeta(txn);

                return (
                  <tr key={id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                          {txnCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(txnCode, id)}
                          className="text-slate-400 hover:text-sky-600 transition-colors p-0.5 cursor-pointer"
                          title="Sao chép mã TXN"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-800">{time}</span>
                        <span className="text-[11px] text-slate-400">{date}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shadow-xs border border-sky-200 shrink-0">
                          {memberName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{memberName}</span>
                            {rankName && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                                {rankName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                            <span>{phone}</span>
                            {computerName && computerName !== '—' && (
                              <>
                                <span>•</span>
                                <span className="font-bold text-sky-600">{computerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <CategoryBadge category={txn.category} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`font-mono text-base font-bold ${amtMeta.colorClass}`}>
                        {amtMeta.prefix}{formatCurrency(txn.amount)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PaymentBadge method={txn.paymentMethod || txn.payment_method} />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={txn.status} />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <RowActions
                        txn={txn}
                        onSelectReceipt={onSelectReceipt}
                        onRefundTransaction={onRefundTransaction}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={currentPage}
        totalItems={resolvedTotal}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={(p) => onPageChange && onPageChange(p)}
        onPageSizeChange={(newSize) => onPageSizeChange && onPageSizeChange(newSize)}
        itemLabel="giao dịch"
      />
    </div>
  );
}
