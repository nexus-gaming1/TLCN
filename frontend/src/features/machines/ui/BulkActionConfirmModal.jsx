import { useState, useEffect } from 'react';
import { X, AlertTriangle, RotateCcw, PowerOff, Wrench, ShieldAlert } from 'lucide-react';

const ACTION_CONFIG = {
  reboot: {
    title: 'Xác Nhận Khởi Động Lại',
    actionName: 'khởi động lại',
    buttonText: 'Xác Nhận Khởi Động Lại',
    icon: RotateCcw,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 text-white',
    ringColor: 'focus:ring-sky-500'
  },
  shutdown: {
    title: 'Xác Nhận Tắt Máy',
    actionName: 'tắt máy',
    buttonText: 'Xác Nhận Tắt Máy',
    icon: PowerOff,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    ringColor: 'focus:ring-rose-500'
  },
  maintenance: {
    title: 'Xác Nhận Chuyển Bảo Trì',
    actionName: 'chuyển bảo trì',
    buttonText: 'Xác Nhận Chuyển Bảo Trì',
    icon: Wrench,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    ringColor: 'focus:ring-amber-500'
  }
};

export default function BulkActionConfirmModal({
  isOpen = false,
  onClose,
  actionType = 'reboot',
  selectedMachines = [],
  onConfirm
}) {
  const [forceAll, setForceAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset forceAll whenever modal opens or machines change
  useEffect(() => {
    if (isOpen) {
      setForceAll(false);
      setSubmitting(false);
    }
  }, [isOpen, selectedMachines]);

  if (!isOpen) return null;

  const config = ACTION_CONFIG[actionType] || ACTION_CONFIG.reboot;
  const IconComponent = config.icon;

  // Quét các máy đang có khách chơi (IN_USE hoặc REMOTE)
  const inUseMachines = selectedMachines.filter((m) => {
    const s = String(m.status || '').toUpperCase();
    return s === 'IN_USE' || s === 'REMOTE';
  });

  const hasInUse = inUseMachines.length > 0;
  const idleCount = selectedMachines.length - inUseMachines.length;

  const handleExecute = async () => {
    setSubmitting(true);
    try {
      // Nếu có khách và không chọn ép buộc -> chỉ thực thi trên các máy trống
      const targetMachines = hasInUse && !forceAll
        ? selectedMachines.filter((m) => {
            const s = String(m.status || '').toUpperCase();
            return s !== 'IN_USE' && s !== 'REMOTE';
          })
        : selectedMachines;

      await onConfirm({
        forceAll,
        targetMachines
      });
      onClose();
    } catch {
      // Error handled by parent toast
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
            <div className={`w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center ${config.iconColor}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{config.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium">Thao tác áp dụng cho danh sách máy trạm đã chọn</p>
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <p>
            Bạn đang chuẩn bị <strong className="text-slate-900 font-bold">{config.actionName}</strong> cho{' '}
            <strong className="text-slate-900 font-bold">{selectedMachines.length} máy trạm</strong> đã chọn.
          </p>

          {/* Cảnh báo thông minh nếu phát hiện máy đang có khách ngồi chơi */}
          {hasInUse ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs">Phát hiện {inUseMachines.length} máy đang có khách ngồi chơi!</p>
                  <p className="text-[11px] font-normal text-amber-700 mt-0.5">
                    Các máy:{' '}
                    <span className="font-mono font-bold">
                      {inUseMachines.map((m) => m.name || m.computer_name || m.id).join(', ')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Tùy chọn xử lý (Radio buttons) */}
              <div className="space-y-2 pt-1 border-t border-amber-200/70">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="forceAllOption"
                    checked={!forceAll}
                    onChange={() => setForceAll(false)}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      Bỏ qua {inUseMachines.length} máy đang có khách
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold ml-1.5 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Khuyên dùng
                    </span>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Chỉ {config.actionName} {idleCount} máy trống còn lại để tránh làm văng game của khách.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="forceAllOption"
                    checked={forceAll}
                    onChange={() => setForceAll(true)}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-rose-700">
                      Bắt buộc {config.actionName} toàn bộ {selectedMachines.length} máy
                    </span>
                    <p className="text-[11px] text-slate-500 font-normal">
                      Ngắt phiên chơi ngay lập tức (Dành cho trường hợp cúp điện hoặc bảo trì toàn quán khẩn cấp).
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Toàn bộ máy đã chọn hiện đều đang trống và sẵn sàng nhận lệnh.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={submitting || (hasInUse && !forceAll && idleCount === 0)}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 ${config.buttonBg}`}
          >
            {submitting ? 'Đang thực thi...' : config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
