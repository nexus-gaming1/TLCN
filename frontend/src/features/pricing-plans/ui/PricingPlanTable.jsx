import {
  Eye,
  Edit,
  Clock,
  Calendar,
  Layers,
  Shield,
  Zap
} from 'lucide-react';
import { formatVND } from '../../../shared/utils/formatters';

/**
 * Badge cho loại phiên (plan_type)
 */
function PlanTypeBadge({ type }) {
  if (type === 'REMOTE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200/80 text-xs font-bold whitespace-nowrap">
        <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
        <span>Chơi Từ Xa</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80 text-xs font-bold whitespace-nowrap">
      <Shield className="w-3.5 h-3.5 text-sky-600 shrink-0" />
      <span>Chơi Tại Quán</span>
    </span>
  );
}

/**
 * PricingPlanTable (Bảng hiển thị PricingPlan & Giờ vàng)
 */
export default function PricingPlanTable({
  plans = [],
  onViewDetail,
  onEdit,
  onToggleActive
}) {
  if (!plans || plans.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Không có bảng giá nào</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Không tìm thấy cấu hình bảng giá nào phù hợp với bộ lọc hiện tại. Vui lòng thử tìm kiếm lại hoặc tạo bảng giá mới.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Tên Bảng Giá</th>
              <th className="py-3 px-4">Loại Phiên</th>
              <th className="py-3 px-4">Mức Giá / Giờ</th>
              <th className="py-3 px-4">Khung Giờ Áp Dụng</th>
              <th className="py-3 px-4">Khu Vực (Zones)</th>
              <th className="py-3 px-4 text-center">Độ Ưu Tiên</th>
              <th className="py-3 px-4 text-center">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {plans.map((plan) => {
              const rawStartTime = plan.startTime || plan.start_time;
              const rawEndTime = plan.endTime || plan.end_time;
              const hasHours = Boolean(rawStartTime && rawEndTime);
              const displayStartTime = rawStartTime ? String(rawStartTime).slice(0, 5) : '';
              const displayEndTime = rawEndTime ? String(rawEndTime).slice(0, 5) : '';
              const zones = plan.zones || [];

              return (
                <tr
                  key={plan.id}
                  className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  onClick={() => onViewDetail && onViewDetail(plan)}
                >
                  {/* Tên Bảng Giá */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {plan.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      ID: #{plan.id}
                    </div>
                  </td>

                  {/* Loại Phiên */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <PlanTypeBadge type={plan.planType} />
                  </td>

                  {/* Mức Giá / Giờ */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {formatVND(plan.pricePerHour)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal"> / giờ</span>
                  </td>

                  {/* Khung Giờ Áp Dụng */}
                  <td className="py-3 px-4">
                    {hasHours ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-[11px] border border-amber-200/60 w-fit">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{displayStartTime} - {displayEndTime}</span>
                        </span>
                        {plan.applyDate && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Ngày {plan.applyDate}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                        <span>Cố định cả ngày</span>
                      </span>
                    )}
                  </td>

                  {/* Khu Vực Máy (Zones) */}
                  <td className="py-3 px-4 max-w-[200px]">
                    {zones.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {zones.map((zone) => (
                          <span
                            key={zone.zone_id}
                            className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded border border-slate-200 truncate"
                            title={zone.zone_name}
                          >
                            {zone.zone_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Tất cả khu vực</span>
                    )}
                  </td>

                  {/* Độ Ưu Tiên */}
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      P{plan.priority || 0}
                    </span>
                  </td>

                  {/* Trạng Thái Kích Hoạt (Cần gạt Toggle Switch 1-click giống Kho Game) */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleActive && onToggleActive(plan)}
                        role="switch"
                        aria-checked={plan.isActive}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                          plan.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={plan.isActive ? 'Đang mở - Click để tạm ngưng' : 'Tạm tắt - Click để kích hoạt'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            plan.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[11px] font-bold select-none ${
                          plan.isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {plan.isActive ? 'Đang mở' : 'Tạm tắt'}
                      </span>
                    </div>
                  </td>

                  {/* Thao Tác (Action Buttons) */}
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewDetail && onViewDetail(plan)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 flex items-center justify-center transition cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit && onEdit(plan)}
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
