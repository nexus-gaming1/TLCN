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
  const remainingRefundable =
    order.remaining_refundable !== undefined
      ? parseFloat(order.remaining_refundable)
      : parseFloat(order.total_amount || 0);
  const alreadyRefunded = parseFloat(order.already_refunded || 0);
  const isFullyRefunded = isCompleted && remainingRefundable <= 0;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
        isPending && isCashUnpaid
          ? 'bg-rose-50/30 border-rose-200 ring-1 ring-rose-200/60'
          : isPreparing
          ? 'bg-cyan-50/30 border-cyan-300 ring-1 ring-cyan-200'
          : isCompleted
          ? 'bg-slate-50/80 border-slate-200 opacity-90'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* 1. Header: Vị trí máy trạm + Badge thanh toán */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-400 font-mono text-xs font-black tracking-wider shadow-xs">
                {order.computer_name || 'MÁY TRẠM'}
              </span>
              <span className="font-mono text-xs font-bold text-slate-500">
                #{order.order_id}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                {order.customer_name}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400">
                {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {isCashUnpaid ? (
              <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-mono text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> CHƯA THU
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-black uppercase flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> ĐÃ TRẢ TIỀN
              </span>
            )}
          </div>
        </div>

        {/* 2. Danh sách món ăn */}
        <div className="py-2.5 space-y-1.5 min-h-[56px] max-h-[140px] overflow-y-auto">
          {order.items?.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <span className="font-bold font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded text-[11px] shrink-0 border border-cyan-200/60">
                  {it.quantity}x
                </span>
                <span className="text-slate-800 font-medium truncate" title={it.item_name}>
                  {it.item_name}
                </span>
              </div>
              <span className="font-mono font-semibold text-slate-700 shrink-0 text-xs">
                {(parseFloat(it.price || 0) * it.quantity).toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Footer: Tổng tiền + Nút hành động */}
      <div className="pt-2.5 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Tổng thanh toán</span>
          <span className="text-sm font-black text-slate-900 font-mono">
            {parseFloat(order.total_amount || 0).toLocaleString('vi-VN')} đ
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onOpenCancelModal(order)}
              className="px-2.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs transition shrink-0 cursor-pointer"
              title="Hủy đơn hàng"
            >
              Hủy
            </button>
          )}

          {isPending && isCashUnpaid && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onConfirmCash(order.order_id)}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Đang xử lý...' : 'Thu Tiền & Nấu'}</span>
            </button>
          )}

          {isPending && isWalletPaid && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStartCooking(order.order_id)}
              className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Đang nhận...' : 'Bắt đầu nấu'}</span>
            </button>
          )}

          {isPreparing && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onCompleteOrder(order.order_id)}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Đang cập nhật...' : 'Giao món và xong'}</span>
            </button>
          )}

          {isCompleted && (
            isFullyRefunded ? (
              <button
                type="button"
                disabled
                className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã hoàn đủ 100%</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenRefundModal(order)}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs border border-amber-300 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {alreadyRefunded > 0
                    ? `Hoàn Tiếp (Còn ${remainingRefundable.toLocaleString('vi-VN')}đ)`
                    : 'Hoàn Tiền Sự Cố'}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}