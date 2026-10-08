import React, { useState } from 'react';
import { X, QrCode, Copy, Check, AlertCircle } from 'lucide-react';

 // TopUpModal Component --> là Modal nạp tiền tự động qua mã VietQR cho khách
export default function TopUpModal({ isOpen, onClose, memberId }) {
  const [selectedAmount, setSelectedAmount] = useState(50000); // Mặc định chọn 50.000đ
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const presetAmounts = [50000, 100000, 200000, 500000];
  const transferContent = `NEXUS ${memberId || ''}`;

  // URL VietQR tạo mã tự động theo hạn mức và mã hội viên
  const qrUrl = `https://img.vietqr.io/image/vcb-1040682932-compact2.png?amount=${selectedAmount}&addInfo=NEXUS%20${memberId}&accountName=TON%20HOANG%20CAM`;

  const handleCopyContent = () => {
    navigator.clipboard.writeText(transferContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Nạp Tiền Vào Tài Khoản</h3>
              <p className="text-xs text-slate-500 font-medium">Tự động cộng tiền qua VietQR 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* phần thân khung modal */}
        <div className="py-4 space-y-4">
          {/* chọn nhanh giá tiền */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Chọn nhanh số tiền nạp:</label>
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSelectedAmount(amt)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    selectedAmount === amt
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs scale-[1.02]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {(amt / 1000).toLocaleString('vi-VN')}k
                </button>
              ))}
            </div>
          </div>

          {/* QR chuyển khoản  */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200/60 mb-2">
              <img
                src={qrUrl}
                alt="Mã VietQR Thanh Toán"
                className="w-56 h-56 object-contain rounded-xl block"
              />
            </div>
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-xs font-extrabold text-slate-800">
                TON HOANG CAM - Vietcombank (VCB)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                STK: <strong className="text-slate-800">1040682932</strong>
              </span>
            </div>
          </div>

          {/* Các warning chú ý  */}
          <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                Vui lòng giữ nguyên nội dung chuyển khoản bên dưới để hệ thống tự động cộng tiền sau 1-2 phút:
              </p>
            </div>

            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-200 shadow-2xs font-mono">
              <span className="text-xs font-black text-amber-900 tracking-wider">
                {transferContent}
              </span>
              <button
                type="button"
                onClick={handleCopyContent}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* nút xác nhận đóng */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            Tôi đã chuyển khoản xong
          </button>
        </div>
      </div>
    </div>
  );
}