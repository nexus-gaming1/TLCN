import React, { useState, useEffect } from 'react';
import { X, Utensils, PlusCircle, AlertCircle } from 'lucide-react';

export default function CreateItemModal({ isOpen, onClose, item, categories = [], defaultCategoryId = '', onSubmit }) {
  const isEdit = !!item;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState(10);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategoryId(item.category_id || '');
      setPrice(item.price || '');
      setStockQuantity(item.stock_quantity !== undefined ? item.stock_quantity : 10);
      setIsAvailable(item.is_available !== undefined ? Boolean(item.is_available) : true);
    } else {
      setName('');
      setCategoryId(defaultCategoryId || (categories.length > 0 ? categories[0].category_id : ''));
      setPrice('');
      setStockQuantity(10);
      setIsAvailable(true);
    }
  }, [item, isOpen, defaultCategoryId, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Vui lòng nhập tên món dịch vụ');
      return;
    }

    if (!categoryId) {
      alert('Vui lòng chọn danh mục cho dịch vụ');
      return;
    }

    if (price === '' || parseFloat(price) < 0) {
      alert('Vui lòng nhập đơn giá hợp lệ (>= 0)');
      return;
    }

    const payload = {
      name: name.trim(),
      category_id: parseInt(categoryId, 10),
      price: parseFloat(price),
      stock_quantity: parseInt(stockQuantity, 10) || 0,
      is_available: isAvailable
    };

    if (onSubmit) {
      onSubmit(payload, item?.service_item_id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* phần header của modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-bold">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isEdit ? 'Chỉnh Sửa Món Dịch Vụ' : 'Thêm Món Dịch Vụ Mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">Quản lý Catalog F&amp;B Cyber</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* form của modal */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
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

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tồn Kho Ban Đầu</label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="block font-bold text-slate-800 text-xs">Trạng Thái Phục Vụ</span>
              <span className="block text-[11px] text-slate-500">Sẵn sàng để khách đặt món</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600 shadow-2xs"></div>
            </label>
          </div>

          {/* các nút bấm hành động*/}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-lg text-xs shadow-xs transition"
            >
              {isEdit ? 'Lưu Thay Đổi' : '+ Thêm Món Dịch Vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}