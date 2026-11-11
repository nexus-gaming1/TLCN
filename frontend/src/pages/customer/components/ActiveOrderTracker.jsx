import { Clock, ChefHat, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function ActiveOrderTracker({
  orders = [],
  loading = false,
  cancellingOrderId = null,
  onCancelOrder,
  onRefresh,
}) {
  const getStatusBadge = (status, paymentStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          label: paymentStatus === 'UNPAID' ? 'Chờ thu tiền mặt' : 'Chờ bếp xác nhận',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
        };
      case 'PREPARING':
        return {
          label: 'Đang nấu trong bếp',
          color: 'bg-sky-100 text-sky-800 border-sky-200',
          icon: ChefHat,
        };
      case 'COMPLETED':
        return {
          label: 'Đã phục vụ thành công',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'CANCELLED':
        return {
          label: 'Đơn hàng đã hủy',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Clock,
        };
    }
  };

  const getStepActiveIndex = (status) => {
    switch (status) {
      case 'PENDING':
        return 1;
      case 'PREPARING':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-600" />
          <h3 className="font-extrabold text-sm text-slate-800">
            Theo Dõi Đơn Hàng Của Bạn
          </h3>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
          title="Làm mới"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-600 mb-2" />
          Đang cập nhật trạng thái đơn hàng...
        </div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Chưa có đơn hàng nào được đặt hôm nay.
        </div>
      ) : (
        <div className="space-y-3.5">
          {orders.map((order) => {
            const statusInfo = getStatusBadge(order.status, order.payment_status);
            const StatusIcon = statusInfo.icon;
            const stepIndex = getStepActiveIndex(order.status);
            const isPending = order.status === 'PENDING';
            const isCancelling = cancellingOrderId === order.order_id;

            return (
              <div
                key={order.order_id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-all space-y-3 shadow-2xs"
              >
                {/* 1. Thông tin cơ bản đơn hàng */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                      #{order.order_id}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {order.computer_name && (
                      <span className="text-[11px] font-bold text-slate-700">
                        • {order.computer_name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Thanh tiến trình 3 bước (Stepper) */}
                {order.status !== 'CANCELLED' && (
                  <div className="pt-1 pb-2">
                    <div className="grid grid-cols-3 gap-2 relative text-center">
                      {[
                        { step: 1, label: 'Tiếp nhận' },
                        { step: 2, label: 'Đang nấu' },
                        { step: 3, label: 'Hoàn tất' },
                      ].map((s) => {
                        const isDone = stepIndex >= s.step;
                        const isCurrent = stepIndex === s.step;
                        return (
                          <div key={s.step} className="flex flex-col items-center">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                isDone
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-slate-200 text-slate-400'
                              } ${isCurrent ? 'ring-2 ring-cyan-300' : ''}`}
                            >
                              {s.step}
                            </div>
                            <span
                              className={`text-[10px] font-bold ${
                                isDone ? 'text-cyan-800' : 'text-slate-400'
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Danh sách món trong đơn */}
                <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
                  {order.items?.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700">
                      <span>
                        <strong className="text-cyan-700 font-mono">{it.quantity}x</strong> {it.item_name}
                      </span>
                      <span className="font-mono text-slate-500">
                        {(parseFloat(it.price || 0) * it.quantity).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))}
                </div>

                {/* 4. Footer: Tổng tiền + Nút hủy nếu còn PENDING */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs">
                    <span className="text-slate-400">Tổng: </span>
                    <strong className="font-mono text-slate-900">
                      {parseFloat(order.total_amount || 0).toLocaleString('vi-VN')} đ
                    </strong>
                    <span className="text-[10px] ml-1.5 px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-500">
                      {order.payment_method === 'WALLET' ? 'Ví tài khoản' : 'Tiền mặt'}
                    </span>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => onCancelOrder(order.order_id)}
                      className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>{isCancelling ? 'Đang hủy...' : 'Hủy đơn'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
