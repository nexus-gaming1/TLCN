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
}

module.exports = new ReportController();
module.exports.ReportController = ReportController;