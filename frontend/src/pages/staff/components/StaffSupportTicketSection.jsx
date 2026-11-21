import { RefreshCw, RotateCcw, Clock } from 'lucide-react';

export default function StaffSupportTicketSection({
  tickets = [],
  loading = false,
  onProcessTicket,
}) {
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

  return (
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
                  {isPending ? 'Chờ Tiếp Nhận' : isInProgress ? 'Đang Xử Lý' : isResolved ? 'Đã Hoàn Tất' : 'Đã Bác Bỏ'}
                </span>
              </div>

              {/* Thông tin chi tiết */}
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

            {/* Thao tác của Nhân viên / Thu ngân */}
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
                  onClick={() => {
                    const ans = window.confirm(
                      `Xác nhận duyệt khiếu nại và hoàn tiền cho đơn hàng #${t.order_id}?\nTiền sẽ được tự động hoàn trả vào ví hội viên.`
                    );
                    if (ans) {
                      onProcessTicket(t.request_id, 'REFUND', null, 'Duyệt hoàn tiền sự cố món ăn');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Duyệt Hoàn Tiền</span>
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
  );
}