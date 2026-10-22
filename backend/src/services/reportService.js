const reportRepository = require('../repositories/reportRepository');
const ExcelJS = require('exceljs');

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
   
   // Tạo Workbook Excel báo cáo doanh thu chuyên nghiệp
   // @param {number} days - Số ngày thống kê
   // @returns {Promise<ExcelJS.Workbook>}
  async exportRevenueExcel(days = 7) {
    // 1. Tận dụng dữ liệu chuẩn đã tính toán
    const reportData = await this.getRevenueReport(days);
    const { summary, chartData, analytics } = reportData;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NEXUS Cloud Cyber OS';
    workbook.created = new Date();
    
    // Sheet 1: Doanh thu và dòng tiền theo ngày
    
    const sheet1 = workbook.addWorksheet('Doanh Thu & Dòng Tiền', {
      views: [{ showGridLines: true }]
    });
    // Cấu hình độ rộng các cột
    sheet1.columns = [
      { key: 'colA', width: 8 },   // STT
      { key: 'colB', width: 18 },  // Ngày
      { key: 'colC', width: 26 },  // Tiền nạp tài khoản (VNĐ)
      { key: 'colD', width: 26 },  // Tiền dịch vụ F&B (VNĐ)
      { key: 'colE', width: 28 },  // Tổng doanh thu (VNĐ)
    ];
    // Dòng 1: Tiêu đề Báo cáo (Banner thương hiệu)
    sheet1.mergeCells('A1:E1');
    const titleRow = sheet1.getCell('A1');
    titleRow.value = 'HỆ THỐNG QUẢN LÝ PHÒNG MÁY NEXUS CLOUD CYBER OS';
    titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } 
    };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 35;
    // Dòng 2: Tên báo cáo
    sheet1.mergeCells('A2:E2');
    const subTitleRow = sheet1.getCell('A2');
    subTitleRow.value = 'BÁO CÁO THỐNG KÊ DOANH THU VÀ DÒNG TIỀN';
    subTitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF059669' } }; // Emerald 600
    subTitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(2).height = 25;
    // Dòng 3, 4: Metadata (Thời gian & Kỳ báo cáo)
    sheet1.getCell('B3').value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;
    sheet1.getCell('B3').font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    sheet1.getCell('B4').value = `Kỳ báo cáo: ${summary.startDate} đến ${summary.endDate} (${summary.days} ngày gần nhất)`;
    sheet1.getCell('B4').font = { bold: true, size: 10, color: { argb: 'FF334155' } };
    // Dòng 6: Khối Tóm tắt KPI
    sheet1.getCell('B6').value = 'TỔNG TIỀN NẠP VÍ:';
    sheet1.getCell('B6').font = { bold: true };
    sheet1.getCell('C6').value = summary.totalTopupRevenue;
    sheet1.getCell('C6').numFmt = '#,##0 "₫"';
    sheet1.getCell('C6').font = { bold: true, color: { argb: 'FF0284C7' } }; // Cyan
    sheet1.getCell('B7').value = 'TỔNG DOANH THU F&B:';
    sheet1.getCell('B7').font = { bold: true };
    sheet1.getCell('C7').value = summary.totalServiceRevenue;
    sheet1.getCell('C7').numFmt = '#,##0 "₫"';
    sheet1.getCell('C7').font = { bold: true, color: { argb: 'FFD97706' } }; // Amber
    sheet1.getCell('B8').value = 'TỔNG DOANH THU TOÀN KỲ:';
    sheet1.getCell('B8').font = { bold: true };
    sheet1.getCell('C8').value = summary.totalRevenue;
    sheet1.getCell('C8').numFmt = '#,##0 "₫"';
    sheet1.getCell('C8').font = { bold: true, size: 11, color: { argb: 'FF059669' } }; // Emerald
    // Dòng 10: Header Bảng dữ liệu chi tiết
    const headerRow = sheet1.getRow(10);
    headerRow.values = ['STT', 'Ngày', 'Tiền Nạp Ví (VNĐ)', 'Tiền Đồ Ăn/Uống (VNĐ)', 'Tổng Doanh Thu (VNĐ)'];
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' } // Emerald 600
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' }
      };
    });
    // Đổ dữ liệu các ngày từ chartData
    let startDataRow = 11;
    chartData.forEach((item, index) => {
      const row = sheet1.getRow(startDataRow + index);
      row.values = [
        index + 1,
        item.date,
        item.topupRevenue,
        item.serviceRevenue,
        item.totalRevenue
      ];
      row.height = 20;
      // Căn giữa cho STT và Ngày
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      // Căn phải và format tiền tệ VNĐ cho các cột số tiền
      [3, 4, 5].forEach((colIdx) => {
        const cell = row.getCell(colIdx);
        cell.numFmt = '#,##0 "₫"';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      });
      // Viền từng ô
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });
    // Dòng tổng cộng cuối bảng (dùng công thức SUM của Excel)
    const totalRowIdx = startDataRow + chartData.length;
    const totalRow = sheet1.getRow(totalRowIdx);
    totalRow.height = 24;
    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'TỔNG CỘNG';
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    // Công thức tính tổng cho từng cột
    totalRow.getCell(3).value = { formula: `SUM(C${startDataRow}:C${totalRowIdx - 1})` };
    totalRow.getCell(4).value = { formula: `SUM(D${startDataRow}:D${totalRowIdx - 1})` };
    totalRow.getCell(5).value = { formula: `SUM(E${startDataRow}:E${totalRowIdx - 1})` };
    [3, 4, 5].forEach((colIdx) => {
      const cell = totalRow.getCell(colIdx);
      cell.numFmt = '#,##0 "₫"';
      cell.font = { bold: true, color: { argb: 'FF059669' } };
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
    totalRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'double' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // Slate 100
      };
    });
    
    // Sheet 2: Phân tích dịch vụ và phương thức thanh toán 
    const sheet2 = workbook.addWorksheet('Phân Tích Dịch Vụ', {
      views: [{ showGridLines: true }]
    });
    sheet2.columns = [
      { key: 'colA', width: 6 },
      { key: 'colB', width: 28 },
      { key: 'colC', width: 18 },
      { key: 'colD', width: 24 }
    ];
    // Bảng 2.1: Tỷ trọng phương thức thanh toán
    sheet2.getCell('A1').value = '1. CƠ CẤU PHƯƠNG THỨC THANH TOÁN NẠP TIỀN';
    sheet2.getCell('A1').font = { bold: true, size: 11, color: { argb: 'FF0284C7' } };
    const pmHeader = sheet2.getRow(2);
    pmHeader.values = ['STT', 'Phương Thức', 'Số Giao Dịch / Tỷ Trọng', 'Tổng Tiền (VNĐ)'];
    pmHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    (analytics.paymentMethods || []).forEach((pm, idx) => {
      const row = sheet2.getRow(3 + idx);
      row.values = [idx + 1, pm.method, `${pm.percentage || 0}%`, pm.total];
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).numFmt = '#,##0 "₫"';
      row.getCell(4).alignment = { horizontal: 'right' };
    });
    // Bảng 2.2: Top 5 món bán chạy nhất
    const topItemStartRow = 5 + (analytics.paymentMethods || []).length;
    sheet2.getCell(`A${topItemStartRow}`).value = '2. TOP MÓN ĂN / THỨC UỐNG BÁN CHẠY NHẤT';
    sheet2.getCell(`A${topItemStartRow}`).font = { bold: true, size: 11, color: { argb: 'FFD97706' } };
    const itemHeader = sheet2.getRow(topItemStartRow + 1);
    itemHeader.values = ['STT', 'Tên Món F&B', 'Số Lượng Đã Bán', 'Doanh Thu (VNĐ)'];
    itemHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    (analytics.topItems || []).forEach((item, idx) => {
      const row = sheet2.getRow(topItemStartRow + 2 + idx);
      row.values = [idx + 1, item.name, item.totalSold, item.revenue];
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).numFmt = '#,##0 "₫"';
      row.getCell(4).alignment = { horizontal: 'right' };
    });
    return { workbook, summary };
  }
}

module.exports = new ReportService();
module.exports.ReportService = ReportService;