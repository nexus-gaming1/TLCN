import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import supportService from '../../../shared/api/support.service';
import { socket, connectSocket } from '../../../shared/socket/socket';
import { BellRing, Star, History, X, CheckCircle2, AlertCircle, Wrench} from 'lucide-react';

export default function CustomerSupportModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ASSIST'); // 'ASSIST' | 'FEEDBACK' | 'HISTORY'
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form gọi hỗ trợ máy
  const [supportTag, setSupportTag] = useState('Lỗi chuột / Bàn phím');
  const [supportDesc, setSupportDesc] = useState('');

  // Form Đánh giá chất lượng
  const [ratingStars, setRatingStars] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  // Lịch sử yêu cầu
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await supportService.getMyRequests();
      setHistoryList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Lắng nghe cập nhật Realtime từ nhân viên thu ngân
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'HISTORY') fetchHistory();

      connectSocket();
      const handleTicketUpdated = () => {
        fetchHistory();
      };

      socket.on('support:updated', handleTicketUpdated);
      return () => {
        socket.off('support:updated', handleTicketUpdated);
      };
    }
  }, [isOpen, activeTab, fetchHistory]);

  if (!isOpen) return null;

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (supportTag === 'Vấn đề khác' && !supportDesc.trim()) {
      setToast({ type: 'error', msg: 'Vui lòng nhập mô tả chi tiết cho vấn đề khác của bạn' });
      return;
    }

    setSubmitting(true);
    try {
      const title = `[HỖ TRỢ THIẾT BỊ] ${supportTag}`;
      await supportService.createRequest({
        type: 'MACHINE_SUPPORT',
        title,
        description: supportDesc.trim() || supportTag
      });
      setToast({ type: 'success', msg: 'Đã gửi yêu cầu gọi nhân viên! Nhân viên quầy sẽ tới máy hỗ trợ bạn ngay.' });
      setSupportDesc('');
      setTimeout(() => {
        setToast(null);
        setActiveTab('HISTORY');
      }, 1200);
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Không thể gửi yêu cầu hỗ trợ';
      setToast({ type: 'error', msg: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await supportService.createRequest({
        type: 'FEEDBACK',
        rating: ratingStars,
        description: feedbackText.trim()
      });
      setToast({ type: 'success', msg: 'Cảm ơn bạn đã đóng góp ý kiến đánh giá dịch vụ quán!' });
      setFeedbackText('');
      setTimeout(() => {
        setToast(null);
        setActiveTab('HISTORY');
      }, 1200);
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Không thể gửi đánh giá' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (st) => {
    switch (st) {
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Chờ tiếp nhận</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold animate-pulse">Đang xử lý</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Đã xử lý</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">Đã từ chối</span>;
      default:
        return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Trung Tâm Hỗ Trợ & Đánh Giá</h3>
              <p className="text-[11px] text-slate-400 font-mono">NEXUS Cyber Care Desk</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-slate-100 font-mono text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ASSIST')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ASSIST' ? 'bg-white text-cyan-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Gọi Nhân Viên</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FEEDBACK')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'FEEDBACK' ? 'bg-white text-cyan-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Đánh Giá Quán</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY' ? 'bg-white text-cyan-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử</span>
          </button>
        </div>

        {/* Alert Toast */}
        {toast && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Tab 1: Gọi nhân viên */}
        {activeTab === 'ASSIST' && (
          <form onSubmit={handleSupportSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Bạn đang gặp vấn đề gì?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Lỗi chuột / Bàn phím',
                  'Lỗi tai nghe / Không có tiếng',
                  'Màn hình giật / Đơ máy',
                  'Mạng lag / Không vào được game',
                  'Cần nhân viên hỗ trợ tại máy',
                  'Vấn đề khác',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSupportTag(tag)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      supportTag === tag ? 'bg-cyan-50 border-cyan-300 text-cyan-900 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mô tả thêm {supportTag === 'Vấn đề khác' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={2}
                value={supportDesc}
                onChange={(e) => setSupportDesc(e.target.value)}
                placeholder="Ví dụ: Đổi tai nghe bên trái bị tịt..."
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                required={supportTag === 'Vấn đề khác'}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BellRing className="w-4 h-4" />
              <span>{submitting ? 'Đang gửi tín hiệu...' : 'Rung Chuông Gọi Nhân Viên Ngay'}</span>
            </button>
          </form>
        )}

        {/* Tab2: Đánh giá quán */}
        {activeTab === 'FEEDBACK' && (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="text-center space-y-2">
              <label className="block text-xs font-bold text-slate-700">Chất lượng phiên chơi hôm nay thế nào?</label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 cursor-pointer transition hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${star <= ratingStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-black text-amber-600 block">
                {ratingStars === 5 ? 'Tuyệt vời, máy cực mượt! ⭐⭐⭐⭐⭐' : ratingStars === 4 ? 'Khá hài lòng! ⭐⭐⭐⭐' : ratingStars === 3 ? 'Bình thường ⭐⭐⭐' : 'Cần cải thiện ⭐⭐'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đóng góp ý kiến cho quán <span className="text-rose-500">*</span></label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Góp ý về thái độ nhân viên, máy lạnh, vệ sinh phòng máy..."
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Star className="w-4 h-4" />
              <span>{submitting ? 'Đang gửi...' : 'Gửi Đánh Giá & Góp Ý'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Lịch sử ticket */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {loadingHistory ? (
              <p className="text-xs text-center text-slate-400 py-6">Đang tải lịch sử...</p>
            ) : historyList.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-6">Bạn chưa có yêu cầu hỗ trợ nào.</p>
            ) : (
              historyList.map((item) => (
                <div key={item.request_id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 truncate max-w-[240px]">{item.title}</span>
                    {statusBadge(item.status)}
                  </div>
                  {item.description && <p className="text-slate-600 italic text-[11px]">"{item.description}"</p>}
                  {item.resolution_note && (
                    <p className="text-emerald-700 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200 text-[11px] font-medium">
                      ✓ Phản hồi từ quầy: {item.resolution_note}
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(item.created_at).toLocaleString('vi-VN')} {item.computer?.computer_name && `• Tại ${item.computer.computer_name}`}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}