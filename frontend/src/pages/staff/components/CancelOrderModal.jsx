//import React from 'react';
import { AlertCircle, X, XCircle } from 'lucide-react';

export default function CancelOrderModal({
  order,
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
          <h3 className="text-sm font-extrabold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            Hủy Đơn Hàng #{order.order_id}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600">
          Đơn hàng tại <span className="font-bold text-slate-800">{order.computer_name}</span> sẽ bị hủy. Món ăn sẽ được <span className="font-bold text-emerald-700">cộng hoàn lại kho</span> và tiền (nếu đã thanh toán) sẽ được <span className="font-bold text-emerald-700">hoàn trả tự động</span>.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do từ chối / hủy đơn <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ví dụ: Bếp hết nguyên liệu, khách đổi món..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
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
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>{submitting ? 'Đang hủy...' : 'Xác Nhận Hủy Đơn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}