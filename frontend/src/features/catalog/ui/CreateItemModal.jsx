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

  useEffect(() => {
    setErrorMsg('');
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

  if (!isOpen) return null;

    const handleSubmit = (e) => {
    e.preventDefault();
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
    if (onSubmit) {
      onSubmit(payload, item?.service_item_id);
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* ... giữ nguyên phần Header của Modal ... */}
        {/* Thông báo lỗi inline thay cho window.alert */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {/* form của modal */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          {/* ... giữ nguyên 2 ô input Tên Món Dịch Vụ & Danh Mục Dịch Vụ ... */}
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
          {/* ... giữ nguyên khối Trạng Thái Phục Vụ và các nút bấm hành động ... */}
        </form>
      </div>
    </div>,
    document.body
  );
}