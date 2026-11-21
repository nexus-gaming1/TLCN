import { apiClient } from './client';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  
  //Gọi API tải file Excel báo cáo doanh thu (Xử lý dạng Binary Blob)
  // @param {number} days - Số ngày cần xuất
  // @returns {Promise<{ blob: Blob, filename: string }>}
    async exportRevenueExcel(days = 7) {
    try {
      const token = apiClient.getToken();
      const response = await fetch(`${API_BASE_URL}/reports/revenue/export?days=${days}`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error(`Xuất báo cáo thất bại (Mã lỗi: ${response.status})`);
      }
      // Trích xuất tên file từ header Content-Disposition (nếu có)
      let filename = `Bao_Cao_Doanh_Thu_NEXUS_${days}_ngay.xlsx`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      // Đọc response dưới dạng Blob nhị phân
      const blob = await response.blob();
      return { blob, filename };
    } catch (error) {
      console.error('Lỗi khi xuất file Excel báo cáo:', error);
      throw error;
    }
  }
}

export default new ReportService();