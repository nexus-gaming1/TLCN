const reportRepository = require('../repositories/reportRepository');

class ReportService {
  constructor(repository = reportRepository) {
    this.repository = repository;
  }

  
   //Format Date thành chuỗi, theo Timezone Việt Nam 
  formatDateVN(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  }

  
  //Format hiển thị ngắn gọn, vd: '18/10'
  formatDisplayDateVN(date) {
    const parts = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit'
    }).formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    return `${day}/${month}`;
  }

  
  //Lấy báo cáo doanh thu theo khoảng thời gian (days)
  //@param {number} days (mặc định là 7)
  async getRevenueReport(days = 7) {
    const parsedDays = Math.min(Math.max(1, parseInt(days, 10) || 7), 365);
    // 1. Xác định mốc thời gian theo giờ Việt Nam bất chấp múi giờ của Server
    const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
    const now = new Date(vnTimeStr);
    // Mốc kết thúc: Cuối ngày hôm nay (23:59)
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    // Mốc bắt đầu: 00:00:00 của (days - 1) ngày trước
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (parsedDays - 1));
    startDate.setHours(0, 0, 0, 0);
    // 2. Tạo khung thời gian rỗng để lấp đầy ngày trống cho biểu đồ
    const dateMap = {};
    for (let i = parsedDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = this.formatDateVN(d);
      dateMap[dateKey] = {
        date: dateKey,
        displayDate: this.formatDisplayDateVN(d),
        topupRevenue: 0,
        serviceRevenue: 0,
        totalRevenue: 0
      };
    }
    // 3. Thực thi song song 5 truy vấn CSDL bằng Promise.all (Tối ưu tốc độ)
    const [
      topupRows,
      serviceRows,
      paymentMethodRows,
      topItemRows,
      topMemberRows
    ] = await Promise.all([
      this.repository.getTopupRevenueByDateRange(startDate, endDate),
      this.repository.getServiceOrderRevenueByDateRange(startDate, endDate),
      this.repository.getPaymentMethodDistribution(startDate, endDate),
      this.repository.getTopSellingItems(startDate, endDate, 5),
      this.repository.getTopVipMembers(startDate, endDate, 5)
    ]);
    // 4. Ánh xạ dữ liệu biểu đồ nạp tiền và tiền món ăn vào dateMap
    topupRows.forEach((row) => {
      const key = String(row.date);
      if (dateMap[key]) {
        dateMap[key].topupRevenue = parseFloat(row.topupRevenue || 0);
      }
    });
    serviceRows.forEach((row) => {
      const key = String(row.date);
      if (dateMap[key]) {
        dateMap[key].serviceRevenue = parseFloat(row.serviceRevenue || 0);
      }
    });
    // 5. Tính tổng doanh thu từng ngày và tổng toàn kỳ
    let grandTopupRevenue = 0;
    let grandServiceRevenue = 0;
    const chartData = Object.values(dateMap).map((item) => {
      const dailyTotal = item.topupRevenue + item.serviceRevenue;
      grandTopupRevenue += item.topupRevenue;
      grandServiceRevenue += item.serviceRevenue;
      return {
        ...item,
        totalRevenue: dailyTotal
      };
    });
    const grandTotalRevenue = grandTopupRevenue + grandServiceRevenue;
    // 6. Format dữ liệu phân tích chuyên sâu
    const analytics = {
      // Tỷ trọng phương thức thanh toán
      paymentMethods: paymentMethodRows.map((row) => ({
        method: row.method || 'OTHER',
        total: parseFloat(row.total || 0)
      })),
      // Top 5 món ăn bán chạy
      topItems: topItemRows.map((row) => ({
        itemId: row.service_item_id,
        name: row.item_name || 'Món không tên',
        totalSold: parseInt(row.totalSold || 0, 10),
        revenue: parseFloat(row.revenue || 0)
      })),
      // Top 5 hội viên nạp tiền nhiều nhất
      topMembers: topMemberRows.map((row) => ({
        memberId: row.memberId,
        name: row.name || 'Khách vãng lai',
        username: row.username || '',
        totalTopup: parseFloat(row.totalTopup || 0)
      }))
    };
    // 7. Cấu trúc Response trả về hoàn chỉnh
    return {
      summary: {
        totalRevenue: grandTotalRevenue,
        totalTopupRevenue: grandTopupRevenue,
        totalServiceRevenue: grandServiceRevenue,
        days: parsedDays,
        startDate: this.formatDateVN(startDate),
        endDate: this.formatDateVN(endDate)
      },
      chartData,
      analytics
    };
  }
}

module.exports = new ReportService();
module.exports.ReportService = ReportService;