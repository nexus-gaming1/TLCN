import { Layers, CheckCircle2, Clock, DollarSign, Sparkles } from 'lucide-react';
import { formatVND } from '../../../shared/utils/formatters';

/**
 * PricingPlanKpiCards (Hiển thị KPI Bảng giá & Giờ vàng)
 * Hiển thị 4 thẻ thông số tổng quan về cấu hình giá máy
 */
export default function PricingPlanKpiCards({ metrics }) {
  const totalPlans = metrics?.totalPlans || 0;
  const activePlans = metrics?.activePlans || 0;
  const happyHourPlans = metrics?.happyHourPlans || 0;
  const avgRate = Number(metrics?.avgRate || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1: Tổng Số Bảng Giá */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tổng Số Gói Giá
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{totalPlans}</span>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60">
                Gói Giá Máy
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-slate-600 text-xs">
          <Sparkles className="w-4 h-4 text-sky-600" />
          <span className="font-semibold text-slate-700">Phân tầng theo từng khu vực máy</span>
        </div>
      </div>

      {/* Card 2: Đang Áp Dụng */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Đang Kích Hoạt
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{activePlans}</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                Hoạt Động
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-700">Tự động áp dụng theo thời gian thực</span>
        </div>
      </div>

      {/* Card 3: Khung Giờ Vàng / Khuyến Mãi */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Khung Giờ Vàng
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{happyHourPlans}</span>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                Giờ vàng
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-slate-600 text-xs">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-slate-700">Giá ưu đãi theo khung giờ</span>
        </div>
      </div>

      {/* Card 4: Giá Cước Trung Bình */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Mức Giá Trung Bình
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{formatVND(avgRate)}</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                / giờ
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-slate-600 text-xs">
          <span className="font-semibold text-slate-700">Dựa trên các bảng giá đang kích hoạt</span>
        </div>
      </div>
    </div>
  );
}
