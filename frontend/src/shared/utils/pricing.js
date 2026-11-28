/**
 * Utility tính toán và tìm gói giá áp dụng cho máy trạm
 * Phản ánh chính xác logic của hàm findPricingPlan trong backend/src/services/billingService.js
 */

/**
 * Tìm bảng giá áp dụng cho máy trạm tại một thời điểm
 * @param {Object} station - Máy trạm kèm ComputerZone và PricingPlans
 * @param {Date} [at=new Date()] - Thời điểm kiểm tra
 * @param {string} [preferredType='REMOTE'] - Loại phiên thuê ưu tiên ('REMOTE' hoặc 'LOCAL')
 * @returns {Object|null} Bảng giá áp dụng phù hợp nhất (chuẩn hóa đầy đủ price_per_hour, hourly_rate, name, plan_name)
 */
export function findPricingPlan(station, at = new Date(), preferredType = 'REMOTE') {
  if (!station) return null;

  const zone = station.ComputerZone || station.zone || {};
  const rawPlans = zone?.PricingPlans || zone?.pricing_plans || station.PricingPlans || station.pricing_plans;

  const normalizePlan = (p) => {
    if (!p) return null;
    const rate = p.price_per_hour != null 
      ? Number(p.price_per_hour) 
      : (p.hourly_rate != null ? Number(p.hourly_rate) : (p.price != null ? Number(p.price) : 0));
    const title = p.name || p.plan_name || 'Gói cước theo giờ';
    return {
      ...p,
      price_per_hour: rate,
      hourly_rate: rate,
      name: title,
      plan_name: title
    };
  };

  if (!Array.isArray(rawPlans) || rawPlans.length === 0) {
    if (station.price_per_hour != null || station.hourly_rate != null) {
      const fallbackRate = Number(station.price_per_hour ?? station.hourly_rate);
      return normalizePlan({
        name: 'Gói cước tiêu chuẩn',
        price_per_hour: fallbackRate,
        plan_type: preferredType
      });
    }
    return null;
  }

  // Lọc các gói đang hoạt động và sắp xếp theo priority DESC, sau đó pricing_plan_id ASC
  const sortedPlans = [...rawPlans]
    .filter((p) => p && p.is_active !== false)
    .sort((a, b) => {
      const pDiff = (b.priority || 0) - (a.priority || 0);
      if (pDiff !== 0) return pDiff;
      return (a.pricing_plan_id || 0) - (b.pricing_plan_id || 0);
    });

  if (sortedPlans.length === 0) {
    if (station.price_per_hour != null || station.hourly_rate != null) {
      const fallbackRate = Number(station.price_per_hour ?? station.hourly_rate);
      return normalizePlan({
        name: 'Gói cước tiêu chuẩn',
        price_per_hour: fallbackRate,
        plan_type: preferredType
      });
    }
    return null;
  }

  // Định dạng time (HH:mm:ss) và date (YYYY-MM-DD) theo giờ địa phương
  const hours = String(at.getHours()).padStart(2, '0');
  const minutes = String(at.getMinutes()).padStart(2, '0');
  const seconds = String(at.getSeconds()).padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;

  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;

  const isApplicable = (plan, type) => {
    if (!plan.is_active && plan.is_active !== undefined) return false;

    // Kiểm tra loại gói (plan_type)
    if (plan.plan_type && type && plan.plan_type !== type) {
      return false;
    }

    // Kiểm tra khung giờ hoạt động (start_time và end_time)
    if (plan.start_time && plan.end_time) {
      const st = String(plan.start_time).slice(0, 8);
      const et = String(plan.end_time).slice(0, 8);
      if (st <= et) {
        if (time < st || time > et) return false;
      } else {
        // Khung giờ qua đêm (ví dụ: 22:00:00 -> 06:00:00)
        if (time < st && time > et) return false;
      }
    }

    // Kiểm tra ngày áp dụng cụ thể (apply_date)
    if (plan.apply_date) {
      const planDate = String(plan.apply_date).slice(0, 10);
      if (planDate !== date) return false;
    }

    return true;
  };

  // 1. Ưu tiên tìm gói giá phù hợp với preferredType (REMOTE)
  const applicablePreferred = sortedPlans.find((p) => isApplicable(p, preferredType));
  if (applicablePreferred) return normalizePlan(applicablePreferred);

  // 2. Dự phòng: Nếu không có gói REMOTE riêng, tìm gói chung hoặc LOCAL áp dụng được
  const applicableFallback = sortedPlans.find(
    (p) => isApplicable(p, null) || isApplicable(p, 'LOCAL')
  );
  if (applicableFallback) return normalizePlan(applicableFallback);

  // 3. Fallback cuối cùng: lấy gói cước đầu tiên đang hoạt động
  return normalizePlan(sortedPlans[0]);
}

/**
 * Định dạng số tiền sang định dạng tiền tệ Việt Nam (VNĐ)
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '0đ';
  return `${num.toLocaleString('vi-VN')}đ`;
}
