import { apiClient } from './client';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

//ReportService-> kết nối và lấy dữ liệu báo cáo thống kê từ backend API /api/reports
class ReportService {
  // Helper đóng gói query params (hỗ trợ cả số ngày days lẫn { startDate, endDate })
  buildQueryParams(params = 7) {
    const query = new URLSearchParams();
    if (typeof params === 'object' && params !== null) {
      if (params.startDate && params.endDate) {
        query.set('startDate', params.startDate);
        query.set('endDate', params.endDate);
      } else if (params.days) {
        query.set('days', params.days);
      }
    } else if (params) {
      query.set('days', params);
    }
    return query.toString();
  }

  // Lấy báo cáo thống kê doanh thu
  async getRevenueReport(params = 7) {
    try {
      const qs = this.buildQueryParams(params);
      const response = await apiClient.get(`/reports/revenue?${qs}`);
      if (response && response.status === 'success') {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi tải báo cáo doanh thu từ API:', error);
      throw error;
    }
  }

  // Gọi API tải file Excel báo cáo doanh thu (Binary Blob + hỗ trợ AbortSignal)
  async exportRevenueExcel(params = 7, signal) {
    try {
      const token = apiClient.getToken();
      const qs = this.buildQueryParams(params);
      const response = await fetch(`${API_BASE_URL}/reports/revenue/export?${qs}`, {
        method: 'GET',
        signal,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        let errMessage = `Xuất báo cáo thất bại (Mã lỗi: ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.message) errMessage = errJson.message;
        } catch {
          // Bỏ qua nếu response không phải JSON
        }
        throw new Error(errMessage);
      }
      // Tên file dự phòng nếu trình duyệt không đọc được header Content-Disposition
      let filename =
        typeof params === 'object' && params?.startDate && params?.endDate
          ? `Bao_Cao_Doanh_Thu_NEXUS_${params.startDate}_den_${params.endDate}.xlsx`
          : `Bao_Cao_Doanh_Thu_NEXUS_${params}_ngay.xlsx`;

      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      const blob = await response.blob();
      return { blob, filename };
    } catch (error) {
      console.error('Lỗi khi xuất file Excel báo cáo:', error);
      throw error;
    }
  }
}

export default new ReportService();