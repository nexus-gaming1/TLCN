import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  History,
  X,
} from 'lucide-react';

export default function ActiveOrderTracker({
  orders = [],
  loading = false,
  cancellingOrderId = null,
  onCancelOrder,
  onReportIssue,
  onRefresh,
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'CANCELLED'
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'PENDING' || o.status === 'PREPARING'),
    [orders]
  );

  const historyOrders = useMemo(
    () => orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED'),
    [orders]
  );

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'COMPLETED') return historyOrders.filter((o) => o.status === 'COMPLETED');
    if (historyFilter === 'CANCELLED') return historyOrders.filter((o) => o.status === 'CANCELLED');
    return historyOrders;
  }, [historyOrders, historyFilter]);

  const getStatusBadge = (status, paymentStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          label: paymentStatus === 'UNPAID' ? 'Chờ thu tiền mặt' : 'Chờ xác nhận',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
        };
      case 'PREPARING':
        return {
          label: 'Đang chuẩn bị',
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
    if (status === 'PENDING') return 1;
    if (status === 'PREPARING') return 2;
    if (status === 'COMPLETED') return 3;
    return 0;
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Header khối theo dõi đơn */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-5 h-5 text-cyan-600 shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-800 truncate">
              Đơn Đang Thực Hiện ({activeOrders.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setHistoryFilter('ALL');
                setIsHistoryOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
              title="Xem lịch sử đơn hàng đã giao và đã hủy"
            >
              <History className="w-3.5 h-3.5 text-cyan-600" />
              <span>Lịch sử ({historyOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Nội dung: Chỉ hiện đơn PENDING / PREPARING */}
        {loading && orders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-600 mb-2" />
            Đang cập nhật trạng thái đơn hàng...
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="py-7 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
            <p className="font-medium">Không có đơn hàng nào đang chờ xử lý.</p>
            {historyOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="text-cyan-700 hover:underline font-bold text-[11px] cursor-pointer"
              >
                Xem {historyOrders.length} đơn trong Lịch sử đơn hàng ➔
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeOrders.map((order) => {
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                        #{order.order_id}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Stepper 3 bước */}
                  <div className="pt-1 pb-2">
                    <div className="grid grid-cols-3 gap-2 relative text-center">
                      {[
                        { step: 1, label: 'Tiếp nhận' },
                        { step: 2, label: 'Đang chuẩn bị' },
                        { step: 3, label: 'Hoàn tất' },
                      ].map((s) => {
                        const isDone = stepIndex >= s.step;
                        const isCurrent = stepIndex === s.step;
                        return (
                          <div key={s.step} className="flex flex-col items-center">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                isDone ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-400'
                              } ${isCurrent ? 'ring-2 ring-cyan-300' : ''}`}
                            >
                              {s.step}
                            </div>
                            <span className={`text-[10px] font-bold ${isDone ? 'text-cyan-800' : 'text-slate-400'}`}>
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Danh sách món */}
                  <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
                    {order.items?.length > 0 ? (
                      order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <span>
                            <strong className="text-cyan-700 font-mono">{it.quantity}x</strong> {it.item_name}
                          </span>
                          <span className="font-mono text-slate-500">
                            {(parseFloat(it.price || 0) * it.quantity).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 font-medium">{order.items_summary}</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs">
                      <span className="text-slate-400">Tổng: </span>
                      <strong className="font-mono text-slate-900">
                        {parseFloat(order.total_amount || 0).toLocaleString('vi-VN')} đ
                      </strong>
                      <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-500">
                        {order.payment_method === 'WALLET' ? 'Ví tài khoản' : 'Tiền mặt'}
                      </span>
                    </div>

                    {isPending && (
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => setConfirmCancelOrderId(order.order_id)}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
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

      {/* MODAL 1: LỊCH SỬ ĐƠN HÀNG (ĐÃ PHỤC VỤ & ĐÃ HỦY) */}
      {isHistoryOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Lịch Sử Đơn Hàng F&amp;B</h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Theo dõi các đơn đã phục vụ và lý do hủy đơn (nếu có)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3 Bộ lọc nhanh */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'ALL', label: `Tất cả (${historyOrders.length})`, activeCls: 'bg-slate-900 text-white' },
                  {
                    id: 'COMPLETED',
                    label: `Đã phục vụ (${historyOrders.filter((o) => o.status === 'COMPLETED').length})`,
                    activeCls: 'bg-emerald-600 text-white',
                  },
                  {
                    id: 'CANCELLED',
                    label: `Đã hủy (${historyOrders.filter((o) => o.status === 'CANCELLED').length})`,
                    activeCls: 'bg-rose-600 text-white',
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setHistoryFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      historyFilter === f.id
                        ? `${f.activeCls} shadow-xs`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Danh sách cuộn */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
                {filteredHistory.length === 0 ? (
                  <div className="py-14 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Chưa có đơn hàng nào trong mục này.
                  </div>
                ) : (
                  filteredHistory.map((order) => {
                    const statusInfo = getStatusBadge(order.status, order.payment_status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <div
                        key={order.order_id}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                              #{order.order_id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(order.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusInfo.label}</span>
                          </span>
                        </div>

                        {/* Chi tiết món */}
                        <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
                          {order.items?.length > 0 ? (
                            order.items.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-slate-700">
                                <span>
                                  <strong className="text-cyan-700 font-mono">{it.quantity}x</strong> {it.item_name}
                                </span>
                                <span className="font-mono text-slate-500">
                                  {(parseFloat(it.price || 0) * it.quantity).toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-600 font-medium">{order.items_summary}</p>
                          )}
                        </div>

                        {/* Khung đỏ lý do hủy cho đơn CANCELLED */}
                        {order.status === 'CANCELLED' && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                            <div>
                              <strong className="font-extrabold">Lý do hủy: </strong>
                              <span>{order.cancel_reason || 'Đơn đã bị hủy bởi quầy thu ngân'}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="text-xs">
                            <span className="text-slate-400">Tổng: </span>
                            <strong className="font-mono text-slate-900">
                              {parseFloat(order.total_amount || 0).toLocaleString('vi-VN')} đ
                            </strong>
                            <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-500">
                              {order.payment_method === 'WALLET' ? 'Ví tài khoản' : 'Tiền mặt'}
                            </span>
                          </div>

                          {order.status === 'COMPLETED' && onReportIssue && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsHistoryOpen(false);
                                onReportIssue(order);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Khiếu nại sự cố món ăn để được hoàn tiền"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Báo sự cố</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 2: XÁC NHẬN KHÁCH TỰ HỦY ĐƠN PENDING (THAY THẾ window.confirm) */}
      {confirmCancelOrderId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Xác Nhận Hủy Đơn #{confirmCancelOrderId}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tiền thanh toán bằng Ví (nếu có) sẽ tự động hoàn lại ngay.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancelOrderId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Giữ Đơn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = confirmCancelOrderId;
                    setConfirmCancelOrderId(null);
                    onCancelOrder(targetId);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                >
                  Xác Nhận Hủy
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}