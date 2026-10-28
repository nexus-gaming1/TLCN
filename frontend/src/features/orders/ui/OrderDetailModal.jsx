import React, { useState, useEffect } from 'react';
import orderService from '../../../shared/api/order.service';
import {
  X,
  Receipt,
  User,
  ShieldCheck,
  CreditCard,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

export default function OrderDetailModal({ isOpen, orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let ignore = false;
    const controller = new AbortController();

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await orderService.getOrderById(orderId, controller.signal);
        if (!ignore) {
          setOrder(data);
        }
      } catch (err) {
        if (!ignore && err.name !== 'AbortError') {
          setError(err.message || 'Không thể tải chi tiết đơn hàng');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200/80 max-h-[90vh] overflow-y-auto flex flex-col gap-5">
        
        {/* Header modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Chi Tiết Đơn Hàng #{orderId}</h3>
                {order && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border bg-slate-100 text-slate-700">
                    {order.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Thông tin thanh toán, thực đơn và lịch sử giao dịch kế toán
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Modal */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            <span className="text-xs font-semibold">Đang nạp chi tiết đơn hàng...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : order ? (
          <div className="space-y-5">
            {/* 1. Thông tin khách và nhân viên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[10px]">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Khách Hàng
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {order.member?.full_name || order.member?.username || 'Khách vãng lai'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Tài khoản: <span className="font-mono text-slate-700">@{order.member?.username || '—'}</span>
                </div>
                {order.member?.phone && (
                  <div className="text-slate-500 text-[11px]">
                    SĐT: <span className="font-mono text-slate-700">{order.member.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-200/60 pt-3 sm:pt-0 sm:pl-4">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Nhân Viên Xử Lý
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {order.processedBy?.full_name || 'Chưa tiếp nhận'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Thời gian đặt: {new Date(order.created_at).toLocaleString('vi-VN')}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Trạng thái tiền:{' '}
                  <span className={`font-bold ${order.payment_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {order.payment_status === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THU TIỀN'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Danh sách món  */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                Danh Sách Món Ăn Đã Đặt
              </h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Tên Món</th>
                      <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      <th className="py-2.5 px-3 text-center">Số Lượng</th>
                      <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(order.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 font-medium text-slate-700">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{it.item_name}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.price)}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan="3" className="py-3 px-3 text-right text-slate-700">
                        TỔNG HÓA ĐƠN:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700 font-black">
                        {formatCurrency(order.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 3. Lịch sử sổ giao dịch */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                Đối Soát Giao Dịch Tài Chính
              </h4>
              {order.transactions && order.transactions.length > 0 ? (
                <div className="space-y-2">
                  {order.transactions.map((tx) => {
                    const isIncome = tx.type === 'INCOME';
                    return (
                      <div
                        key={tx.transaction_id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isIncome
                            ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
                            : 'bg-rose-50/50 border-rose-200/80 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                              isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>Mã GD: #TXN-{tx.transaction_id}</span>
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white/80 border border-current">
                                {tx.payment_method}
                              </span>
                            </div>
                            <span className="text-[10px] opacity-75">
                              {new Date(tx.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sm block">
                            {isIncome ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-400 text-xs text-center">
                  Chưa ghi nhận giao dịch tài chính cho đơn này (Đơn tiền mặt chưa thu hoặc đơn hủy sớm)
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer modal */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}