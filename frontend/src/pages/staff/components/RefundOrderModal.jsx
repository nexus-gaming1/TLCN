import { RotateCcw, X } from 'lucide-react';

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
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-amber-700 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            Hoàn Tiền Sự Cố Đơn #{order.order_id}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
          <p>• Khách hàng: <span className="font-bold text-slate-900">{order.customer_name}</span> ({order.computer_name || 'MÁY TRẠM'})</p>
          <p>• Giá trị gốc: <span className="font-black font-mono text-slate-900">{parseFloat(order.total_amount).toLocaleString('vi-VN')} đ</span></p>
          <p className="text-[11px] text-amber-700 italic">Phiếu chi hoàn tiền sẽ được ghi vào sổ cái tài chính và giữ nguyên trạng thái đơn.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số tiền hoàn (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              max={order.total_amount}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="Nhập số tiền hoàn lại..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
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
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
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
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{submitting ? 'Đang ghi sổ...' : 'Xác Nhận Hoàn Tiền'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}