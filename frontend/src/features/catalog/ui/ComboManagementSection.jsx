import React, { useState, useEffect } from 'react';
import {
  Clock,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Coffee,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import comboService from '../../../shared/api/combo.service';
import CreateEditComboModal from './CreateEditComboModal';

export default function ComboManagementSection() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);

  const fetchCombos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await comboService.getCombos(true); // true = include inactive
      setCombos(data || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách gói Combo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  const handleToggleStatus = async (combo) => {
    try {
      await comboService.toggleComboStatus(combo.combo_id, !combo.is_active);
      await fetchCombos();
    } catch (err) {
      alert(err.message || 'Lỗi khi thay đổi trạng thái gói combo');
    }
  };

  const handleDeleteCombo = async (combo) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa gói "${combo.name}"? Nếu gói đã có lịch sử đơn hàng, hệ thống sẽ tự động chuyển sang ngừng kinh doanh để bảo toàn dữ liệu.`
      )
    ) {
      try {
        const res = await comboService.deleteCombo(combo.combo_id);
        alert(res?.message || 'Xóa gói combo thành công');
        await fetchCombos();
      } catch (err) {
        alert(err.message || 'Lỗi khi xóa gói combo');
      }
    }
  };

  const handleSaveCombo = async (payload, comboId) => {
    if (comboId) {
      await comboService.updateCombo(comboId, payload);
    } else {
      await comboService.createCombo(payload);
    }
    await fetchCombos();
  };

  const filteredCombos = combos.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Top action toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm gói Combo Time..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCombos}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingCombo(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Gói Combo Mới</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Đang tải danh sách gói Combo Time...</p>
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-extrabold text-slate-700">Chưa có gói Combo Time nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Tạo các gói Combo trả trước tích hợp F&amp;B để thu hút game thủ cày rank và tối ưu doanh thu phòng máy.
          </p>
          <button
            onClick={() => {
              setEditingCombo(null);
              setIsModalOpen(true);
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Gói Đầu Tiên</span>
          </button>
        </div>
      ) : (
        /* Combo Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCombos.map((combo) => {
            const durationMins = combo.duration_minutes || combo.duration_time || 0;
            const hours = (durationMins / 60).toFixed(1);
            const items = combo.comboItems || [];

            return (
              <div
                key={combo.combo_id}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-xs transition-all hover:shadow-md ${
                  combo.is_active ? 'border-slate-200/90' : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                            combo.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {combo.is_active ? 'Đang Bán' : 'Tạm Ngưng'}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Zone Tier ≤ {combo.allowed_tier || 1}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1.5">{combo.name}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-emerald-600">
                        {parseFloat(combo.price || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {combo.description && (
                    <p className="text-xs text-slate-500 mt-2.5 line-clamp-2">{combo.description}</p>
                  )}

                  {/* Badges / Specs */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Thời lượng</span>
                        <span className="font-extrabold font-mono text-slate-800">
                          {durationMins} phút ({hours}h)
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-500 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Khung Giờ</span>
                        <span className="font-extrabold text-slate-800 text-[11px]">
                          {combo.start_time && combo.end_time
                            ? `${combo.start_time.slice(0, 5)} - ${combo.end_time.slice(0, 5)}`
                            : 'Cả ngày (24/7)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Included Items */}
                  <div className="mt-3.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-amber-600" />
                      Dịch Vụ Kèm Theo ({items.length})
                    </span>

                    {items.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Chỉ gồm giờ chơi, không kèm F&amp;B</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-semibold"
                          >
                            <span>{it.serviceItem?.name || `Món #${it.service_item_id}`}</span>
                            <span className="font-mono font-bold text-amber-700 bg-amber-100 px-1 rounded text-[10px]">
                              x{it.quantity}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(combo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      combo.is_active
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {combo.is_active ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ngưng Bán</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kích Hoạt</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCombo(combo);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa combo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCombo(combo)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Xóa combo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateEditComboModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCombo(null);
        }}
        combo={editingCombo}
        onSubmit={handleSaveCombo}
      />
    </div>
  );
}
