import React from 'react';
import { AlertTriangle, CheckCheck, DollarSign, ChefHat, RotateCcw } from 'lucide-react';

export default function StaffOrderCard({
  order,
  actionLoadingId,
  onConfirmCash,
  onStartCooking,
  onCompleteOrder,
  onOpenCancelModal,
  onOpenRefundModal,
}) {
  const isCashUnpaid = order.payment_status === 'UNPAID';
  const isWalletPaid = order.payment_status === 'PAID';
  const isPending = order.status === 'PENDING';
  const isPreparing = order.status === 'PREPARING';
  const isCompleted = order.status === 'COMPLETED';
  const isLoading = actionLoadingId === order.order_id;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isPending && isCashUnpaid
          ? 'bg-amber-50/40 border-amber-200'
          : isPreparing
          ? 'bg-sky-50/30 border-sky-200'
          : isCompleted
          ? 'bg-slate-50 border-slate-200 opacity-90'
          : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      {/* Header thẻ đơn */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black tracking-wide">
              {order.computer_name || 'MÁY TRẠM'}
            </span>
            <span className="font-mono text-xs font-bold text-slate-500">
              #{order.order_id}
            </span>
            <span className="text-xs font-bold text-slate-800">
              • {order.customer_name}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Đặt lúc: {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {isCashUnpaid ? (
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono text-[10px] font-black uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> CHƯA THU TIỀN
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-black uppercase flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> ĐÃ THANH TOÁN
            </span>
          )}
        </div>
      </div>

      {/* Danh sách món ăn */}
      <div className="py-2.5 space-y-1">
        {order.items?.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-slate-700 font-medium">
              <span className="font-bold font-mono text-amber-700">{it.quantity}x</span> {it.item_name}
            </span>
            <span className="font-mono text-slate-500">
              {(parseFloat(it.price || 0) * it.quantity).toLocaleString('vi-VN')} đ
            </span>
          </div>
        ))}
      </div>

      {/* Footer & Các nút hành động */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Tổng thanh toán</span>
          <span className="text-sm font-extrabold text-slate-900 font-mono">
            {parseFloat(order.total_amount || 0).toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onOpenCancelModal(order)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs transition"
            >
              Hủy Đơn
            </button>
          )}

          {isPending && isCashUnpaid && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onConfirmCash(order.order_id)}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Đang xử lý...' : 'Thu Tiền Mặt & Nấu'}</span>
            </button>
          )}

          {isPending && isWalletPaid && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStartCooking(order.order_id)}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Đang nhận...' : 'Bắt Đầu Nấu'}</span>
            </button>
          )}

          {isPreparing && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onCompleteOrder(order.order_id)}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Đang cập nhật...' : 'Giao Món & Hoàn Tất'}</span>
            </button>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={() => onOpenRefundModal(order)}
              className="px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-xs border border-orange-200 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hoàn Tiền Sự Cố</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}