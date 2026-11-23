import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, RotateCcw, Clock, XCircle, AlertCircle, X } from 'lucide-react';

export default function StaffSupportTicketSection({
  tickets = [],
  loading = false,
  onProcessTicket,
}) {
  // State quản lý Modal Từ Chối
  const [rejectModalTicket, setRejectModalTicket] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // State quản lý Modal Duyệt Hoàn Tiền
  const [refundModalTicket, setRefundModalTicket] = useState(null);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs font-medium">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-cyan-600 mb-3" />
        Đang đồng bộ danh sách yêu cầu hỗ trợ và khiếu nại...
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs font-medium bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
        🎉 Không có yêu cầu hỗ trợ hoặc khiếu nại nào cần xử lý!
      </div>
    );
  }

  // Xử lý submit Từ Chối
  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectModalTicket || !rejectReason.trim()) return;
    onProcessTicket(rejectModalTicket.request_id, 'REJECT', null, rejectReason.trim());
    setRejectModalTicket(null);
    setRejectReason('');
  };

  // Xử lý submit Hoàn Tiền
  const handleConfirmRefund = () => {
    if (!refundModalTicket) return;
    onProcessTicket(refundModalTicket.request_id, 'REFUND', null, 'Duyệt hoàn tiền sự cố món ăn');
    setRefundModalTicket(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tickets.map((t) => {
          const isPending = t.status === 'PENDING';
          const isInProgress = t.status === 'IN_PROGRESS';
          const isResolved = t.status === 'RESOLVED';
          const isRejected = t.status === 'REJECTED';

          return (
            <div
              key={t.request_id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                isPending
                  ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200/60'
                  : isInProgress
                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200/60'
                  : isResolved
                  ? 'bg-emerald-50/20 border-emerald-200'
                  : 'bg-white border-slate-200 opacity-90'
              }`}
            >
              {/* Header Thẻ: Vị trí máy trạm + Mã Ticket + Badge trạng thái */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-400 font-mono text-xs font-black tracking-wider shadow-xs">
                      {t.computer?.computer_name || 'NGOÀI QUÁN'}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{t.request_id}
                    </span>
                    {t.type === 'ORDER_DISPUTE' && t.order_id && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black font-mono">
                        Đơn #{t.order_id}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isPending
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        : isInProgress
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : isResolved
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {isPending ? 'Chờ Tiếp Nhận' : isInProgress ? 'Đang Xử Lý' : isResolved ? 'Đã Hoàn Tất' : 'Đã Từ Chối'}
                  </span>
                </div>

                {/* Nội dung chi tiết */}
                <div className="space-y-1.5">
                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {t.title}
                  </h4>

                  {t.description && (
                    <p className="text-xs text-slate-600 italic bg-white/70 p-2.5 rounded-xl border border-slate-200/60 font-medium">
                      "{t.description}"
                    </p>
                  )}

                  {t.rating && (
                    <div className="flex items-center gap-1 text-amber-500 font-black text-xs pt-1">
                      <span>Đánh giá:</span>
                      <span>{'⭐'.repeat(t.rating)}</span>
                      <span className="text-slate-500 text-[11px] font-mono">({t.rating}/5)</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
                    <span>Hội viên: <strong className="text-slate-700">@{t.member?.userInfo?.username || 'khach'}</strong></span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {t.resolution_note && (
                    <div className="mt-2 text-[11px] p-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      <strong className="text-slate-900">Ghi chú xử lý:</strong> {t.resolution_note}
                    </div>
                  )}
                </div>
              </div>

              {/* Nút thao tác của Thu ngân */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {isPending && (
                  <button
                    type="button"
                    onClick={() => onProcessTicket(t.request_id, 'IN_PROGRESS')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-2xs transition cursor-pointer"
                  >
                    Tiếp Nhận
                  </button>
                )}

                {t.type === 'ORDER_DISPUTE' && !isResolved && !isRejected && (
                  <button
                    type="button"
                    onClick={() => setRefundModalTicket(t)} // ✅ Mở Modal Hoàn Tiền
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Duyệt Hoàn Tiền</span>
                  </button>
                )}

                {!isResolved && !isRejected && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalTicket(t); // ✅ Mở Modal Từ Chối
                      setRejectReason('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold text-xs shadow-2xs transition cursor-pointer"
                  >
                    Từ Chối
                  </button>
                )}

                {!isResolved && !isRejected && (
                  <button
                    type="button"
                    onClick={() => onProcessTicket(t.request_id, 'RESOLVE')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-2xs transition cursor-pointer"
                  >
                    Hoàn Tất
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. MODAL TỪ CHỐI TICKET */}
      {rejectModalTicket &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Từ Chối Yêu Cầu #{rejectModalTicket.request_id}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {rejectModalTicket.computer?.computer_name || 'NGOÀI QUÁN'} • @{rejectModalTicket.member?.userInfo?.username || 'khach'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalTicket(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmReject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lý do từ chối yêu cầu <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ví dụ: Khách bấm nhầm, thiết bị vẫn hoạt động bình thường, yêu cầu không hợp lệ..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white font-medium outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRejectModalTicket(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={!rejectReason.trim()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
                  >
                    Xác Nhận Từ Chối
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* 2. MODAL XÁC NHẬN DUYỆT HOÀN TIỀN */}
      {refundModalTicket &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Xác Nhận Duyệt Hoàn Tiền
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Khiếu nại cho Đơn hàng #{refundModalTicket.order_id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundModalTicket(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 text-slate-600">
                <p>
                  Bạn đang duyệt khiếu nại của hội viên{' '}
                  <strong className="text-slate-900 font-bold">
                    @{refundModalTicket.member?.userInfo?.username || 'khach'}
                  </strong>.
                </p>
                <p className="text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  ✓ Toàn bộ số tiền đơn hàng sẽ được tự động hoàn trả vào ví tài khoản của hội viên ngay lập tức.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRefundModalTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRefund}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
                >
                  Xác Nhận Hoàn Tiền
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}