import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Monitor, Layers, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import comboService from '../../../shared/api/combo.service';
import machineService from '../../../shared/api/machine.service';

export default function SwitchComboStationModal({
  isOpen,
  onClose,
  comboTime,
  memberId,
  onSuccess
}) {
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        setError('Không thể tải sơ đồ máy trạm: ' + err.message);
      } finally {
        setLoadingMachines(false);
      }
    };

    loadMachines();
  }, [isOpen]);

  if (!isOpen || !comboTime) return null;

  const currentComputerId = comboTime.computer_id;
  const currentComputerName = comboTime.computer?.computer_name || `PC-${currentComputerId}`;
  const allowedTier = Number(comboTime.allowed_tier || comboTime.comboPackage?.allowed_tier || 1);

  const handleConfirmSwitch = async () => {
    if (!selectedMachineId) {
      setError('Vui lòng chọn máy trạm muốn chuyển tới');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await comboService.switchStation({
        combo_time_id: comboTime.combo_time_id,
        target_computer_id: Number(selectedMachineId),
        member_id: memberId
      });

      if (onSuccess) {
        onSuccess(res?.message || 'Chuyển máy thành công! Máy cũ đã khóa và máy mới đã mở.', res?.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi chuyển trạm máy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Chuyển Trạm Máy Đang Chơi</h3>
              <p className="text-xs text-slate-400">Bảo toàn thời gian chơi còn lại — Giới hạn phân khu Zone hợp lệ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Machine & Zone Comparison Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">MÁY HIỆN TẠI</span>
              <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{currentComputerName}</h4>
              <p className="text-xs text-slate-500">
                Zone hiện tại: {comboTime.computer?.ComputerZone?.zone_name || 'Mặc định'}
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
              Chọn Máy Đích (Chỉ chọn máy cùng Zone hoặc Zone thấp hơn)
            </label>

            {loadingMachines ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Đang kiểm tra trạng thái các máy trạm...</span>
              </div>
            ) : machines.length === 0 ? (
              <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                Không tìm thấy máy trạm nào khả dụng.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {machines.map((m) => {
                  const isCurrent = Number(m.computer_id) === Number(currentComputerId);
                  const mTier = Number(m.tier_level || 1);
                  const isZoneAllowed = mTier <= allowedTier;
                  const isBusy = m.status === 'IN_USE' && !isCurrent;
                  const isMaint = m.status === 'MAINTENANCE';
                  const isSelectable = !isCurrent && isZoneAllowed && !isBusy && !isMaint;
                  const isSelected = String(selectedMachineId) === String(m.computer_id);

                  let reasonText = null;
                  if (isCurrent) reasonText = 'Máy đang ngồi';
                  else if (!isZoneAllowed) reasonText = `Zone cấp ${mTier} > ${allowedTier}`;
                  else if (isBusy) reasonText = 'Máy có người';
                  else if (isMaint) reasonText = 'Đang bảo trì';
                  else reasonText = 'Khả dụng';

                  return (
                    <button
                      key={m.computer_id}
                      type="button"
                      disabled={!isSelectable}
                      onClick={() => setSelectedMachineId(m.computer_id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20'
                          : isSelectable
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          : 'border-slate-200 bg-slate-100/70 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-slate-800">{m.id}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCurrent
                              ? 'bg-blue-500 ring-2 ring-blue-300'
                              : isSelectable
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                        />
                      </div>

                      <div className="mt-2 text-[10px]">
                        <span className="text-slate-500 block truncate">{m.zoneName} (Cấp {mTier})</span>
                        <span
                          className={`font-bold block mt-0.5 ${
                            isSelectable
                              ? 'text-emerald-700'
                              : isCurrent
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {reasonText}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rules Guarantee Notice */}
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-[11px] space-y-1">
            <span className="font-extrabold flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              Quy tắc chuyển máy:
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-[10px] text-sky-800">
              <li>Thời gian còn lại được bảo toàn nguyên vẹn, không cộng thêm và không reset.</li>
              <li>Chuyển xuống Zone thấp hơn không bị tính thêm phụ phí.</li>
              <li>Máy cũ sẽ tự động khóa và máy đích sẽ lập tức mở khóa.</li>
            </ul>
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
              onClick={handleConfirmSwitch}
              disabled={submitting || !selectedMachineId}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang chuyển máy...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Xác Nhận Chuyển Máy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
