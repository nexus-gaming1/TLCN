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

    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    return `${day}/${month}`;
  }

  
   //Lấy báo cáo doanh thu theo khoảng thời gian (days)
   //@param {number} days (mặc định là 7)

  async getRevenueReport(days = 7) {
    const parsedDays = Math.max(1, parseInt(days, 10) || 7);

    // 1. Tính toán khoảng thời gian (startDate -> endDate) theo giờ Việt Nam
    const now = new Date();
    
    // Mốc kết thúc: Cuối ngày hôm nay 
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    // Mốc bắt đầu: 00:00:00 của (days - 1) ngày trước
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (parsedDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // 2. Tạo khung thời gian để lấp đầy ngày trống
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

    // 3. Truy vấn CSDL cho tiền nạp và tiền món ăn
    const [topupRows, serviceRows] = await Promise.all([
      this.repository.getTopupRevenueByDateRange(startDate, endDate),
      this.repository.getServiceOrderRevenueByDateRange(startDate, endDate)
    ]);

    // 4. Ánh xạ kết quả nạp tiền vào dateMap
    topupRows.forEach((row) => {
      const key = String(row.date);
      if (dateMap[key]) {
        dateMap[key].topupRevenue = parseFloat(row.topupRevenue || 0);
      }
    });

    // 5. Ánh xạ kết quả tiền đồ ăn vào dateMap
    serviceRows.forEach((row) => {
      const key = String(row.date);
      if (dateMap[key]) {
        dateMap[key].serviceRevenue = parseFloat(row.serviceRevenue || 0);
      }
    });

    // 6. Tính tổng từng ngày và tổng toàn kỳ
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

    return {
      summary: {
        totalRevenue: grandTotalRevenue,
        totalTopupRevenue: grandTopupRevenue,
        totalServiceRevenue: grandServiceRevenue,
        days: parsedDays,
        startDate: this.formatDateVN(startDate),
        endDate: this.formatDateVN(endDate)
      },
      chartData
    };
  }
}

module.exports = new ReportService();
module.exports.ReportService = ReportService;