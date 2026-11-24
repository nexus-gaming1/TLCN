import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import announcementService from '../../../shared/api/announcement.service';
import { Megaphone, Plus, Trash2, Eye, EyeOff, X, Sparkles, AlertCircle } from 'lucide-react';

export default function AnnouncementManagementModal({ isOpen, onClose }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('INFO');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null); // Quản lý id banner đang chờ xác nhận xóa

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const list = await announcementService.getAllAnnouncements();
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
      setIsCreating(false);
      setErrorMsg('');
    }
  }, [isOpen, fetchAnnouncements]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await announcementService.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        is_active: true,
      });
      setTitle('');
      setContent('');
      setIsCreating(false);
      fetchAnnouncements();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi tạo thông báo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
  try {
    await announcementService.toggleActive(id);
    fetchAnnouncements();
  } catch (err) {
    setErrorMsg(err.message || 'Lỗi khi cập nhật trạng thái thông báo');
  }
};
const handleDelete = async (id) => {
  try {
    await announcementService.deleteAnnouncement(id);
    setDeletingId(null);
    fetchAnnouncements();
  } catch (err) {
    setErrorMsg(err.message || 'Lỗi khi xóa thông báo');
  }
};

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Quản Lý Banner Thông Báo Quán</h3>
              <p className="text-[11px] text-slate-400 font-mono">Phát sóng thời gian thực cho mọi khách hàng</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nút bật tắt Form tạo mới */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Danh sách thông báo ({announcements.length})</span>
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer shadow-xs"
          >
            {isCreating ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isCreating ? 'Đóng Form' : 'Tạo Thông Báo Mới'}</span>
          </button>
        </div>

        {/* Form Tạo Mới */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 mb-1">Tiêu đề ngắn:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: 🎉 KHUYẾN MÃI ĐÊM CUỐI TUẦN"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 mb-1">Nội dung chi tiết (chạy trên banner):</label>
              <textarea
                required
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung thông báo cho hội viên..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-extrabold text-slate-600">Loại:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-bold outline-hidden"
                >
                  <option value="INFO">Tin Tức</option>
                  <option value="WARNING">Cảnh Báo</option>
                  <option value="PROMOTION">Khuyến Mãi</option>
                  <option value="EVENT">Sự Kiện</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? 'Đang phát sóng...' : 'Phát Sóng Ngay'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Danh sách thông báo */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Đang tải danh sách...</div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Chưa có thông báo nào được tạo.
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.announcement_id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  a.is_active ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                        a.type === 'PROMOTION'
                          ? 'bg-amber-100 text-amber-800'
                          : a.type === 'WARNING'
                          ? 'bg-rose-100 text-rose-800'
                          : a.type === 'EVENT'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {a.type}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 truncate">{a.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(a.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 font-medium">{a.content}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(a.announcement_id)}
                    className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      a.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={a.is_active ? 'Đang hiển thị - Bấm để ẩn' : 'Đang ẩn - Bấm để hiển thị'}
                  >
                    {a.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="text-[10px] font-mono hidden sm:inline">{a.is_active ? 'Bật' : 'Tắt'}</span>
                  </button>

                  {deletingId === a.announcement_id ? (
                    <div className="flex items-center gap-1 animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => handleDelete(a.announcement_id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] shadow-xs cursor-pointer"
                      >
                        Xác Nhận Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(a.announcement_id)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Xóa vĩnh viễn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}