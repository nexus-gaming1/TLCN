import React, { useState,useEffect } from 'react';
import { X, QrCode, Copy, Check, AlertCircle } from 'lucide-react';

 // TopUpModal Component --> là Modal nạp tiền tự động qua mã VietQR cho khách
export default function TopUpModal({ isOpen, onClose, memberId }) {
  const [selectedAmount, setSelectedAmount] = useState(50000); // Mặc định chọn 50.000đ
  const [copied, setCopied] = useState(false);

 // States quản lý Loading & Fallback lỗi của mã QR
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState(false);

  //Hàm reset khi đổi số tiền 
  useEffect(() => {
    setQrLoading(true);
    setQrError(false);
  }, [selectedAmount, memberId]);

  if (!isOpen) return null;

  const presetAmounts = [50000, 100000, 200000, 500000];
  const transferContent = `NEXUS ${memberId || ''}`;

  // URL VietQR 
  const qrUrl = `https://img.vietqr.io/image/vcb-1040682932-compact2.png?amount=${selectedAmount}&addInfo=NEXUS%20${memberId}&accountName=TON%20HOANG%20CAM`;

  const handleCopyContent = () => {
    navigator.clipboard.writeText(transferContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        {/*1. header của modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">Nạp Tiền Vào Tài Khoản</h3>
              <p className="text-[11px] text-slate-500 font-medium">Tự động cộng tiền qua VietQR 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/*2. thân modal */}
        <div className="py-3 space-y-3">
          
          {/* 2.1:  Danh sách mệnh giá */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Chọn nhanh số tiền nạp:</label>
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSelectedAmount(amt)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
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
          {/* 2.2: Khung hiển thị mã QR */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200/60 mb-2 relative w-[250px] h-[250px] flex items-center justify-center">
              
              {/* Hiệu ứng loading khi tải ảnh */}
              {qrLoading && !qrError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1.5 bg-white rounded-xl">
                  <div className="w-7 h-7 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-slate-400 font-medium font-mono">Đang tạo QR...</span>
                </div>
              )}
              {/* Mất mạng / Lỗi Server VietQR */}
              {qrError ? (
                <div className="text-center p-2">
                  <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-500 font-medium block leading-tight">
                    Mạng chậm, vui lòng chuyển khoản thủ công
                  </span>
                </div>
              ) : (
                <img
                  src={qrUrl}
                  alt="Mã VietQR Thanh Toán"
                  className={`w-full h-full object-contain rounded-lg ${
                    qrLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'
                  }`}
                  onLoad={() => setQrLoading(false)}
                  onError={() => {
                    setQrLoading(false);
                    setQrError(true);
                  }}
                />
              )}
            </div>
            {/* Thông tin tk ngân hàng*/}
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-xs font-black text-slate-900 tracking-tight uppercase">
                NEXUS CYBER - TON HOANG CAM
              </span>
              <span className="text-[11px] font-mono text-slate-600 font-medium">
                Vietcombank (VCB) - STK: <strong className="text-slate-900 font-bold">1040682932</strong>
              </span>
            </div>
          </div>
          {/* 2.3: Khối cảnh báo chuyển khoản thủ công */}
          <div className="bg-amber-50/90 border border-amber-200/90 p-3 rounded-2xl flex flex-col gap-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 font-semibold leading-tight">
                Nếu chuyển khoản thủ công, vui lòng nhập chính xác số tiền và sao chép đúng nội dung bên dưới:
              </p>
            </div>
            {/* Hiển thị song song tiền và nội dung */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Ô Số tiền đã chọn */}
              <div className="bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-center">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Số tiền nạp</span>
                <span className="text-xs font-mono font-black text-slate-900">
                  {selectedAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              {/* Ô nội dung+copy */}
              <div className="bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Nội dung CK</span>
                  <span className="text-xs font-mono font-black text-amber-900 truncate">
                    {transferContent}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="p-1 rounded-lg text-cyan-600 hover:bg-cyan-50 transition cursor-pointer shrink-0 ml-1"
                  title="Sao chép nội dung"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          {/*  Nút Hoàn tất */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            Đã chuyển khoản xong
          </button>
        </div>
      </div>
    </div>
  );
}