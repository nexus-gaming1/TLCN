import React, { useState, useEffect, useRef} from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

import reportService from '../../shared/api/report.service';
import RevenueChart from '../../features/reports/ui/RevenueChart';
import PaymentMethodChart from '../../features/reports/ui/PaymentMethodChart';
import TopMembersTable from '../../features/reports/ui/TopMembersTable';
import TopSellingItems from '../../features/reports/ui/TopSellingItems';

import {
  Gamepad2,
  Utensils,
  RefreshCw,
  Loader2,
  TrendingUp,
  Download
} from 'lucide-react';

export default function RevenueReportPage({ user, onLogout }) {
  const [daysFilter, setDaysFilter] = useState(7); // Mặc định 7 ngày gần nhất
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Thêm cờ để kích hoạt nút Refresh
  const [isExporting, setIsExporting] = useState(false);

  // Hàm tải dữ liệu báo cáo từ Backend API (fix lỗi Race Condition)
  useEffect(() => {
    let ignore = false; // Cờ theo dõi trạng thái vòng đời của request

    const fetchReportData = async () => {
      setLoading(true);
      try {
        const data = await reportService.getRevenueReport(daysFilter);
        // Chỉ cập nhật UI nếu người dùng chưa bấm sang filter khác
        if (!ignore) {
          setReportData(data);
        }
      } catch (err) {
        if (!ignore) console.error('Lỗi khi nạp dữ liệu báo cáo doanh thu:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchReportData();

    // Cleanup function: Kích hoạt khi daysFilter bị thay đổi (user bấm nút khác)
    return () => {
      ignore = true; // Bật cờ ignore lên để hủy bỏ kết quả của request cũ
    };
  }, [daysFilter, refreshKey]); // Thêm refreshKey vào dependency để kích hoạt reload khi bấm nút Refresh

  // Hàm gắn vào nút Làm mới
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  const summary = reportData?.summary || {
    totalRevenue: 0,
    totalTopupRevenue: 0,
    totalServiceRevenue: 0,
    days: daysFilter
  };

  const chartData = reportData?.chartData || [];
  const analytics = reportData?.analytics || {
    paymentMethods: [],
    topItems: [],
    topMembers: []
  };

  const exportAbortRef = useRef(null);

  // Cleanup: Hủy tải file nếu người dùng chuyển sang trang khác
  useEffect(() => {
    return () => {
      if (exportAbortRef.current) {
        exportAbortRef.current.abort();
      }
    };
  }, []);

  
const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const { blob, filename } = await reportService.exportRevenueExcel(daysFilter, controller.signal);

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Lỗi khi xuất file báo cáo Excel:', err);
        alert(err.message || 'Có lỗi xảy ra khi xuất file báo cáo Excel');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Top Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onLogout={onLogout}
      />

      {/* Thanh sidebar bên trái, gắn đường dẫn cho tab (Active nav = 'reports') */}
      <Sidebar activeNav="reports" bootromStatus="ONLINE" role="ADMIN" />

      {/* vùng nội dung chính */}
      <div className="lg:pl-[240px]">
        <main className="relative pt-16 pb-20 min-h-screen bg-[#F8F9FA] w-full px-8 py-6 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">
            
            {/* Lọc theo thời gian*/}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] uppercase text-emerald-700 font-extrabold tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Financial Analytics v2.0
                  </span>
                  <span className="text-slate-400 font-bold">•</span>
                  <span className="text-slate-500 font-semibold">Báo Cáo Kế Toán</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Báo Cáo &amp; Thống Kê Doanh Thu
                </h1>
                <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
                  Thống kê tổng dòng tiền nạp tài khoản và doanh thu dịch vụ ăn uống F&amp;B theo chu kỳ thời gian.
                </p>
              </div>

              {/* Bộ lọc thời gian gợi ý sẵn */}
              <div className="flex items-center gap-2.5 self-start lg:self-center">
                <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1">
                  {[
                    { label: '7 ngày qua', value: 7 },
                    { label: '14 ngày qua', value: 14 },
                    { label: '30 ngày qua', value: 30 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setDaysFilter(preset.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        daysFilter === preset.value
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs p-2.5 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  title="Xuất file báo cáo Excel (.xlsx)"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang xuất...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      <span>Xuất Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3 Thẻ thống kê */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Thẻ 1: Tổng doanh thu */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Tổng Doanh Thu Toàn Diện
                    </span>
                    <span className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">
                      {summary.totalRevenue.toLocaleString('vi-VN')} <span className="text-base font-bold text-slate-400">₫</span>
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Chu kỳ: {summary.days} ngày gần nhất</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Realtime Synced
                  </span>
                </div>
              </div>

              {/* Thẻ 2: Doanh thu nạp giờ */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Tiền Nạp Giờ Chơi (PC Time)
                    </span>
                    <span className="text-2xl font-black text-sky-700 mt-1 font-mono tracking-tight">
                      {summary.totalTopupRevenue.toLocaleString('vi-VN')} <span className="text-base font-bold text-slate-400">₫</span>
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-700">
                    {summary.totalRevenue > 0
                      ? `${((summary.totalTopupRevenue / summary.totalRevenue) * 100).toFixed(1)}%`
                      : '0%'} doanh thu
                  </span>
                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${summary.totalRevenue > 0 ? (summary.totalTopupRevenue / summary.totalRevenue) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Thẻ 3: Doanh thu tiền đồ ăn thức uống */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Dịch Vụ Ăn Uống (F&amp;B)
                    </span>
                    <span className="text-2xl font-black text-amber-700 mt-1 font-mono tracking-tight">
                      {summary.totalServiceRevenue.toLocaleString('vi-VN')} <span className="text-base font-bold text-slate-400">₫</span>
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                    <Utensils className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-700">
                    {summary.totalRevenue > 0
                      ? `${((summary.totalServiceRevenue / summary.totalRevenue) * 100).toFixed(1)}%`
                      : '0%'} doanh thu
                  </span>
                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${summary.totalRevenue > 0 ? (summary.totalServiceRevenue / summary.totalRevenue) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* bố cục 2 cột chính( 8 cột trái -4 cột phải ) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Cột trái (8 Cột): Biểu đồ miền xu hướng + Bảng top member */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* 1. Biểu đồ xu hướng doanh thu*/}
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Biểu Đồ Xu Hướng Doanh Thu</span>
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          ({summary.startDate} ➔ {summary.endDate})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        So sánh tương quan giữa dòng tiền nạp và doanh số bán hàng F&amp;B
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="w-full h-80 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                      <span className="font-mono text-xs">Đang tổng hợp dữ liệu biểu đồ...</span>
                    </div>
                  ) : (
                    <RevenueChart data={chartData} />
                  )}
                </div>

                {/* 2. Bảng xếp hạng khách nạp tiền*/}
                {loading ? (
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center min-h-[220px]">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <TopMembersTable data={analytics.topMembers} />
                )}
              </div>

              {/* Cột phải( 4 cột ): Biểu đồ tròn phương thức thanh toán + top món ăn, đồ uống */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* 1. Donut Chart phương thức thanh toán*/}
                {loading ? (
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center min-h-[340px]">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <PaymentMethodChart data={analytics.paymentMethods} />
                )}

                {/* 2. Bảng top dồ ăn, đồ uống */}
                {loading ? (
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center min-h-[220px]">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <TopSellingItems data={analytics.topItems} />
                )}
              </div>

            </div>

          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
}