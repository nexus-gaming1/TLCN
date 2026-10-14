import React from 'react';
import { X, Layers, Clock, Calendar, CheckCircle, Zap, Shield } from 'lucide-react';

/**
 * PricingPlanDetailModal (Modal Xem Chi Tiết Bảng Giá & Giờ Vàng)
 */
export default function PricingPlanDetailModal({ isOpen, onClose, plan }) {
  if (!isOpen || !plan) return null;

  const formatVND = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const zones = plan.zones || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{plan.name}</h3>
                <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  ID: #{plan.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Bảng giá cước & Khung giờ khuyến mãi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 font-bold block mb-1">Mức Giá / Giờ</span>
              <span className="text-xl font-black text-slate-900">{formatVND(plan.pricePerHour)}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 font-bold block mb-1">Loại Phiên Chơi</span>
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5 mt-1">
                {plan.planType === 'REMOTE' ? (
                  <>
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span>Chơi Từ Xa</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 text-sky-600" />
                    <span>Chơi Tại Quán</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Timing details */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block">Quy Tắc Thời Gian Áp Dụng</span>
            
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {plan.startTime && plan.endTime
                  ? `Khung giờ vàng: ${plan.startTime.slice(0, 5)} đến ${plan.endTime.slice(0, 5)}`
                  : 'Áp dụng toàn bộ thời gian trong ngày (Cố định)'}
              </span>
            </div>

            {plan.applyDate && (
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Chỉ áp dụng vào ngày: {plan.applyDate}</span>
              </div>
            )}
          </div>

          {/* Zones */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block">Phân Khu Máy Gán Với Bảng Giá</span>
            {zones.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {zones.map((z) => (
                  <span
                    key={z.zone_id}
                    className="px-2.5 py-1 bg-white text-slate-800 font-semibold rounded-lg border border-slate-200 shadow-xs"
                  >
                    {z.zone_name} (Tầng {z.tier_level || 1})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">Bảng giá áp dụng mặc định cho tất cả các máy tính.</p>
            )}
          </div>

          {/* Priority & Status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-bold">Độ ưu tiên áp dụng:</span>{' '}
              <span className="font-mono font-bold text-slate-900">P{plan.priority || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${plan.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span className={plan.isActive ? 'text-emerald-700' : 'text-slate-500'}>
                {plan.isActive ? 'Đang Hoạt Động' : 'Đang Tạm Ngưng'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 h-9 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
