const reportService = require('../services/reportService');

class ReportController {
  constructor(service = reportService) {
    this.reportService = service;
  }

  
   //GET /api/reports/revenue?days=7
  async getRevenueReport(req, res, next) {
    try {
      const { days } = req.query;
      const data = await this.reportService.getRevenueReport(days);

      return res.json({
        status: 'success',
        data,
        message: 'Lấy báo cáo thống kê doanh thu thành công'
      });
    } catch (error) {
      next(error);
    }
  }

  
  //GET /api/reports/revenue/export?days=7
  //Xuất file Excel báo cáo doanh thu dạng Binary Stream
  async exportRevenueReport(req, res, next) {
    try {
      const { days } = req.query;
      const { workbook, summary } = await this.reportService.exportRevenueExcel(days);

      // Tạo tên file kèm mốc thời gian rõ ràng
      const filename = `Bao_Cao_Doanh_Thu_NEXUS_${summary.startDate}_den_${summary.endDate}.xlsx`;

      // Cấu hình Header truyền file nhị phân chuẩn Excel
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      // Expose header để Frontend đọc được tên file từ Content-Disposition
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      // Ghi stream trực tiếp vào response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      // Nếu header đã gửi hoặc stream đã bị hủy thì destroy socket, không gọi next(error)
      if (res.headersSent || res.destroyed) {
        if (!res.destroyed) res.destroy(error);
        return;
      }
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Disposition');
      res.removeHeader('Access-Control-Expose-Headers');
      return next(error);
    }
  }
}

module.exports = new ReportController();
module.exports.ReportController = ReportController;