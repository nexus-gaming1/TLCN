const reportRepository = require('../repositories/reportRepository');
const supportService = require('./supportService');
const ExcelJS = require('exceljs');
const { ValidationError } = require('../utils/errors');

class ReportService {
  constructor(repository = reportRepository, supportSvc = supportService) {
    this.repository = repository;
    this.supportService = supportSvc;
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

  // Chuẩn hóa khoảng ngày thống kê theo múi giờ Việt Nam
  // Hỗ trợ đồng thời: (startDate, endDate) dạng YYYY-MM-DD hoặc fallback về days cũ
  resolveDateRange(days = 7, startDateStr = null, endDateStr = null) {
    const hasStart = Boolean(startDateStr && String(startDateStr).trim());
    const hasEnd = Boolean(endDateStr && String(endDateStr).trim());

    if (hasStart || hasEnd) {
      if (!hasStart || !hasEnd) {
        throw new ValidationError('Vui lòng chọn đầy đủ cả ngày bắt đầu (startDate) và ngày kết thúc (endDate).');
      }

      const startText = String(startDateStr).trim();
      const endText = String(endDateStr).trim();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startText) || !dateRegex.test(endText)) {
        throw new ValidationError('Định dạng ngày không hợp lệ. Vui lòng dùng chuẩn YYYY-MM-DD.');
      }

      // Ép rõ múi giờ để Server ở bất kỳ múi giờ nào cũng hiểu đúng giờ VN
      const startDate = new Date(`${startText}T00:00:00.000+07:00`);
      const endDate = new Date(`${endText}T23:59:59.999+07:00`);

      if (
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime()) ||
        this.formatDateVN(startDate) !== startText ||
        this.formatDateVN(endDate) !== endText
      ) {
        throw new ValidationError('Ngày bắt đầu hoặc ngày kết thúc không tồn tại trên lịch.');
      }

      if (startDate > endDate) {
        throw new ValidationError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      }

      const startNoon = new Date(`${startText}T12:00:00.000+07:00`);
      const endNoon = new Date(`${endText}T12:00:00.000+07:00`);
      const parsedDays = Math.round((endNoon - startNoon) / (24 * 60 * 60 * 1000)) + 1;

      if (parsedDays > 366) {
        throw new ValidationError('Khoảng thời gian thống kê tối đa là 366 ngày.');
      }

      return { startDate, endDate, parsedDays };
    }

    // Không truyền startDate/endDate -> tính theo days như cũ
    const parsedDays = Math.min(Math.max(1, parseInt(days, 10) || 7), 365);
    const todayVN = this.formatDateVN(new Date());
    const endDate = new Date(`${todayVN}T23:59:59.999+07:00`);
    const startNoon = new Date(`${todayVN}T12:00:00.000+07:00`);
    startNoon.setDate(startNoon.getDate() - (parsedDays - 1));
    const startText = this.formatDateVN(startNoon);
    const startDate = new Date(`${startText}T00:00:00.000+07:00`);

    return { startDate, endDate, parsedDays };
  }


  //Lấy báo cáo doanh thu theo khoảng thời gian (days)
  //@param {number} days (mặc định là 7)
   async getRevenueReport(days = 7, startDateParam = null, endDateParam = null) {
    // 1. Xác định mốc thời gian chuẩn giờ Việt Nam 
    const { startDate, endDate, parsedDays } = this.resolveDateRange(days, startDateParam, endDateParam);

    // 2. Tạo khung ngày liên tục từ startDate đến endDate để lấp đầy ngày không có doanh thu trên biểu đồ
    const dateMap = {};
    const startNoon = new Date(`${this.formatDateVN(startDate)}T12:00:00.000+07:00`);
    for (let i = 0; i < parsedDays; i++) {
      const d = new Date(startNoon.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = this.formatDateVN(d);
      dateMap[dateKey] = {
        date: dateKey,
        displayDate: this.formatDisplayDateVN(d),
        topupRevenue: 0,
        serviceRevenue: 0,
        totalRevenue: 0
      };
    }
    // 3. Thực thi song song 7 truy vấn CSDL bằng Promise.all (Tối ưu tốc độ)
    const [
      topupRows,
      serviceRows,
      paymentMethodRows,
      topItemRows,
      topMemberRows,
      refundSummary,
      supportStats
    ] = await Promise.all([
      this.repository.getTopupRevenueByDateRange(startDate, endDate),
      this.repository.getServiceOrderRevenueByDateRange(startDate, endDate),
      this.repository.getPaymentMethodDistribution(startDate, endDate),
      this.repository.getTopSellingItems(startDate, endDate, 50),
      this.repository.getTopVipMembers(startDate, endDate, 50),
      this.repository.getRefundSummaryByDateRange(startDate, endDate),
      this.supportService.getStats().catch(() => ({ pendingRequests: 0 }))
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
    const formattedAllItems = topItemRows.map((row) => ({
      itemId: row.service_item_id,
      name: row.item_name || 'Món không tên',
      totalSold: parseInt(row.totalSold || 0, 10),
      revenue: parseFloat(row.revenue || 0)
    }));
    const formattedAllMembers = topMemberRows.map((row) => ({
      memberId: row.memberId,
      name: row.name || 'Khách vãng lai',
      username: row.username || '',
      totalTopup: parseFloat(row.totalTopup || 0)
    }));
    const totalPaymentMethodAmount = paymentMethodRows.reduce(
      (sum, row) => sum + parseFloat(row.total || 0),
      0
    );
    // 6. Format dữ liệu phân tích chuyên sâu
    const analytics = {
      // Tỷ trọng phương thức thanh toán (kèm phần trăm phục vụ cả Biểu đồ & Excel)
      paymentMethods: paymentMethodRows.map((row) => {
        const total = parseFloat(row.total || 0);
        const percentage = totalPaymentMethodAmount > 0
          ? Number(((total / totalPaymentMethodAmount) * 100).toFixed(1))
          : 0;
        return {
          method: row.method || 'OTHER',
          total,
          percentage
        };
      }),
      // Top 5 món ăn bán chạy (hiển thị dashboard & Excel)
      topItems: formattedAllItems.slice(0, 5),
      // Toàn bộ món ăn phát sinh bán trong kỳ (dùng cho Modal Xem tất cả)
      allItems: formattedAllItems,
      // Top 5 hội viên nạp tiền nhiều nhất (hiển thị card)
      topMembers: formattedAllMembers.slice(0, 5),
      // Danh sách mở rộng tối đa 50 hội viên nạp tiền trong kỳ (dùng cho Modal Xem tất cả)
      allMembers: formattedAllMembers
    };


    //Tổng hợp số liệu hoàn tiền sự cố, thực thu và phiếu hỗ trợ đang chờ
    const totalRefundAmount = parseFloat(refundSummary?.totalRefundAmount || 0);
    const refundCount = parseInt(refundSummary?.refundCount || 0, 10);
    const netRevenue = Math.max(0, grandTotalRevenue - totalRefundAmount);
    const pendingSupportRequests = parseInt(supportStats?.pendingRequests || 0, 10);


    // 7. Cấu trúc Response trả về hoàn chỉnh
    return {
      summary: {
        totalRevenue: grandTotalRevenue,
        totalTopupRevenue: grandTopupRevenue,
        totalServiceRevenue: grandServiceRevenue,
        totalRefundAmount,
        refundCount,
        netRevenue,
        pendingSupportRequests,
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
  async exportRevenueExcel(days = 7,  startDateParam = null, endDateParam = null) {
    // 1. Tận dụng dữ liệu chuẩn đã tính toán (dùng chung logic ngày với getRevenueReport)
    const reportData = await this.getRevenueReport(days, startDateParam, endDateParam);
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
    sheet1.getCell('B4').value = `Kỳ báo cáo: ${summary.startDate} đến ${summary.endDate} (${summary.days} ngày)`;
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