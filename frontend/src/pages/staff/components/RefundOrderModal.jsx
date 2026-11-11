import React from 'react';
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
          <h3 className="text-sm font-extrabold text-orange-700 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-600" />
            Hoàn Tiền Sự Cố Đơn #{order.order_id}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200 text-xs text-orange-900 space-y-1">
          <p>• Khách hàng: <span className="font-bold">{order.customer_name}</span> ({order.computer_name})</p>
          <p>• Tổng giá trị đơn: <span className="font-bold font-mono">{parseFloat(order.total_amount).toLocaleString('vi-VN')} đ</span></p>
          <p className="text-[11px] text-orange-700 italic">Thao tác này sẽ ghi nhận phiếu chi hoàn tiền vào sổ cái và giữ nguyên trạng thái đơn.</p>
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
              placeholder="Nhập số tiền cần hoàn lại..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do hoàn tiền / sự cố món ăn <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ví dụ: Giao thiếu món, đồ ăn nguội..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
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