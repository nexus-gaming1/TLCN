import React, { useState, useEffect } from 'react';
import CustomerLayout from '../../widgets/layouts/customer/CustomerLayout';
import {
  Clock,
  Layers,
  ArrowRightLeft,
  Play,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Sparkles,
  RefreshCw,
  History,
  Timer
} from 'lucide-react';
import comboService from '../../shared/api/combo.service';
import profileService from '../../shared/api/profile.service';
import PurchaseComboModal from '../../features/combos/ui/PurchaseComboModal';
import ActivateComboModal from '../../features/combos/ui/ActivateComboModal';
import SwitchComboStationModal from '../../features/combos/ui/SwitchComboStationModal';

export default function CustomerComboPage({ user, onLogout }) {
  const memberId = user?.member_id ?? user?.id ?? user?.user_id;

  const [activeCombo, setActiveCombo] = useState(null);
  const [historyCombos, setHistoryCombos] = useState([]);
  const [availableCombos, setAvailableCombos] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals state
  const [selectedComboForPurchase, setSelectedComboForPurchase] = useState(null);
  const [selectedComboForActivate, setSelectedComboForActivate] = useState(null);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  // Live timer state
  const [countdownText, setCountdownText] = useState('');
  const [progressPercent, setProgressPercent] = useState(100);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [combosList, activeData, historyData, profileData] = await Promise.all([
        comboService.getCombos(false),
        memberId ? comboService.getActiveCombo(memberId) : Promise.resolve(null),
        memberId ? comboService.getComboHistory(memberId) : Promise.resolve([]),
        memberId ? profileService.getProfile(memberId).catch(() => null) : Promise.resolve(null)
      ]);

      setAvailableCombos(combosList || []);
      setActiveCombo(activeData || null);
      setHistoryCombos(historyData || []);
      setUserProfile(profileData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Combo:', err);
      showToast(err.message || 'Lỗi khi tải dữ liệu combo', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  // Real-time countdown timer for active session
  useEffect(() => {
    if (!activeCombo || activeCombo.status !== 'ACTIVE' || !activeCombo.end_time) {
      setCountdownText('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(activeCombo.end_time).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCountdownText('Hết giờ');
        setProgressPercent(0);
        // Refresh to sync expired state with backend
        loadData();
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setCountdownText(formatted);

      // Progress calculation
      if (activeCombo.start_time) {
        const start = new Date(activeCombo.start_time).getTime();
        const totalDurationMs = end - start;
        const elapsedMs = now - start;
        const pct = Math.max(0, Math.min(100, 100 - (elapsedMs / totalDurationMs) * 100));
        setProgressPercent(pct);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeCombo]);

  const handleEndEarly = async () => {
    if (!activeCombo) return;
    const confirmed = window.confirm(
      'CẢNH BÁO: Bạn có chắc chắn muốn kết thúc phiên chơi sớm?\n\n' +
      '• Toàn bộ thời gian còn lại sẽ bị hủy ngay lập tức.\n' +
      '• Tiền combo sẽ KHÔNG ĐƯỢC HOÀN LẠI dưới mọi hình thức.\n' +
      '• Máy trạm sẽ tự động khóa lại.'
    );

    if (!confirmed) return;

    try {
      const res = await comboService.endSessionEarly({
        combo_time_id: activeCombo.combo_time_id,
        member_id: memberId
      });
      showToast(res?.message || 'Đã kết thúc phiên chơi');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Lỗi khi kết thúc phiên', true);
    }
  };

  const realBalance = Number(userProfile?.balances?.real_balance || user?.memberProfile?.real_balance || 0);

  return (
    <CustomerLayout user={user} onLogout={onLogout} activeTab="combos">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
              toast.isError ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {toast.isError ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span className="text-xs font-bold">{toast.message}</span>
          </div>
        )}

        {/* Page Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                PREPAID TIME PACKAGES
              </span>
              <span className="text-slate-400 font-bold">•</span>
              <span className="text-slate-500 font-semibold">NEXUS Cyber Engine</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Gói Combo Time &amp; Giờ Chơi Ưu Đãi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Mua gói trả trước trọn gói, miễn phí đồ uống và chơi game mượt mà không phụ thu tiền giờ.
            </p>
          </div>

          <button
            onClick={loadData}
            className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>

        {/* SECTION 1: ACTIVE COMBO TIME CARD (IF ANY) */}
        {activeCombo && activeCombo.status === 'ACTIVE' && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-indigo-900/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Clock className="w-48 h-48 text-indigo-400" />
            </div>

            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400 block">
                      PHIÊN COMBO TIME ĐANG HOẠT ĐỘNG
                    </span>
                    <h2 className="text-xl font-black mt-0.5">
                      {activeCombo.comboPackage?.name || 'Gói Combo Time'}
                    </h2>
                  </div>
                </div>

                {/* PC and Zone badges */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono font-black text-sm border border-indigo-500/30">
                    Máy: {activeCombo.computer?.computer_name || (activeCombo.computer_id ? `PC-${activeCombo.computer_id}` : 'Chưa chọn máy')}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                    Zone Cấp ≤ {activeCombo.allowed_tier || 1}
                  </span>
                </div>
              </div>

              {/* Countdown Display & Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-emerald-400" />
                      Thời Gian Còn Lại (Đang chạy liên tục)
                    </span>
                    <span className="font-mono text-emerald-400 font-extrabold">{progressPercent.toFixed(0)}%</span>
                  </div>

                  <div className="font-mono text-4xl sm:text-5xl font-black text-white tracking-wider my-1">
                    {countdownText || 'Đang tính...'}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-1000 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
                    <span>
                      Bắt đầu: {activeCombo.start_time ? new Date(activeCombo.start_time).toLocaleTimeString('vi-VN') : '--:--'}
                    </span>
                    <span>
                      Hết hạn: {activeCombo.end_time ? new Date(activeCombo.end_time).toLocaleTimeString('vi-VN') : '--:--'}
                    </span>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-col justify-between gap-2.5">
                  {!activeCombo.computer_id ? (
                    <button
                      type="button"
                      onClick={() => setSelectedComboForActivate(activeCombo)}
                      className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer animate-pulse"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Chọn Máy Trạm Ngồi Chơi</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSwitchModalOpen(true)}
                      className="flex-1 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Đổi Máy Trạm</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      // Open purchase modal for extension
                      if (availableCombos.length > 0) {
                        setSelectedComboForPurchase(availableCombos[0]);
                      }
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Mua Thêm Giờ (Cộng dồn)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEndEarly}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Kết Thúc Sớm (Không hoàn tiền)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: PENDING UN-ACTIVATED COMBOS (CHƯA KÍCH HOẠT) */}
        {activeCombo && activeCombo.status === 'PENDING' && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center border border-amber-300">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
                  ĐÃ MUA — CHƯA TÍNH GIỜ
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {activeCombo.comboPackage?.name || 'Gói Combo Time'} ({activeCombo.duration_minutes} phút)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Thời gian chỉ bắt đầu đếm khi bạn kích hoạt vào một máy trạm tại phòng máy.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedComboForActivate(activeCombo)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Bắt Đầu Chơi Ngay</span>
            </button>
          </div>
        )}

        {/* SECTION 3: AVAILABLE PACKAGES TO PURCHASE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Danh Sách Gói Combo Đang Mở Bán
              </h2>
              <p className="text-xs text-slate-500">
                Chọn gói phù hợp và bấm "Mua Combo" để nhận ngay thời gian chơi kèm đồ uống
              </p>
            </div>
          </div>

          {availableCombos.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-slate-400 text-xs">
              Hiện tại quán chưa mở bán gói combo nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableCombos.map((combo) => {
                const durationMins = combo.duration_minutes || combo.duration_time || 0;
                const hours = (durationMins / 60).toFixed(1);
                const items = combo.comboItems || [];
                const price = Number(combo.price) || 0;

                return (
                  <div
                    key={combo.combo_id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Badge header */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Zone Cấp ≤ {combo.allowed_tier || 1}
                        </span>
                        <span className="font-mono text-lg font-black text-emerald-600">
                          {price.toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-extrabold text-slate-900 mt-2">{combo.name}</h3>

                      {combo.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{combo.description}</p>
                      )}

                      {/* Specs */}
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
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <Coffee className="w-3 h-3 text-amber-600" />
                          Dịch Vụ Đi Kèm Miễn Phí:
                        </span>

                        {items.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Chỉ gồm giờ chơi</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-semibold"
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

                    {/* Purchase Button */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedComboForPurchase(combo)}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Mua Gói Combo Này</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: HISTORY TABLE */}
        {historyCombos.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Lịch Sử Sử Dụng Gói Combo
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-100 text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Gói Combo</th>
                      <th className="py-3 px-4">Thời Lượng</th>
                      <th className="py-3 px-4">Máy Trạm</th>
                      <th className="py-3 px-4">Bắt Đầu</th>
                      <th className="py-3 px-4">Kết Thúc</th>
                      <th className="py-3 px-4 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {historyCombos.map((item) => (
                      <tr key={item.combo_time_id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.comboPackage?.name || 'Combo Time'}
                        </td>
                        <td className="py-3 px-4 font-mono">{item.duration_minutes} phút</td>
                        <td className="py-3 px-4 font-mono">
                          {item.computer?.computer_name || (item.computer_id ? `PC-${item.computer_id}` : '--')}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {item.start_time ? new Date(item.start_time).toLocaleString('vi-VN') : 'Chưa kích hoạt'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {item.end_time ? new Date(item.end_time).toLocaleString('vi-VN') : '--'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <PurchaseComboModal
        isOpen={Boolean(selectedComboForPurchase)}
        onClose={() => setSelectedComboForPurchase(null)}
        combo={selectedComboForPurchase}
        memberId={memberId}
        userBalance={realBalance}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
      />

      <ActivateComboModal
        isOpen={Boolean(selectedComboForActivate)}
        onClose={() => setSelectedComboForActivate(null)}
        comboTime={selectedComboForActivate}
        memberId={memberId}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
      />

      <SwitchComboStationModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        comboTime={activeCombo}
        memberId={memberId}
        onSuccess={(msg) => {
          showToast(msg);
          loadData();
        }}
      />
    </CustomerLayout>
  );
}
