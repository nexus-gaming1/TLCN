import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, MessageSquare, ThumbsUp, AlertTriangle } from 'lucide-react';

export default function ViewAllFeedbacksModal({
  isOpen,
  onClose,
  feedbacks = [],
  loading = false,
}) {
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'POSITIVE' | 'CRITICAL'

  if (!isOpen) return null;

  // Đếm số lượng theo nhóm sao
  const totalCount = feedbacks.length;
  const positiveCount = feedbacks.filter((f) => (f.rating || 5) >= 4).length;
  const criticalCount = feedbacks.filter((f) => (f.rating || 5) <= 3).length;

  // Lọc dữ liệu client-side mượt mà
  const filteredFeedbacks = feedbacks.filter((f) => {
    const star = f.rating || 5;
    if (activeFilter === 'POSITIVE') return star >= 4;
    if (activeFilter === 'CRITICAL') return star <= 3;
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col my-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Tất Cả Đánh Giá &amp; Góp Ý Từ Khách Hàng
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Khảo sát mức độ hài lòng (CSAT) và ý kiến đóng góp thực tế
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bộ lọc nhanh 3 nút (Pill Filters) */}
        <div className="flex items-center gap-2 pt-1 pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tất cả ({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('POSITIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'POSITIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Khen ngợi 4-5⭐ ({positiveCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cần cải thiện 1-3⭐ ({criticalCount})</span>
          </button>
        </div>

        {/* Danh sách cuộn độc lập */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              Đang tải danh sách đánh giá...
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Không có đánh giá nào trong danh mục này.
            </div>
          ) : (
            filteredFeedbacks.map((fb) => {
              const star = fb.rating || 5;
              const isPositive = star >= 4;

              return (
                <div
                  key={fb.request_id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:border-slate-300 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">
                        @{fb.member?.userInfo?.username || 'khach'}
                      </span>
                      <span className="text-xs text-amber-500 font-black">
                        {'⭐'.repeat(star)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({star}/5)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isPositive ? 'Hài lòng' : 'Cần chú ý'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(fb.created_at).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {fb.description ? (
                    <p className="text-xs text-slate-600 font-medium italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{fb.description}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      (Khách hàng không để lại nhận xét văn bản)
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Chế độ chỉ đọc (View-only)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
