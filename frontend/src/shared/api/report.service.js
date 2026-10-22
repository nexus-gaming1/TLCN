import { apiClient } from './client';


//ReportService-> kết nối và lấy dữ liệu báo cáo thống kê từ backend API /api/reports
class ReportService {
  
   //Lấy báo cáo thống kê doanh thu theo số ngày
   // @param {number} days - Số ngày cần xem (7, 14, 30...)
   // @returns {Promise<{ summary: Object, chartData: Array }>}
   
  async getRevenueReport(days = 7) {
    try {
      const response = await apiClient.get(`/reports/revenue?days=${days}`);
      if (response && response.status === 'success') {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi tải báo cáo doanh thu từ API:', error);
      throw error;
    }
  }
}

export default new ReportService();