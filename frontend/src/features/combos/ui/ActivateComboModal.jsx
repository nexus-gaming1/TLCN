import React, { useState, useEffect } from 'react';
import { X, Play, Monitor, Layers, AlertCircle, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';
import comboService from '../../../shared/api/combo.service';
import machineService from '../../../shared/api/machine.service';

export default function ActivateComboModal({
  isOpen,
  onClose,
  comboTime,
  memberId,
  onSuccess
}) {
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadMachines = async () => {
      setLoadingMachines(true);
      setError(null);
      try {
        const list = await machineService.getMachines();
        setMachines(list || []);
      } catch (err) {
        setError('Không thể tải sơ đồ máy trạm phòng máy: ' + err.message);
      } finally {
        setLoadingMachines(false);
      }
    };

    loadMachines();
  }, [isOpen]);

  if (!isOpen || !comboTime) return null;

  const allowedTier = Number(comboTime.allowed_tier || comboTime.comboPackage?.allowed_tier || 1);
  const comboName = comboTime.comboPackage?.name || 'Gói Combo Time';

  const handleConfirmActivate = async () => {
    if (!selectedMachineId) {
      setError('Vui lòng chọn một máy trạm để kích hoạt');
      return;
    }

    setActivating(true);
    setError(null);
    try {
      const res = await comboService.activateSession({
        combo_time_id: comboTime.combo_time_id,
        computer_id: Number(selectedMachineId),
        member_id: memberId
      });

      if (onSuccess) {
        onSuccess(res?.message || 'Kích hoạt phiên chơi thành công! Máy đã được mở khóa.', res?.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi kích hoạt phiên chơi');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Kích Hoạt Phiên Chơi Combo Time</h3>
              <p className="text-xs text-slate-400">Chọn máy trạm tại quán để bắt đầu tính giờ thực tế</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Package Info Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">GÓI SẮP KÍCH HOẠT</span>
              <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{comboName}</h4>
              <p className="text-xs text-slate-500">
                Thời lượng: <strong className="font-mono text-slate-800">{comboTime.duration_minutes} phút</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">CẤP ZONE TỐI ĐA</span>
              <span className="inline-block mt-0.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                Zone Tier ≤ {allowedTier}
              </span>
            </div>
          </div>

          {/* Machine Selection Grid */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Chọn Máy Trạm Tại Phòng Máy
            </label>

            {loadingMachines ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Đang quét trạm máy thực tế...</span>
              </div>
            ) : machines.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                Không tìm thấy máy trạm nào khả dụng.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {machines.map((m) => {
                  const mTier = Number(m.tier_level || 1);
                  const isZoneAllowed = mTier <= allowedTier;
                  const isBusy = m.status === 'IN_USE';
                  const isMaint = m.status === 'MAINTENANCE';
                  const isSelectable = isZoneAllowed && !isBusy && !isMaint;
                  const isSelected = String(selectedMachineId) === String(m.computer_id);

                  return (
                    <button
                      key={m.computer_id}
                      type="button"
                      disabled={!isSelectable}
                      onClick={() => setSelectedMachineId(m.computer_id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                          : isSelectable
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          : 'border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-slate-800">{m.id}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            m.status === 'ONLINE' ? 'bg-emerald-500' : isBusy ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>

                      <div className="mt-2 text-[10px]">
                        <span className="text-slate-500 block truncate">{m.zoneName} (Cấp {mTier})</span>
                        {!isZoneAllowed ? (
                          <span className="text-rose-600 font-bold block mt-0.5">Vượt cấp Zone</span>
                        ) : isBusy ? (
                          <span className="text-amber-600 font-bold block mt-0.5">Máy đang bận</span>
                        ) : isMaint ? (
                          <span className="text-slate-500 font-bold block mt-0.5">Đang bảo trì</span>
                        ) : (
                          <span className="text-emerald-700 font-bold block mt-0.5">Khả dụng</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time Running Warning */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
            <span className="font-extrabold flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Lưu ý kích hoạt:
            </span>
            <p className="text-[10px] text-amber-700">
              Ngay khi nhấn kích hoạt, thời gian combo sẽ bắt đầu chạy liên tục theo đồng hồ thực tế ({comboTime.duration_minutes} phút). Máy trạm tương ứng sẽ mở khóa màn hình tự động.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleConfirmActivate}
              disabled={activating || !selectedMachineId}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {activating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang kích hoạt...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Kích Hoạt &amp; Mở Khóa Máy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
