import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, Layers, Plus, Trash2, CheckCircle, Coffee, Shield } from 'lucide-react';
import catalogService from '../../../shared/api/catalog.service';

export default function CreateEditComboModal({
  isOpen,
  onClose,
  combo = null,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: 180,
    allowed_tier: 2,
    start_time: '',
    end_time: '',
    is_active: true
  });

  const [comboItems, setComboItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available service items for inclusion
  useEffect(() => {
    if (!isOpen) return;

    const loadItems = async () => {
      try {
        const categories = await catalogService.getCategories();
        const items = [];
        (categories || []).forEach((cat) => {
          (cat.ServiceItems || []).forEach((item) => {
            if (item.is_active !== false) {
              items.push({
                ...item,
                category_name: cat.name
              });
            }
          });
        });
        setAvailableItems(items);
      } catch (err) {
        console.error('Không thể tải danh sách món dịch vụ:', err);
      }
    };

    loadItems();
  }, [isOpen]);

  // Sync form when combo prop changes
  useEffect(() => {
    if (combo) {
      setFormData({
        name: combo.name || '',
        description: combo.description || '',
        price: combo.price || '',
        duration_minutes: combo.duration_minutes || combo.duration_time || 180,
        allowed_tier: combo.allowed_tier || 2,
        start_time: combo.start_time ? combo.start_time.slice(0, 5) : '',
        end_time: combo.end_time ? combo.end_time.slice(0, 5) : '',
        is_active: combo.is_active !== undefined ? combo.is_active : true
      });

      // Extract existing combo items
      const existingItems = (combo.comboItems || []).map((ci) => ({
        service_item_id: ci.service_item_id,
        quantity: ci.quantity || 1
      }));
      setComboItems(existingItems);
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        duration_minutes: 180,
        allowed_tier: 2,
        start_time: '',
        end_time: '',
        is_active: true
      });
      setComboItems([]);
    }
    setError(null);
  }, [combo, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (availableItems.length === 0) return;
    setComboItems((prev) => [
      ...prev,
      { service_item_id: availableItems[0].service_item_id, quantity: 1 }
    ]);
  };

  const handleRemoveItem = (index) => {
    setComboItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setComboItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên gói Combo');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      setError('Giá gói Combo phải lớn hơn 0');
      return;
    }

    if (!formData.duration_minutes || Number(formData.duration_minutes) <= 0) {
      setError('Thời lượng Combo phải lớn hơn 0 phút');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        duration_minutes: Number(formData.duration_minutes),
        allowed_tier: Number(formData.allowed_tier),
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        is_active: Boolean(formData.is_active),
        items: comboItems.map((ci) => ({
          service_item_id: Number(ci.service_item_id),
          quantity: Number(ci.quantity) || 1
        }))
      };

      await onSubmit(payload, combo?.combo_id);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu gói Combo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                {combo ? 'Cập Nhật Gói Combo Time' : 'Thêm Gói Combo Time Mới'}
              </h3>
              <p className="text-xs text-slate-400">
                Gói chơi trả trước tích hợp dịch vụ F&amp;B không phụ thu giờ chơi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Row 1: Tên & Trạng thái */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Tên Gói Combo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Combo Chiến Game 3H + Sting"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Trạng thái
              </label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="active">Đang kinh doanh</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="VD: Combo dành cho game thủ cày rank đêm, tặng kèm 1 Sting dâu lạnh..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Row 2: Giá, Thời lượng, Zone Tier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Đơn giá (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="50000"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Thời lượng (Phút) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="180"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                ≈ {(formData.duration_minutes / 60).toFixed(1)} giờ chơi
              </span>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Cấp Zone Tối Đa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.allowed_tier}
                  onChange={(e) => setFormData({ ...formData, allowed_tier: Number(e.target.value) })}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>Cấp 1 - Zone Phổ thông (Zone 3)</option>
                  <option value={2}>Cấp 2 - Zone Thi đấu / VIP (Zone 1, 2)</option>
                  <option value={3}>Cấp 3 - Zone Streamer (Zone 4)</option>
                  <option value={4}>Cấp 4 - Zone Siêu VIP (Zone 5)</option>
                </select>
                <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Áp dụng máy có cấp Zone ≤ {formData.allowed_tier}
              </span>
            </div>
          </div>

          {/* Row 3: Khung giờ áp dụng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giờ Bắt Đầu Khung Giờ (Tùy chọn)
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Để trống nếu áp dụng cả ngày</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giờ Kết Thúc Khung Giờ (Tùy chọn)
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">VD: Đêm 23:00 - 06:00 sáng</span>
            </div>
          </div>

          {/* Row 4: Dịch vụ F&B Đi Kèm */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  Dịch Vụ &amp; Đồ Uống Đi Kèm (Miễn phí theo gói)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Giá combo đã bao gồm các dịch vụ này, hệ thống không tính thêm phí
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm Món</span>
              </button>
            </div>

            {comboItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                Chưa có món dịch vụ nào đi kèm gói Combo này. Nhấn "+ Thêm Món" nếu muốn kèm nước ngọt / đồ ăn.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {comboItems.map((ci, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
                  >
                    <div className="flex-1">
                      <select
                        value={ci.service_item_id}
                        onChange={(e) => handleItemChange(idx, 'service_item_id', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {availableItems.map((item) => (
                          <option key={item.service_item_id} value={item.service_item_id}>
                            [{item.category_name}] {item.name} ({parseFloat(item.price).toLocaleString('vi-VN')}đ)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={ci.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center text-slate-800"
                        placeholder="SL"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa món này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{combo ? 'Lưu Thay Đổi' : 'Tạo Gói Combo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
