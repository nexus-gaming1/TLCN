import React, { useState } from 'react';
import { X, Clock, Wallet, Banknote, QrCode, CheckCircle, AlertCircle, Coffee, ShieldCheck } from 'lucide-react';
import comboService from '../../../shared/api/combo.service';

export default function PurchaseComboModal({
  isOpen,
  onClose,
  combo,
  memberId,
  userBalance = 0,
  onSuccess
}) {
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !combo) return null;

  const price = Number(combo.price) || 0;
  const balance = Number(userBalance) || 0;
  const isInsufficientWallet = paymentMethod === 'WALLET' && balance < price;
  const items = combo.comboItems || [];

  const handleConfirmPurchase = async () => {
    setError(null);
    if (isInsufficientWallet) {
      setError('Số dư ví chính không đủ để thanh toán. Vui lòng nạp thêm tiền hoặc chọn phương thức khác.');
      return;
    }

    setLoading(true);
    try {
      const res = await comboService.purchaseCombo({
        combo_id: combo.combo_id,
        payment_method: paymentMethod,
        member_id: memberId
      });

      if (onSuccess) {
        onSuccess(res?.message || 'Mua gói combo thành công!', res?.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi thanh toán đơn hàng Combo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Xác Nhận Mua Gói Combo Time</h3>
              <p className="text-xs text-slate-400">Gói trả trước — Thời gian chỉ bắt đầu đếm khi kích hoạt vào máy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Combo Detail Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/80 via-slate-50 to-orange-50/40 border border-amber-200/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  Zone Cấp Tối Đa: {combo.allowed_tier || 1}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-1">{combo.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thời lượng: <strong className="text-slate-800 font-mono">{combo.duration_minutes || combo.duration_time} phút</strong> (~{(Number(combo.duration_minutes || combo.duration_time) / 60).toFixed(1)} giờ)
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Giá Trọn Gói</span>
                <span className="text-xl font-black font-mono text-emerald-600">
                  {price.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Included Items */}
            {items.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200/60">
                <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5 text-amber-700" />
                  Dịch Vụ Kèm Theo Miễn Phí (Đã gồm trong giá):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((it, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-amber-200 text-slate-800 text-xs font-bold shadow-2xs"
                    >
                      <span>{it.serviceItem?.name || `Món #${it.service_item_id}`}</span>
                      <span className="text-amber-700 font-mono text-[11px]">x{it.quantity}</span>
                      <span className="text-[9px] text-emerald-600 font-extrabold bg-emerald-50 px-1 rounded ml-1">
                        0đ
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              Chọn Phương Thức Thanh Toán
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Wallet */}
              <button
                type="button"
                onClick={() => setPaymentMethod('WALLET')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                  paymentMethod === 'WALLET'
                    ? 'border-cyan-500 bg-cyan-50/80 text-cyan-900 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Wallet className={`w-5 h-5 ${paymentMethod === 'WALLET' ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span className="text-xs font-extrabold">Ví Tài Khoản</span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  Dư: {balance.toLocaleString('vi-VN')}đ
                </span>
              </button>

              {/* Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className={`w-5 h-5 ${paymentMethod === 'CASH' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs font-extrabold">Tiền Mặt</span>
                <span className="text-[10px] text-slate-400">Tại quầy</span>
              </button>

              {/* VietQR */}
              <button
                type="button"
                onClick={() => setPaymentMethod('VIETQR')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                  paymentMethod === 'VIETQR'
                    ? 'border-sky-500 bg-sky-50/80 text-sky-900 ring-2 ring-sky-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className={`w-5 h-5 ${paymentMethod === 'VIETQR' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-xs font-extrabold">VietQR</span>
                <span className="text-[10px] text-slate-400">Quét mã 24/7</span>
              </button>
            </div>

            {isInsufficientWallet && (
              <p className="text-[11px] text-rose-600 font-bold mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Số dư ví chính của bạn không đủ ({balance.toLocaleString('vi-VN')}đ &lt; {price.toLocaleString('vi-VN')}đ)
              </p>
            )}
          </div>

          {/* Business Rules Guarantee Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Quy chế sử dụng gói Combo Time:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[10px] text-slate-500">
              <li>Thời gian chỉ kích hoạt khi bạn đăng nhập vào máy trạm.</li>
              <li>Được phép chuyển đổi giữa các máy có cấp Zone ≤ {combo.allowed_tier || 1}.</li>
              <li>Thời gian trôi liên tục theo đồng hồ thực sau khi kích hoạt.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleConfirmPurchase}
              disabled={loading || isInsufficientWallet}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Xác Nhận Mua ({price.toLocaleString('vi-VN')}đ)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
