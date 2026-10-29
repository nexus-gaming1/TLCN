import React, { useState, useEffect } from 'react';
import {
  X,
  Gamepad2,
  FolderOpen,
  Wifi,
  Monitor,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Tag,
  Edit3,
  Save,
  Upload,
  HardDrive,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function GameDetailDrawer({
  isOpen,
  game,
  categories = [],
  onClose,
  onUpdateGame,
  onToggleAvailability,
  initialEditMode = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form state for inline editing
  const [formData, setFormData] = useState({
    name: '',
    category_id: 1,
    cover_image_url: '',
    executable_path: '',
    is_remote_supported: false,
    is_available: true
  });

  // Đồng bộ khi game thay đổi hoặc khi mở drawer
  useEffect(() => {
    if (game) {
      setFormData({
        name: game.name || '',
        category_id: game.category_id || categories[0]?.category_id || 1,
        cover_image_url: game.cover_image_url || '',
        executable_path: game.executable_path || '',
        is_remote_supported: Boolean(game.is_remote_supported),
        is_available: Boolean(game.is_available)
      });
      setIsEditing(initialEditMode);
      setFormError(null);
    }
  }, [game, initialEditMode, categories]);

  // Phím ESC để đóng
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, onClose]);

  if (!isOpen || !game) return null;

  const handleCopyPath = () => {
    if (game.executable_path) {
      navigator.clipboard.writeText(game.executable_path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLocalImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Vui lòng chọn file hình ảnh hợp lệ (.jpg, .png, .webp)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result;
      if (base64Data) {
        setFormData((prev) => ({ ...prev, cover_image_url: base64Data }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Chọn file thực thi trực tiếp từ thư mục máy tính
  const handleLocalExeSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fullPath = file.path;
    if (fullPath) {
      setFormData((prev) => ({ ...prev, executable_path: fullPath }));
    } else {
      const currentPath = formData.executable_path || '';
      const lastSlashIndex = Math.max(currentPath.lastIndexOf('\\'), currentPath.lastIndexOf('/'));
      const folderPrefix = lastSlashIndex !== -1 ? currentPath.substring(0, lastSlashIndex + 1) : 'D:\\Games\\';
      setFormData((prev) => ({ ...prev, executable_path: `${folderPrefix}${file.name}` }));
    }
    e.target.value = '';
  };

  const handleSaveInlineEdit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Tên trò chơi không được để trống');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onUpdateGame(game.game_id, formData);
      setIsEditing(false);
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'Lỗi khi cập nhật trò chơi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAvailable = Boolean(game.is_available);
  const computers = game.Computers || [];

  return (
    <>
      {/* Backdrop overlay mờ nhẹ, click vào đóng Drawer */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel trượt từ cạnh phải */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] md:w-[540px] bg-white shadow-2xl flex flex-col border-l border-slate-200 transform transition-transform duration-300 ease-out animate-in slide-in-from-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Toolbar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              #GM-{String(game.game_id).padStart(3, '0')}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isAvailable
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isAvailable ? 'Đang phục vụ' : 'Tạm ngưng'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="Đóng (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Ảnh Bìa HD */}
        <div className="relative h-44 bg-slate-900 shrink-0 overflow-hidden">
          {(isEditing ? formData.cover_image_url : game.cover_image_url) ? (
            <>
              <img
                src={isEditing ? formData.cover_image_url : game.cover_image_url}
                alt={game.name}
                className="w-full h-full object-cover opacity-85"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full hidden items-center justify-center bg-slate-800 text-slate-500">
                <Gamepad2 className="w-12 h-12" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-600">
              <Gamepad2 className="w-14 h-14" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

          <div className="absolute bottom-3 left-5 right-5 flex items-end justify-between pointer-events-none">
            <div className="max-w-[75%]">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                {game.GameCategory?.name || 'Chưa phân nhóm'}
              </span>
              <h2 className="text-xl font-black text-white truncate drop-shadow-sm mt-0.5">
                {isEditing ? formData.name || game.name : game.name}
              </h2>
            </div>
            {game.is_remote_supported && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-indigo-200 bg-indigo-900/80 border border-indigo-500/40 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                WebRTC Cloud
              </span>
            )}
          </div>
        </div>

        {/* Nội Dung Cuộn Bên Dưới (Tùy theo Mode View hay Inline Edit) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* CHẾ ĐỘ 1: XEM CHI TIẾT (VIEW MODE)                              */}
          {/* ============================================================== */}
          {!isEditing ? (
            <div className="space-y-4.5">
              {/* Thẻ Thể loại & Remote Play */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-sky-600" />
                    Thể Loại
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {game.GameCategory?.name || 'Chưa phân loại'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                    Remote Play
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {game.is_remote_supported ? (
                      <span className="text-indigo-700">WebRTC 60 FPS</span>
                    ) : (
                      <span className="text-slate-500">Chỉ Chơi Local</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Đường dẫn thực thi BootROM SAN */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Đường Dẫn Thực Thi BootROM (.exe)
                </label>
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 break-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{game.executable_path || 'Chưa thiết lập đường dẫn'}</span>
                  </div>
                  {game.executable_path && (
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 shrink-0 cursor-pointer transition-all"
                      title="Sao chép đường dẫn"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Phân phối máy trạm */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-sky-600" />
                    Trạm Máy Phân Phối ({computers.length} Máy)
                  </label>
                  <span className="text-[11px] font-semibold text-sky-600">Ổ SAN BootROM iSCSI</span>
                </div>

                {computers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {computers.map((c) => (
                      <span
                        key={c.computer_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px] font-bold shadow-2xs"
                      >
                        <Monitor className="w-3 h-3 text-sky-600" />
                        {c.computer_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs text-center font-medium">
                    Tự động đồng bộ trên toàn bộ dàn máy trạm trong phòng máy (All 36 Stations).
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* CHẾ ĐỘ 2: CHỈNH SỬA TRỰC TIẾP TẠI CHỖ (INLINE EDIT MODE)       */
            /* ============================================================== */
            <form onSubmit={handleSaveInlineEdit} className="space-y-4">
              {/* Tên game */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên Trò Chơi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              {/* Thể loại */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Thể Loại / Phân Khu <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category_id: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ảnh bìa URL hoặc file */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  URL Ảnh Bìa Game
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cover_image_url: e.target.value }))}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh</span>
                    <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Đường dẫn file .exe */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Đường Dẫn File Thực Thi (.exe)
                  </label>
                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn từ máy...</span>
                    <input
                      type="file"
                      accept=".exe,.bat,.cmd,*"
                      onChange={handleLocalExeSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.executable_path}
                  onChange={(e) => setFormData((prev) => ({ ...prev, executable_path: e.target.value }))}
                  placeholder="D:\Games\Steam\..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              {/* Cờ tính năng (Remote Play & Is Available) */}
              <div className="pt-2 grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_remote_supported}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_remote_supported: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-800">Remote Play (WebRTC)</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_available: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-600"
                  />
                  <span className="text-xs font-bold text-slate-800">Đang Sẵn Sàng Phục Vụ</span>
                </label>
              </div>

              {/* Nút Submit inline */}
              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi Ngay'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Bottom Actions */}
        {!isEditing && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => onToggleAvailability(game)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isAvailable
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isAvailable ? 'Tạm Ngưng Trò Chơi' : 'Kích Hoạt Phục Vụ'}
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh Sửa Chi Tiết</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
