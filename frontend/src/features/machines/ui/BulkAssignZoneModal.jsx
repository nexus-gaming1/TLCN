import { useState, useEffect } from 'react';
import { X, Tag, AlertTriangle } from 'lucide-react';

export default function BulkAssignZoneModal({
  isOpen = false,
  onClose,
  selectedMachines = [],
  zones = [],
  onConfirm
}) {
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [autoRenamePrefix, setAutoRenamePrefix] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (zones.length > 0) {
        setSelectedZoneId(String(zones[0].zone_id || zones[0].id));
      }
      setAutoRenamePrefix(true);
      setSubmitting(false);
      setErrorMsg(null);
    }
  }, [isOpen, zones]);

  if (!isOpen) return null;

  const targetZone = zones.find(
    (z) => String(z.zone_id || z.id) === String(selectedZoneId)
  ) || zones[0];

  // Tính toán sức chứa phân khu đích
  const currentCount = Number(targetZone?.computer_count || 0);
  const maxCap = targetZone?.max_capacity !== null && targetZone?.max_capacity !== undefined
    ? Number(targetZone.max_capacity)
    : null;
  const remainingSpots = maxCap !== null ? Math.max(0, maxCap - currentCount) : null;
  const isOverCapacity = remainingSpots !== null && selectedMachines.length > remainingSpots;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetZone) return;

    if (isOverCapacity) {
      setErrorMsg(
        `Phân khu "${targetZone.zone_name}" chỉ còn trống ${remainingSpots} chỗ, không đủ cho ${selectedMachines.length} máy đã chọn!`
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm({
        targetZoneId: Number(targetZone.zone_id || targetZone.id),
        targetZone,
        autoRenamePrefix
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi gán phân khu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Gán Phân Khu Mới Hàng Loạt</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Chuyển khu vực cho {selectedMachines.length} máy trạm đã chọn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ô chọn Phân khu đích */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-xs">
              Chọn Phân Khu Đích <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => {
                setSelectedZoneId(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none cursor-pointer"
            >
              {zones.map((zone) => {
                const zCount = Number(zone.computer_count || 0);
                const zMax = zone.max_capacity !== null && zone.max_capacity !== undefined ? Number(zone.max_capacity) : null;
                const zRemaining = zMax !== null ? Math.max(0, zMax - zCount) : null;
                const zPrefix = zone.code_prefix || 'PC-';

                return (
                  <option key={zone.zone_id || zone.id} value={zone.zone_id || zone.id}>
                    {zone.zone_name} (Tiền tố: {zPrefix}) — {zRemaining !== null ? `còn trống ${zRemaining}/${zMax} chỗ` : 'sức chứa không giới hạn'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Preview thông tin phân khu đích đã chọn */}
          {targetZone && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Tiền tố mã máy:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {targetZone.code_prefix || 'PC-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Tình trạng sức chứa:</span>
                <span className={`font-mono font-bold ${isOverCapacity ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {remainingSpots !== null ? `Còn trống ${remainingSpots}/${maxCap} chỗ` : '∞ máy (Không giới hạn)'}
                </span>
              </div>
              {isOverCapacity && (
                <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold pt-1 border-t border-rose-100">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Vượt quá sức chứa tối đa của phân khu này!</span>
                </div>
              )}
            </div>
          )}

          {/* Checkbox tùy chọn tự động đổi tiền tố */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRenamePrefix}
                onChange={(e) => setAutoRenamePrefix(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">
                  Tự động cập nhật mã máy theo tiền tố Zone mới
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ví dụ: Máy <span className="font-mono font-bold">PC-01</span> sẽ tự đổi thành{' '}
                  <span className="font-mono font-bold text-indigo-700">
                    {targetZone?.code_prefix ? `${targetZone.code_prefix}01` : 'VIP-01'}
                  </span>.
                </p>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || isOverCapacity}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Đang chuyển...' : 'Xác Nhận Chuyển Phân Khu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
