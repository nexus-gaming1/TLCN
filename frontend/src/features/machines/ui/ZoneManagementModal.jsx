import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Layers,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  ShieldAlert,
  DollarSign,
  Monitor,
  Tag,
  ArrowRight
} from 'lucide-react';
import machineService from '../../../shared/api/machine.service';

const ZONE_MODES = Object.freeze({
  LIST: 'list',
  CREATE: 'create',
  EDIT: 'edit'
});

const DEFAULT_ZONE_FORM = Object.freeze({
  zone_name: '',
  code_prefix: 'PC-',
  tier_level: 1,
  max_capacity: '',
  description: ''
});

export default function ZoneManagementModal({
  isOpen = false,
  onClose,
  initialMode = ZONE_MODES.LIST,
  initialEditZone = null,
  onSuccess
}) {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tab State: 'list' | 'create' | 'edit'
  const [activeTab, setActiveTab] = useState(initialMode);
  const [editZoneId, setEditZoneId] = useState(null);
  const [editingZoneName, setEditingZoneName] = useState('');
  const [formData, setFormData] = useState(DEFAULT_ZONE_FORM);

  // Delete Confirm State
  const [deletingZone, setDeletingZone] = useState(null);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_ZONE_FORM);
    setErrorMessage(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setActiveTab(ZONE_MODES.CREATE);
    setEditZoneId(null);
    setEditingZoneName('');
    resetForm();
  }, [resetForm]);

  const handleOpenEdit = useCallback((zone) => {
    if (!zone) return;
    setActiveTab(ZONE_MODES.EDIT);
    setEditZoneId(zone.zone_id);
    const zName = zone.zone_name || zone.name || '';
    setEditingZoneName(zName);
    setFormData({
      zone_name: zName,
      code_prefix: zone.code_prefix || zone.codePrefix || DEFAULT_ZONE_FORM.code_prefix,
      tier_level: zone.tier_level || zone.tierLevel || DEFAULT_ZONE_FORM.tier_level,
      max_capacity:
        zone.max_capacity !== null && zone.max_capacity !== undefined
          ? String(zone.max_capacity)
          : zone.maxCapacity !== null && zone.maxCapacity !== undefined
            ? String(zone.maxCapacity)
            : DEFAULT_ZONE_FORM.max_capacity,
      description: zone.description || DEFAULT_ZONE_FORM.description
    });
    setErrorMessage(null);
  }, []);

  // Load Zones - Stable reference (no re-renders on activeTab change)
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const zonesData = await machineService.getZones();
      if (Array.isArray(zonesData)) {
        setZones(zonesData);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi tải dữ liệu phân khu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync state once whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    loadData();

    if (initialEditZone) {
      handleOpenEdit(initialEditZone);
    } else if (initialMode === ZONE_MODES.CREATE) {
      handleOpenCreate();
    } else {
      setActiveTab(ZONE_MODES.LIST);
      setEditZoneId(null);
      resetForm();
    }
  }, [isOpen, initialMode, initialEditZone, loadData, handleOpenEdit, handleOpenCreate, resetForm]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const payload = {
        zone_name: formData.zone_name,
        code_prefix: formData.code_prefix,
        tier_level: Number(formData.tier_level) || 1,
        max_capacity: formData.max_capacity.trim() !== '' ? Number(formData.max_capacity) : null,
        description: formData.description
      };

      if (activeTab === ZONE_MODES.EDIT && editZoneId) {
        await machineService.updateZone(editZoneId, payload);
        setSuccessMessage(`Đã cập nhật phân khu "${formData.zone_name}" thành công!`);
      } else {
        await machineService.createZone(payload);
        setSuccessMessage(`Đã tạo phân khu mới "${formData.zone_name}" thành công!`);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setActiveTab(ZONE_MODES.LIST);
      setEditZoneId(null);
      resetForm();
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Lỗi khi lưu phân khu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (zone) => {
    setErrorMessage(null);
    setDeletingZone(zone);
  };

  const handleDelete = async () => {
    if (!deletingZone) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await machineService.deleteZone(deletingZone.zone_id);
      setSuccessMessage(`Đã xóa phân khu "${deletingZone.zone_name}" thành công!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setDeletingZone(null);
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Lỗi khi xóa phân khu');
      setDeletingZone(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Quản Lý Phân Khu &amp; Sức Chứa Phòng Máy
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kiểm soát định danh, giới hạn số máy thực tế và bảng giá áp dụng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALWAYS-VISIBLE PERMANENT TAB BAR */}
        <div className="px-6 pt-2 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                setErrorMessage(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${activeTab === 'list'
                ? 'border-sky-600 text-sky-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Danh Sách Phân Khu ({zones.length})</span>
            </button>

            {/* NÚT THÊM PHÂN KHU MỚI LUÔN LUÔN HIỆN DIỆN */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${activeTab === 'create'
                ? 'border-sky-600 text-sky-700 bg-white shadow-2xs font-extrabold'
                : 'border-transparent text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/60 font-extrabold'
                }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Thêm Phân Khu Mới</span>
            </button>

            {activeTab === 'edit' && editZoneId && (
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-extrabold rounded-t-lg border-b-2 border-amber-600 text-amber-700 bg-white shadow-2xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Đang sửa: {editingZoneName || 'Phân khu'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'list' ? (
            /* ================= VIEW: LIST OF ZONES ================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-400">
                  Phân khu đang hoạt động trên hệ thống ({zones.length})
                </span>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Phân Khu Mới</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-mono">
                  ⏳ Đang tải dữ liệu phân khu từ CSDL...
                </div>
              ) : zones.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Chưa có phân khu nào được tạo. Nhấn "Thêm Phân Khu Mới" để bắt đầu.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {zones.map((zone) => {
                    const count = Number(zone.computer_count || 0);
                    const maxCap = zone.max_capacity !== null && zone.max_capacity !== undefined
                      ? Number(zone.max_capacity)
                      : null;
                    const isFull = maxCap !== null && count >= maxCap;
                    const percent = maxCap ? Math.min(100, Math.round((count / maxCap) * 100)) : 0;

                    return (
                      <div
                        key={zone.zone_id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition flex flex-col justify-between gap-3 relative overflow-hidden"
                      >
                        {/* Top Indicator Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                              <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                {zone.zone_name}
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                              Tier #{zone.tier_level}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                            <span>Tiền tố: <strong>{zone.code_prefix || 'PC-'}</strong></span>
                            <span>•</span>
                            <span>{zone.description || 'Không có mô tả'}</span>
                          </div>

                          {zone.PricingPlans && zone.PricingPlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {zone.PricingPlans.map((p) => (
                                <span
                                  key={p.pricing_plan_id}
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono"
                                >
                                  <Tag className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{p.name}</span>
                                  <span className="font-bold text-emerald-600">
                                    {Number(p.price_per_hour || 0).toLocaleString()}đ/h
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                              <Monitor className="w-3.5 h-3.5 text-slate-400" />
                              Sức chứa:
                            </span>
                            <span
                              className={`font-mono text-[11px] ${isFull ? 'text-rose-600 font-extrabold' : 'text-slate-700'
                                }`}
                            >
                              {count} / {maxCap !== null ? `${maxCap} máy` : '∞ (Không giới hạn)'}
                            </span>
                          </div>

                          {maxCap !== null && (
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${isFull
                                  ? 'bg-rose-500'
                                  : percent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                  }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          )}

                          {isFull && (
                            <div className="flex items-center gap-1 text-[11px] font-extrabold text-rose-600 mt-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>ĐÃ ĐẠT GIỚI HẠN SỨC CHỨA</span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(zone)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Chỉnh sửa cấu hình phân khu"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(zone)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                            title="Xóa phân khu này"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================= VIEW: CREATE OR EDIT FORM ================= */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  {activeTab === 'edit' ? (
                    <>
                      <Edit2 className="w-4 h-4 text-amber-600" />
                      <span>Chỉnh Sửa Phân Khu "{editingZoneName}"</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>Tạo Phân Khu Phòng Máy Mới</span>
                    </>
                  )}
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Quay lại danh sách
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên Phân Khu */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Tên Phân Khu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="zone_name"
                    required
                    value={formData.zone_name}
                    onChange={handleFormChange}
                    placeholder="VD: Phòng Thi Đấu (Esports), Zone VIP..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                  />
                </div>

                {/* Tiền Tố Mã Máy */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Tiền Tố Mã Máy (Prefix)
                  </label>
                  <input
                    type="text"
                    name="code_prefix"
                    value={formData.code_prefix}
                    onChange={handleFormChange}
                    placeholder="VD: ESP-, VIP-, PC-..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Tự động gợi ý mã khi thêm máy mới (VD: ESP-001)
                  </p>
                </div>

                {/* Sức Chứa Tối Đa */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Sức Chứa Tối Đa (Số Máy)</span>
                    <span className="text-[10px] font-normal text-slate-400">Trống = Không giới hạn</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="max_capacity"
                    value={formData.max_capacity}
                    onChange={handleFormChange}
                    placeholder="VD: 10 (Để trống nếu không giới hạn)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    Hệ thống sẽ chặn nhân viên thêm máy vượt quá sức chứa vật lý phòng
                  </p>
                </div>

              </div>

              {/* Bảng Giá Đang Áp Dụng (Read-only) */}
              <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bảng Giá Đang Áp Dụng</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClose) onClose();
                      navigate('/admin/pricing-plans');
                    }}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>Quản lý tại Bảng giá & Giờ vàng</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {activeTab === 'edit' ? (
                  (() => {
                    const currentZone = zones.find((z) => z.zone_id === editZoneId) || initialEditZone;
                    const currentPlans =
                      currentZone?.PricingPlans ||
                      (currentZone?.PricingPlan ? [currentZone.PricingPlan] : []) ||
                      [];

                    if (currentPlans.length === 0) {
                      return (
                        <div className="py-2.5 px-3 bg-white border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
                          Chưa có bảng giá riêng (Hệ thống sẽ áp dụng theo bảng giá mặc định)
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-wrap gap-2">
                        {currentPlans.map((plan) => (
                          <div
                            key={plan.pricing_plan_id}
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs"
                          >
                            <Tag className="w-3 h-3 text-sky-600" />
                            <span className="font-semibold text-slate-800">{plan.name}</span>
                            <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {Number(plan.price_per_hour || 0).toLocaleString()}đ/h
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-2.5 px-3 bg-white border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
                    Phân khu mới tạo sẽ áp dụng bảng giá tiêu chuẩn. Bạn có thể gán bảng giá riêng tại trang Bảng giá & Giờ vàng sau khi tạo.
                  </div>
                )}
              </div>

              {/* Mô Tả */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Mô Tả / Ghi Chú</label>
                <textarea
                  name="description"
                  rows="2"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Ghi chú vị trí mặt bằng (VD: Tầng 2, phòng máy lạnh hướng đông)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : activeTab === 'edit' ? 'Lưu Thay Đổi' : 'Tạo Phân Khu'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Confirmation Panel (Contained within modal, no nested dark backdrop) */}
        {deletingZone && (() => {
          const deleteZoneCount = Number(deletingZone.computer_count || 0);
          const deleteZoneInUseCount = Number(deletingZone.in_use_count || 0);
          const hasMachines = deleteZoneCount > 0;
          const hasInUseMachines = deleteZoneInUseCount > 0;
          const canDelete = !hasMachines && !hasInUseMachines;

          return (
            <div className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">Xác nhận xóa phân khu</h4>
                    <p className="text-xs text-slate-500 font-medium">{deletingZone.zone_name}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="text-slate-700 font-medium">
                    Bạn có chắc chắn muốn xóa phân khu <strong>"{deletingZone.zone_name}"</strong>?
                  </p>

                  {hasInUseMachines ? (
                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                      <div className="font-extrabold flex items-center gap-1.5 text-rose-900">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Không thể xóa phân khu này</span>
                      </div>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Không thể xóa vì phân khu này đang có <strong>{deleteZoneInUseCount}</strong> máy trạm đang trong phiên sử dụng. Vui lòng kết thúc phiên chơi trước.
                      </p>
                    </div>
                  ) : hasMachines ? (
                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                      <div className="font-extrabold flex items-center gap-1.5 text-rose-900">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Không thể xóa phân khu này</span>
                      </div>
                      <p className="text-[11px] text-rose-700 font-medium">
                        Không thể xóa vì phân khu này đang chứa <strong>{deleteZoneCount}</strong> máy trạm. Vui lòng chuyển hết máy sang phân khu khác trước.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Phân khu này sẽ được gỡ khỏi Sơ đồ phòng máy và danh sách lựa chọn khi thêm máy mới. Toàn bộ lịch sử giao dịch và báo cáo doanh thu trước đây vẫn được giữ nguyên.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeletingZone(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete || submitting}
                    onClick={handleDelete}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold transition shadow-xs flex items-center gap-1.5 ${canDelete
                      ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                      }`}
                    title={!canDelete ? 'Vui lòng di dời máy trạm trước khi xóa' : 'Xác nhận xóa phân khu'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Đang xóa...' : 'Xóa phân khu'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
