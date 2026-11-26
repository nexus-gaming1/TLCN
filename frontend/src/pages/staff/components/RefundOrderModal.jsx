import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X, AlertCircle } from 'lucide-react';

export default function RefundOrderModal({
  order,
  amount,
  onAmountChange,
  reason,
  onReasonChange,
  submitting,
  onSubmit,
  onClose,
}) {
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setValidationError('');
  }, [order, amount, reason]);

  if (!order) return null;

  const orderTotal = parseFloat(order.total_amount || 0);
  const alreadyRefunded = parseFloat(order.already_refunded || 0);
  const remainingRefundable =
    order.remaining_refundable !== undefined
      ? Math.max(0, parseFloat(order.remaining_refundable))
      : Math.max(0, orderTotal - alreadyRefunded);

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    if (remainingRefundable <= 0) {
      setValidationError('Đơn hàng này đã được hoàn đủ 100% trước đó.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Số tiền hoàn trả phải là số lớn hơn 0đ.');
      return;
    }
    if (parsedAmount > remainingRefundable) {
      setValidationError(
        `Số tiền hoàn (${parsedAmount.toLocaleString('vi-VN')}đ) vượt quá mức còn lại có thể hoàn (${remainingRefundable.toLocaleString('vi-VN')}đ).`
      );
      return;
    }
    if (!reason || !reason.trim()) {
      setValidationError('Vui lòng nhập lý do sự cố hoàn tiền.');
      return;
    }
    onSubmit(e);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Hoàn Tiền Sự Cố Đơn #{order.order_id}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {order.customer_name} • {order.computer_name || 'MÁY TRẠM'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tóm tắt giá trị đơn & số tiền còn lại */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span>Giá trị gốc của đơn:</span>
            <strong className="font-mono text-slate-900">{orderTotal.toLocaleString('vi-VN')}đ</strong>
          </div>
          {alreadyRefunded > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Đã hoàn trước đó:</span>
              <strong className="font-mono">-{alreadyRefunded.toLocaleString('vi-VN')}đ</strong>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-amber-200/80 font-bold text-amber-900">
            <span>Còn lại có thể hoàn:</span>
            <span className="font-mono">{remainingRefundable.toLocaleString('vi-VN')}đ</span>
          </div>
          <p className="text-[11px] text-amber-800/90 pt-1 italic">
            ✓ Phiếu chi hoàn tiền được ghi sổ cái theo phương thức thanh toán gốc (Ví hội viên / Tiền mặt) và giữ nguyên trạng thái đơn.
          </p>
        </div>

        {remainingRefundable <= 0 ? (
          <>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Đơn hàng này đã được hoàn đủ 100% trước đó.</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleLocalSubmit} className="space-y-3.5">
            {validationError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số tiền hoàn (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={remainingRefundable}
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="Nhập số tiền hoàn lại..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do sự cố <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Ví dụ: Giao thiếu Sting, đồ ăn nguội đổi món..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{submitting ? 'Đang ghi sổ...' : 'Xác Nhận Hoàn Tiền'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}