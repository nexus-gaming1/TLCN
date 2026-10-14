import { useState, useEffect } from 'react';
import { X, Layers, PlusCircle, Clock, Calendar, CheckSquare, Square } from 'lucide-react';
import { formatNumberWithCommas, parseFormattedNumber } from '../../../shared/utils/formatters';

/**
 * CreatePricingPlanModal (Modal Tạo / Sửa Bảng Giá & Giờ Vàng)
 */
export default function CreatePricingPlanModal({
  isOpen,
  onClose,
  plan, // đối tượng pricing plan đang sửa (nếu có)
  availableZones = [],
  onSubmit
}) {
  const isEdit = !!plan;

  const [name, setName] = useState('');
  const [pricePerHour, setPricePerHour] = useState('10,000');
  const [planType, setPlanType] = useState('LOCAL');
  const [priority, setPriority] = useState(0);
  const [isHappyHour, setIsHappyHour] = useState(false);
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('17:00');
  const [hasSpecificDate, setHasSpecificDate] = useState(false);
  const [applyDate, setApplyDate] = useState('');
  const [selectedZoneIds, setSelectedZoneIds] = useState([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (plan) {
      setName(plan.name || '');
      setPricePerHour(formatNumberWithCommas(plan.pricePerHour !== undefined ? plan.pricePerHour : 10000));
      setPlanType(plan.planType || 'LOCAL');
      setPriority(plan.priority || 0);

      const hasHours = !!(plan.startTime && plan.endTime);
      setIsHappyHour(hasHours);
      setStartTime(plan.startTime ? plan.startTime.slice(0, 5) : '13:00');
      setEndTime(plan.endTime ? plan.endTime.slice(0, 5) : '17:00');

      const hasDate = !!plan.applyDate;
      setHasSpecificDate(hasDate);
      setApplyDate(plan.applyDate || '');

      const zoneIds = Array.isArray(plan.zones)
        ? plan.zones.map((z) => Number(z.zone_id))
        : [];
      setSelectedZoneIds(zoneIds);
      setIsActive(plan.isActive !== undefined ? plan.isActive : true);
    } else {
      // Reset form khi tạo mới
      setName('');
      setPricePerHour('10,000');
      setPlanType('LOCAL');
      setPriority(0);
      setIsHappyHour(false);
      setStartTime('13:00');
      setEndTime('17:00');
      setHasSpecificDate(false);
      setApplyDate('');
      setSelectedZoneIds([]);
      setIsActive(true);
    }
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleToggleZone = (zoneId) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleSelectAllZones = () => {
    if (selectedZoneIds.length === availableZones.length) {
      setSelectedZoneIds([]);
    } else {
      setSelectedZoneIds(availableZones.map((z) => Number(z.zone_id)));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('Vui lòng nhập tên bảng giá!');
      return;
    }
    if (trimmedName.length > 100) {
      alert('Tên bảng giá không được vượt quá 100 ký tự!');
      return;
    }

    const parsedPrice = parseFormattedNumber(pricePerHour);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Mức giá mỗi giờ phải là số không âm hợp lệ!');
      return;
    }

    if (isHappyHour) {
      if (!startTime || !endTime) {
        alert('Khung giờ vàng phải có đủ giờ bắt đầu và giờ kết thúc!');
        return;
      }
    }

    const formatTimePayload = (t) => {
      if (!t) return null;
      const s = String(t).trim();
      if (!s) return null;
      if (/^\d{1,2}:\d{2}$/.test(s)) {
        const [h, m] = s.split(':');
        return `${h.padStart(2, '0')}:${m}:00`;
      }
      if (/^\d{1,2}:\d{2}:\d{2}/.test(s)) {
        return s.slice(0, 8);
      }
      return s;
    };

    const payload = {
      name: trimmedName,
      price_per_hour: parsedPrice,
      plan_type: planType,
      priority: Number(priority || 0),
      start_time: isHappyHour ? formatTimePayload(startTime) : null,
      end_time: isHappyHour ? formatTimePayload(endTime) : null,
      apply_date: hasSpecificDate && applyDate ? applyDate : null,
      is_active: isActive,
      zone_ids: selectedZoneIds
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isEdit ? 'Chỉnh Sửa Bảng Giá Máy' : 'Tạo Bảng Giá / Giờ Vàng Mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cấu hình đơn giá máy và khung giờ tự động áp dụng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Tên bảng giá */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tên Bảng Giá / Khung Giờ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Giờ Vàng Buổi Sáng, Giá Chuẩn Khu VIP..."
              required
              maxLength={100}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-700"
            />
          </div>

          {/* Mức giá & Loại hình */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mức Giá Mỗi Giờ (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(formatNumberWithCommas(e.target.value))}
                  placeholder="VD: 10,000"
                  required
                  className="w-full h-10 px-3 pr-12 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-[11px] pointer-events-none">
                  đ/h
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Loại Hình Phiên Chơi
              </label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-700"
              >
                <option value="LOCAL">Chơi tại quán</option>
                <option value="REMOTE">Chơi từ xa</option>
              </select>
            </div>
          </div>

          {/* Độ ưu tiên & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Độ Ưu Tiên (Priority)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                min="0"
                max="99"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 outline-none transition font-medium text-slate-700"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Số càng cao càng được ưu tiên áp dụng khi trùng giờ
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Trạng Thái Vận Hành
              </label>
              <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-800">
                  {isActive ? 'Kích hoạt ngay' : 'Tạm ngưng'}
                </span>
              </label>
            </div>
          </div>

          {/* Toggle Khung Giờ Vàng */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHappyHour}
                onChange={(e) => setIsHappyHour(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-black text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Áp dụng theo khung giờ vàng</span>
              </span>
            </label>

            {isHappyHour && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required={isHappyHour}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required={isHappyHour}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Toggle Ngày cụ thể */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasSpecificDate}
                onChange={(e) => setHasSpecificDate(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-black text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Áp dụng vào một ngày cụ thể (VD: Ngày lễ, sự kiện)</span>
              </span>
            </label>

            {hasSpecificDate && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-bold text-slate-600 mb-1">Ngày áp dụng</label>
                <input
                  type="date"
                  value={applyDate}
                  onChange={(e) => setApplyDate(e.target.value)}
                  required={hasSpecificDate}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            )}
          </div>

          {/* Phân khu máy áp dụng (Zone Selection) */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Gán cho phân khu máy (Zones)</span>
              </span>
              <button
                type="button"
                onClick={handleSelectAllZones}
                className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
              >
                {selectedZoneIds.length === availableZones.length
                  ? 'Bỏ chọn tất cả'
                  : 'Chọn tất cả'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {availableZones.map((z) => {
                const isChecked = selectedZoneIds.includes(Number(z.zone_id));
                return (
                  <div
                    key={z.zone_id}
                    onClick={() => handleToggleZone(Number(z.zone_id))}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-sky-50 border-sky-200 text-sky-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate text-[11px]">{z.zone_name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Nếu không chọn khu vực nào, bảng giá này sẽ áp dụng toàn phòng máy.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isEdit ? 'Lưu Thay Đổi' : 'Tạo Bảng Giá'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
