import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

export default function ReportIssueModal({
  isOpen,
  order,
  reason,
  onReasonChange,
  submitting,
  onSubmit,
  onClose,
}) {
  if (!isOpen || !order) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Báo Cáo Sự Cố Đơn Hàng #{order.order_id}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Gửi yêu cầu khiếu nại tới thu ngân để được hoàn tiền
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

        {/* Thông tin đơn hàng tóm tắt */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Tổng tiền thanh toán:</span>
            <span className="font-bold text-slate-800 font-mono">
              {Number(order.total_amount).toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Vị trí máy trạm:</span>
            <span className="font-bold text-slate-800 font-mono">
              {order.computer_name || 'Máy trạm'}
            </span>
          </div>
        </div>

        {/* Form nhập lý do */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mô tả chi tiết sự cố gặp phải <span className="text-rose-500">*</span>:
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ví dụ: Món ăn bị nguội, giao thiếu 1 chai Sting, giao nhầm bàn..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white font-medium outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
            >
              {submitting ? 'Đang gửi...' : 'Gửi Khiếu Nại'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}