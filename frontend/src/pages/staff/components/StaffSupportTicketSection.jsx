import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import supportService from '../../../shared/api/support.service';
import {
  RefreshCw,
  RotateCcw,
  Clock,
  XCircle,
  AlertCircle,
  CheckCircle2,
  X,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const HISTORY_PAGE_SIZE = 10;

const getOrderRefundInfo = (ticket) => {
  const orderTotal = parseFloat(ticket?.order?.total_amount || 0);
  const refundedTxns = ticket?.order?.transactions || [];
  const alreadyRefunded = refundedTxns.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
  const remainingRefundable = Math.max(0, orderTotal - alreadyRefunded);
  return { orderTotal, alreadyRefunded, remainingRefundable };
};

export default function StaffSupportTicketSection({
  tickets = [],
  loading = false,
  onProcessTicket,
  isHistoryOpen = false,
  onCloseHistory,
}) {
  // State quản lý Modal Từ Chối (chỉ dùng cho ORDER_DISPUTE)
  const [rejectModalTicket, setRejectModalTicket] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // State quản lý Modal Duyệt Hoàn Tiền (cho phép hoàn toàn bộ hoặc hoàn 1 phần)
  const [refundModalTicket, setRefundModalTicket] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refundError, setRefundError] = useState('');

  // State quản lý Modal Hoàn Thành / Hoàn Tất (ghi chú tùy chọn)
  const [resolveModalTicket, setResolveModalTicket] = useState(null);
  const [resolveNote, setResolveNote] = useState('');

  // State quản lý Modal Lịch Sử Phiếu Đã Xử Lý (có lọc + phân trang)
  const [historyFilter, setHistoryFilter] = useState('ALL'); // 'ALL' | 'RESOLVED' | 'REJECTED'
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistoryTickets = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const statusParam = historyFilter === 'ALL' ? 'RESOLVED,REJECTED' : historyFilter;
      const res = await supportService.getStaffRequests({
        type: 'MACHINE_SUPPORT,ORDER_DISPUTE',
        status: statusParam,
        limit: HISTORY_PAGE_SIZE,
        offset: (historyPage - 1) * HISTORY_PAGE_SIZE,
      });
      setHistoryRows(res.rows || []);
      setHistoryCount(res.count || 0);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử ticket đã xử lý:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyFilter, historyPage]);

  useEffect(() => {
    if (isHistoryOpen) {
      fetchHistoryTickets();
    }
  }, [isHistoryOpen, fetchHistoryTickets]);

  // Mở Modal Duyệt Hoàn Tiền với giá trị mặc định = số tiền còn lại có thể hoàn
  const handleOpenRefundModal = (ticket) => {
    const { remainingRefundable } = getOrderRefundInfo(ticket);
    setRefundModalTicket(ticket);
    setRefundAmount(remainingRefundable > 0 ? String(remainingRefundable) : '');
    setRefundNote('Duyệt hoàn tiền sự cố món ăn');
    setRefundError('');
  };

  // Xử lý submit Từ Chối
  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectModalTicket || !rejectReason.trim()) return;
    onProcessTicket(rejectModalTicket.request_id, 'REJECT', null, rejectReason.trim(), rejectModalTicket.type);
    setRejectModalTicket(null);
    setRejectReason('');
  };

  // Xử lý submit Hoàn Tiền (validate chặt > 0 và <= remainingRefundable, không gửi null)
  const handleConfirmRefund = (e) => {
    e.preventDefault();
    if (!refundModalTicket) return;

    const { remainingRefundable } = getOrderRefundInfo(refundModalTicket);
    if (remainingRefundable <= 0) {
      setRefundError('Đơn hàng này đã được hoàn đủ 100% trước đó.');
      return;
    }

    const parsedAmount = parseFloat(refundAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setRefundError('Số tiền hoàn trả phải là số lớn hơn 0đ.');
      return;
    }
    if (parsedAmount > remainingRefundable) {
      setRefundError(
        `Số tiền hoàn (${parsedAmount.toLocaleString('vi-VN')}đ) vượt quá mức còn lại có thể hoàn (${remainingRefundable.toLocaleString('vi-VN')}đ).`
      );
      return;
    }
    if (!refundNote.trim()) {
      setRefundError('Vui lòng nhập lý do hoàn tiền sự cố.');
      return;
    }

    onProcessTicket(
      refundModalTicket.request_id,
      'REFUND',
      parsedAmount,
      refundNote.trim(),
      refundModalTicket.type
    );
    setRefundModalTicket(null);
    setRefundAmount('');
    setRefundNote('');
    setRefundError('');
  };

  // Xử lý submit Hoàn Thành / Hoàn Tất (ghi chú tùy chọn)
  const handleConfirmResolve = (e) => {
    e.preventDefault();
    if (!resolveModalTicket) return;
    onProcessTicket(
      resolveModalTicket.request_id,
      'RESOLVE',
      null,
      resolveNote.trim(),
      resolveModalTicket.type
    );
    setResolveModalTicket(null);
    setResolveNote('');
  };

  const totalHistoryPages = Math.max(1, Math.ceil(historyCount / HISTORY_PAGE_SIZE));
  const refundInfo = refundModalTicket ? getOrderRefundInfo(refundModalTicket) : null;

  return (
    <>
      {/* NỘI DUNG LƯỚI PHIẾU ĐANG MỞ (PENDING / IN_PROGRESS) */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-medium">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-cyan-600 mb-3" />
          Đang đồng bộ danh sách yêu cầu hỗ trợ và khiếu nại...
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs font-medium bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
          🎉 Không có yêu cầu hỗ trợ hoặc khiếu nại nào đang chờ xử lý!
        </div>
      ) : (
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
                    ? 'bg-cyan-50/30 border-cyan-300 ring-1 ring-cyan-200'
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
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
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

                {/* Nút thao tác của Thu ngân theo đúng State Machine 2 bước */}
                {!isResolved && !isRejected && (
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onProcessTicket(t.request_id, 'IN_PROGRESS', null, '', t.type)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-2xs transition cursor-pointer"
                      >
                        Tiếp Nhận
                      </button>
                    )}

                    {isInProgress && t.type === 'MACHINE_SUPPORT' && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolveModalTicket(t);
                          setResolveNote('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Hoàn Thành</span>
                      </button>
                    )}

                    {isInProgress && t.type === 'ORDER_DISPUTE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenRefundModal(t)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Duyệt Hoàn Tiền</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResolveModalTicket(t);
                            setResolveNote('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-2xs transition cursor-pointer"
                        >
                          Hoàn Tất
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalTicket(t);
                            setRejectReason('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold text-xs shadow-2xs transition cursor-pointer"
                        >
                          Từ Chối
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
                    Lý do từ chối khiếu nại <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ví dụ: Món đã giao đúng định lượng, khiếu nại không hợp lệ..."
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

      {/* 2. MODAL DUYỆT HOÀN TIỀN (ĐỒNG BỘ UX VỚI F&B — HỖ TRỢ HOÀN 1 PHẦN) */}
      {refundModalTicket && refundInfo &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Duyệt Hoàn Tiền Đơn #{refundModalTicket.order_id}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Ticket #{refundModalTicket.request_id} • @{refundModalTicket.member?.userInfo?.username || 'khach'}
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

              {/* Tóm tắt giá trị đơn & số tiền còn lại có thể hoàn */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Giá trị gốc của đơn:</span>
                  <strong className="font-mono text-slate-900">
                    {refundInfo.orderTotal.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
                {refundInfo.alreadyRefunded > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Đã hoàn trước đó:</span>
                    <strong className="font-mono">
                      -{refundInfo.alreadyRefunded.toLocaleString('vi-VN')}đ
                    </strong>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-amber-200/80 font-bold text-amber-900">
                  <span>Còn lại có thể hoàn:</span>
                  <span className="font-mono">
                    {refundInfo.remainingRefundable.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 pt-1 italic">
                  ✓ Tiền hoàn sẽ được ghi sổ cái và hoàn trả theo phương thức thanh toán gốc (Ví hội viên nếu trả bằng Ví, hoặc xuất quỹ Tiền mặt nếu trả tiền mặt).
                </p>
              </div>

              {refundInfo.remainingRefundable <= 0 ? (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Đơn hàng này đã được hoàn đủ 100% trước đó (có thể đã hoàn tại tab F&amp;B). Vui lòng dùng nút Hoàn Tất hoặc Từ Chối để đóng phiếu.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleConfirmRefund} className="space-y-3.5">
                  {refundError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{refundError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số tiền hoàn (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={refundInfo.remainingRefundable}
                      required
                      value={refundAmount}
                      onChange={(e) => {
                        setRefundAmount(e.target.value);
                        setRefundError('');
                      }}
                      placeholder="Nhập số tiền cần hoàn..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lý do / Ghi chú hoàn tiền <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={refundNote}
                      onChange={(e) => {
                        setRefundNote(e.target.value);
                        setRefundError('');
                      }}
                      placeholder="Ví dụ: Hoàn tiền 1 chai Sting giao thiếu, món ăn bị nguội..."
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
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
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Xác Nhận Hoàn Tiền</span>
                    </button>
                  </div>
                </form>
              )}

              {refundInfo.remainingRefundable <= 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setRefundModalTicket(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* 3. MODAL XÁC NHẬN HOÀN THÀNH / HOÀN TẤT (GHI CHÚ TÙY CHỌN) */}
      {resolveModalTicket &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {resolveModalTicket.type === 'ORDER_DISPUTE'
                        ? `Hoàn Tất Khiếu Nại #${resolveModalTicket.request_id}`
                        : `Hoàn Thành Hỗ Trợ #${resolveModalTicket.request_id}`}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {resolveModalTicket.computer?.computer_name || 'NGOÀI QUÁN'} • @{resolveModalTicket.member?.userInfo?.username || 'khach'}
                      {resolveModalTicket.order_id ? ` • Đơn #${resolveModalTicket.order_id}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResolveModalTicket(null);
                    setResolveNote('');
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmResolve} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú xử lý <span className="text-slate-400 font-normal">(Tùy chọn)</span>:
                  </label>
                  <textarea
                    rows={3}
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                    placeholder={
                      resolveModalTicket.type === 'ORDER_DISPUTE'
                        ? 'VD: Đã đổi phần mì mới cho khách, đã bổ sung nước... (Để trống sẽ dùng ghi chú mặc định)'
                        : 'VD: Đã đổi chuột mới, khách bấm nhầm chuông... (Để trống sẽ dùng ghi chú mặc định)'
                    }
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white font-medium outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResolveModalTicket(null);
                      setResolveNote('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
                  >
                    {resolveModalTicket.type === 'ORDER_DISPUTE'
                      ? 'Xác Nhận Hoàn Tất'
                      : 'Xác Nhận Hoàn Thành'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* 4. MODAL LỊCH SỬ PHIẾU ĐÃ XỬ LÝ (LỌC NHANH + PHÂN TRANG) */}
      {isHistoryOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col my-auto">
              {/* Header Modal Lịch Sử */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Lịch Sử Yêu Cầu &amp; Khiếu Nại Đã Xử Lý
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Lưu trữ đầy đủ các phiếu hỗ trợ máy trạm và khiếu nại F&amp;B đã đóng
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCloseHistory}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thanh lọc nhanh 3 nút (Pill Filters) */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'ALL', label: 'Tất cả', activeCls: 'bg-slate-900 text-white' },
                    { id: 'RESOLVED', label: 'Đã hoàn tất', activeCls: 'bg-emerald-600 text-white' },
                    { id: 'REJECTED', label: 'Đã từ chối', activeCls: 'bg-rose-600 text-white' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setHistoryFilter(f.id);
                        setHistoryPage(1);
                      }}
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

                <button
                  type="button"
                  onClick={fetchHistoryTickets}
                  disabled={loadingHistory}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                  title="Tải lại lịch sử"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-cyan-600' : ''}`} />
                </button>
              </div>

              {/* Danh sách cuộn độc lập */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[240px]">
                {loadingHistory ? (
                  <div className="py-16 text-center text-xs text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
                    Đang tải lịch sử phiếu đã xử lý...
                  </div>
                ) : historyRows.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Chưa có phiếu nào trong mục này.
                  </div>
                ) : (
                  historyRows.map((item) => {
                    const isResolved = item.status === 'RESOLVED';
                    return (
                      <div
                        key={item.request_id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-cyan-400 font-mono text-[11px] font-black">
                              {item.computer?.computer_name || 'NGOÀI QUÁN'}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-500">
                              #{item.request_id}
                            </span>
                            {item.type === 'ORDER_DISPUTE' && item.order_id && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black font-mono">
                                Đơn #{item.order_id}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 font-mono">
                              @{item.member?.userInfo?.username || 'khach'}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isResolved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isResolved ? 'Đã Hoàn Tất' : 'Đã Từ Chối'}
                          </span>
                        </div>

                        <p className="text-xs font-extrabold text-slate-900">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-slate-600 italic">"{item.description}"</p>
                        )}
                        {item.resolution_note && (
                          <p className="text-[11px] p-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium">
                            <strong className="text-slate-900">Ghi chú xử lý:</strong> {item.resolution_note}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                          <span>Người xử lý: {item.resolver?.full_name || 'Nhân viên quầy'}</span>
                          <span>{new Date(item.updated_at || item.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer phân trang Trang trước / Trang sau */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Trang <strong className="text-slate-900">{historyPage}</strong> / {totalHistoryPages} ({historyCount} phiếu)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={historyPage <= 1 || loadingHistory}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Trang trước</span>
                  </button>
                  <button
                    type="button"
                    disabled={historyPage >= totalHistoryPages || loadingHistory}
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}