import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Utensils, AlertCircle } from 'lucide-react';

export default function CreateItemModal({ isOpen, onClose, item, categories = [], defaultCategoryId = '', onSubmit }) {
  const isEdit = !!item;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState(10);
  const [trackInventory, setTrackInventory] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErrorMsg('');
    setSubmitting(false);
    if (item) {
      setName(item.name || '');
      setCategoryId(item.category_id || '');
      setPrice(item.price || '');
      const tracked = item.track_inventory !== undefined ? Boolean(item.track_inventory) : true;
      setTrackInventory(tracked);
      setStockQuantity(tracked ? (item.stock_quantity !== undefined ? item.stock_quantity : 10) : 0);
      setIsAvailable(item.is_available !== undefined ? Boolean(item.is_available) : true);
    } else {
      setName('');
      setCategoryId(defaultCategoryId || (categories.length > 0 ? categories[0].category_id : ''));
      setPrice('');
      setTrackInventory(true);
      setStockQuantity(10);
      setIsAvailable(true);
    }
  }, [item, isOpen, defaultCategoryId, categories]);

  // Bắt phím Esc để đóng Modal nhanh (chú ý cần đặt trước dòng if (!isOpen) return null)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên món dịch vụ');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Vui lòng chọn danh mục cho dịch vụ');
      return;
    }
    if (price === '' || parseFloat(price) < 0) {
      setErrorMsg('Vui lòng nhập đơn giá hợp lệ (>= 0)');
      return;
    }
    const parsedStock = trackInventory ? Math.max(0, parseInt(stockQuantity, 10) || 0) : 0;
    const payload = {
      name: name.trim(),
      category_id: parseInt(categoryId, 10),
      price: parseFloat(price),
      track_inventory: trackInventory,
      stock_quantity: parsedStock,
      is_available: isAvailable
    };
    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(payload, item?.service_item_id);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* 1. Header của Modal (Tiêu đề + Nút đóng X) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-bold shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isEdit ? 'Chỉnh Sửa Món Dịch Vụ' : 'Thêm Món Dịch Vụ Mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEdit ? 'Cập nhật thông tin giá bán và tồn kho' : 'Tạo món ăn hoặc nước uống mới cho thực đơn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            title="Đóng (Esc)"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Thông báo lỗi inline (thay thế hoàn toàn window.alert) */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3. Nội dung Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          {/* Ô nhập Tên món */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên Món Dịch Vụ / F&amp;B *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Mì Tôm Trứng Bò Băm, Sting Dâu 330ml..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          {/* Ô chọn Danh mục */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Danh Mục Dịch Vụ *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Công tắc phân loại Hàng đóng gói (đếm kho) vs Món chế biến (không đếm kho) */}
          <div className="flex items-center justify-between bg-sky-50/70 p-3 rounded-lg border border-sky-200/80">
            <div className="pr-3">
              <span className="block font-bold text-slate-800 text-xs">Quản lý số lượng tồn kho</span>
              <span className="block text-[11px] text-slate-500">
                Bật cho hàng đóng gói (nước chai, snack). Tắt cho món bếp chế biến (mì, cơm, trà pha).
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={trackInventory}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setTrackInventory(checked);
                  if (!checked) {
                    setStockQuantity(0);
                  } else if (Number(stockQuantity) <= 0) {
                    setStockQuantity(10);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600 shadow-2xs"></div>
            </label>
          </div>

          {/* Đơn giá & Tồn kho */}
          <div className={trackInventory ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1'}>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Đơn Giá (VNĐ) *</label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="VD: 25000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-sky-800 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            {trackInventory && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEdit ? 'Số Lượng Tồn Kho' : 'Tồn Kho Ban Đầu'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            )}
          </div>

          {/* 4. Công tắc Trạng Thái Phục Vụ */}
          <div className="pt-1 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="block font-bold text-slate-800 text-xs">Trạng Thái Phục Vụ</span>
              <span className="block text-[11px] text-slate-500">Sẵn sàng hiển thị trên thực đơn để khách đặt</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600 shadow-2xs"></div>
            </label>
          </div>

          {/* 5. Footer: Các nút hành động (Hủy & Tạo mới / Lưu thay đổi) */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Đang lưu...' : isEdit ? 'Lưu Thay Đổi' : '+ Thêm Món Dịch Vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}