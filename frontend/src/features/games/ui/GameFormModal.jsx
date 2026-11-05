import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Save,
  Gamepad2,
  Image,
  FolderOpen,
  Wifi,
  AlertCircle,
  Upload,
  HardDrive,
  Trash2,
  ExternalLink
} from 'lucide-react';

import gameService from '../../../shared/api/game.service';

export default function GameFormModal({
  isOpen,
  mode = 'create',
  game = null,
  initialData = null,
  onClose,
  onSubmit,
  categories = [],
  onCategoryCreated
}) {
  const activeGame = game || initialData;
  const isEditMode = mode === 'edit' || Boolean(activeGame);
  const fileInputRef = useRef(null);
  const exeFileInputRef = useRef(null);

  const [categoryList, setCategoryList] = useState(categories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoryList(categories);
    }
  }, [categories]);

  const getInitialState = () => ({
    name: activeGame?.name || '',
    category_id: activeGame?.category_id || categories[0]?.category_id || 1,
    cover_image_url: activeGame?.cover_image_url || '',
    executable_path: activeGame?.executable_path || '',
    is_remote_supported: activeGame ? Boolean(activeGame.is_remote_supported) : true,
    is_available: activeGame ? Boolean(activeGame.is_available) : true
  });

  const [formData, setFormData] = useState(getInitialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());
      setError(null);
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen, activeGame, categories]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Tạo thể loại game mới trực tiếp
  const handleCreateCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('Vui lòng nhập tên thể loại mới');
      return;
    }

    try {
      setIsSubmittingCategory(true);
      setError(null);
      const created = await gameService.createCategory(newCategoryName.trim());
      if (created) {
        setCategoryList((prev) => {
          if (prev.some((c) => c.category_id === created.category_id)) return prev;
          return [...prev, created];
        });
        handleChange('category_id', created.category_id);
        if (onCategoryCreated) {
          onCategoryCreated(created);
        }
        setNewCategoryName('');
        setIsAddingCategory(false);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tạo thể loại mới');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  // Xử lý tải ảnh cục bộ từ máy tính qua FileReader
  const handleLocalImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ (.jpg, .png, .webp)');
      return;
    }

    // Giới hạn kích thước ảnh 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result;
      if (base64Data) {
        handleChange('cover_image_url', base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  // Xử lý chọn file thực thi (.exe) trực tiếp từ thư mục máy tính
  const handleLocalExeSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Lấy đường dẫn tuyệt đối nếu môi trường hỗ trợ, hoặc ghép tên file với thư mục mặc định
    const fullPath = file.path;
    if (fullPath) {
      handleChange('executable_path', fullPath);
    } else {
      const currentPath = formData.executable_path || '';
      const lastSlashIndex = Math.max(currentPath.lastIndexOf('\\'), currentPath.lastIndexOf('/'));
      const folderPrefix = lastSlashIndex !== -1 ? currentPath.substring(0, lastSlashIndex + 1) : 'D:\\Games\\';
      handleChange('executable_path', `${folderPrefix}${file.name}`);
    }
    e.target.value = '';
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên trò chơi');
      return;
    }
    if (!formData.category_id) {
      setError('Vui lòng chọn thể loại trò chơi');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isEditMode && game?.game_id) {
        await onSubmit(formData, game.game_id);
      } else {
        await onSubmit(formData);
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu trò chơi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center ${isEditMode
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-sky-50 text-sky-600 border-sky-200'
                  }`}
              >
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {isEditMode ? 'Chỉnh Sửa Trò Chơi' : 'Thêm Trò Chơi Mới'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {isEditMode
                    ? `#GM-${String(game?.game_id || 0).padStart(3, '0')} • ${game?.name || ''}`
                    : 'Đăng ký game vào kho thư viện BootROM Cyber SAN 10Gbps'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Thông báo lỗi */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* MỤC 1: TÊN GAME & THỂ LOẠI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tên Trò Chơi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ví dụ: Black Myth: Wukong, Valorant..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    Thể Loại / Phân Khu <span className="text-red-500">*</span>
                  </label>
                  {!isAddingCategory ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(true);
                        setNewCategoryName('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer transition-colors"
                      title="Tạo thêm thể loại game mới"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm thể loại</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  )}
                </div>

                {!isAddingCategory ? (
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsAddingCategory(true);
                        setNewCategoryName('');
                      } else {
                        handleChange('category_id', Number(e.target.value));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all cursor-pointer"
                  >
                    {categoryList.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="text-sky-600 font-bold">
                      + Tạo thể loại mới...
                    </option>
                  </select>
                ) : (
                  <div className="flex gap-1.5 animate-in fade-in duration-200">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategory();
                        } else if (e.key === 'Escape') {
                          setIsAddingCategory(false);
                        }
                      }}
                      placeholder="Tên thể loại (vd: Sinh Tồn, VR...)"
                      className="flex-1 px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingCategory || !newCategoryName.trim()}
                      onClick={handleCreateCategory}
                      className="px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      {isSubmittingCategory ? 'Đang tạo...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      title="Đóng"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MỤC 3: ẢNH BÌA - HYBRID BROWSE + LINK + THUMBNAIL LIVE PREVIEW (CẢI TIẾN A) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-sky-600" />
                  Ảnh Bìa Trò Chơi (Cover Art)
                </label>
                <span className="text-[10px] text-slate-400 font-normal">
                  Hỗ trợ cả Link Web &amp; Tải file cục bộ
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 items-start">
                {/* Khung Live Preview Thumbnail tỉ lệ chuẩn 3:4 (Steam Poster) */}
                <div className="relative w-24 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs group">
                  {formData.cover_image_url ? (
                    <>
                      <img
                        src={formData.cover_image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleChange('cover_image_url', '')}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer"
                        title="Xóa ảnh bìa"
                      >
                        <Trash2 className="w-5 h-5 text-rose-300" />
                        <span className="text-[10px] font-bold mt-1">Gỡ ảnh</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Image className="w-6 h-6 mb-1 text-slate-300" />
                      <span className="text-[10px] font-semibold text-slate-400 leading-tight">
                        Chưa có ảnh (3:4)
                      </span>
                    </div>
                  )}
                </div>

                {/* Vùng chọn file hoặc nhập link */}
                <div className="flex-1 w-full space-y-2.5">
                  {/* Ô nhập URL trực tiếp */}
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.cover_image_url}
                      onChange={(e) => handleChange('cover_image_url', e.target.value)}
                      placeholder="Dán link ảnh từ Steam, Epic hoặc web (https://...)..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all truncate"
                    />
                  </div>

                  {/* Nút bấm tải ảnh lên từ máy cục bộ */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLocalImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold rounded-lg text-xs transition-all border border-slate-200 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-600" />
                      <span>Tải ảnh lên từ máy tính (Browse File)</span>
                    </button>

                    <span className="text-[11px] text-slate-400">Tối đa 5MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MỤC 4: ĐƯỜNG DẪN THỰC THI & CHỌN FILE TỪ MÁY */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  Đường dẫn file thực thi (.exe) <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">BootROM / Ổ Game</span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.executable_path}
                    onChange={(e) => handleChange('executable_path', e.target.value)}
                    placeholder="D:\Games\Steam\steamapps\common\game.exe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30 transition-all truncate"
                  />
                </div>

                {/* Input chọn file ẩn và Nút bấm mở file explorer */}
                <input
                  ref={exeFileInputRef}
                  type="file"
                  accept=".exe,.bat,.cmd,*"
                  onChange={handleLocalExeSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => exeFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                  title="Mở thư mục máy tính để chọn file (.exe)"
                >
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>Chọn từ máy tính</span>
                </button>
              </div>
            </div>


            {/* MỤC 6: CÁC CỜ CẤU HÌNH (REMOTE PLAY & KHẢ DỤNG) */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_remote_supported}
                  onChange={(e) => handleChange('is_remote_supported', e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                    Hỗ trợ Cloud Streaming (WebRTC Remote Play 60 FPS)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Cho phép hội viên chơi từ xa qua trình duyệt mạng Nexus Cloud
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => handleChange('is_available', e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    Kích hoạt sẵn sàng phục vụ
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Hiển thị trò chơi trên máy khách NetClient của hội viên
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-2.5 text-white font-extrabold rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'
                  }`}
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : isEditMode ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Thay Đổi</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Thêm Vào Kho</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
