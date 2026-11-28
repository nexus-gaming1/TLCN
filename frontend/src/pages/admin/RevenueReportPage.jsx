import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

import reportService from '../../shared/api/report.service';
import RevenueChart from '../../features/reports/ui/RevenueChart';
import PaymentMethodChart from '../../features/reports/ui/PaymentMethodChart';
import TopMembersTable from '../../features/reports/ui/TopMembersTable';
import TopSellingItems from '../../features/reports/ui/TopSellingItems';
import ViewAllFeedbacksModal from '../../features/reports/ui/ViewAllFeedbacksModal';
import supportService from '../../shared/api/support.service';

import {
  Gamepad2,Utensils,RefreshCw,
  Loader2,TrendingUp,Download,Star, 
  MessageSquare,RotateCcw, ShieldCheck, BellRing, Calendar
} from 'lucide-react';


// Chuyển đối tượng Date sang chuỗi YYYY-MM-DD theo giờ địa phương (không dùng toISOString vì bị lệch UTC)
const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};


// Tính cặp { startDate, endDate } cho 5 nút chọn nhanh
const getPresetRange = (presetId) => {
  const today = new Date();
  const endDate = toLocalDateStr(today);

  if (presetId === 'today') {
    return { startDate: endDate, endDate };
  }
  if (presetId === 'this_week') {
    // getDay(): 0 = Chủ Nhật, 1 = Thứ 2 ... 6 = Thứ 7 -> quy về số ngày cần lùi về Thứ 2
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    return { startDate: toLocalDateStr(monday), endDate };
  }
  if (presetId === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toLocalDateStr(firstDay), endDate };
  }
  if (presetId === '30d') {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { startDate: toLocalDateStr(start), endDate };
  }
  // Mặc định 7 ngày gần nhất tính cả hôm nay (lùi 6 ngày)
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return { startDate: toLocalDateStr(start), endDate };
};

const DATE_PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'this_week', label: 'Tuần này' },
  { id: 'this_month', label: 'Tháng này' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
];


export default function RevenueReportPage({ user, onLogout }) {
  const navigate = useNavigate();
  
  const initialRange = getPresetRange('7d');
  const [activePreset, setActivePreset] = useState('7d'); // 'today' | 'this_week' | 'this_month' | '7d' | '30d' | 'custom'
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [filterError, setFilterError] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Thêm cờ để kích hoạt nút Refresh
  const [isExporting, setIsExporting] = useState(false);

  //State lưu thống kê CSAT và danh sách Feedback
  const [csatStats, setCsatStats] = useState({ averageRating: '0.0', totalReviews: 0 });
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [isAllFeedbacksModalOpen, setIsAllFeedbacksModalOpen] = useState(false);


    const handleSelectPreset = (presetId) => {
    const range = getPresetRange(presetId);
    setFilterError('');
    setActivePreset(presetId);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  // Hàm tải dữ liệu báo cáo từ Backend API (fix lỗi Race Condition)
  useEffect(() => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      setFilterError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    let ignore = false;
    setFilterError('');

    const fetchReportData = async () => {
      setLoading(true);
      try {
        const data = await reportService.getRevenueReport({ startDate, endDate });
        if (!ignore) {
          setReportData(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Lỗi khi nạp dữ liệu báo cáo doanh thu:', err);
          setFilterError(err.response?.data?.message || err.message || 'Không thể tải báo cáo thống kê.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchReportData();
    return () => {
      ignore = true;
    };
  }, [startDate, endDate, refreshKey]); // Thêm refreshKey để kích hoạt reload khi bấm nút Refresh

  // Hàm gắn vào nút Làm mới
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  const summary = reportData?.summary || {
    totalRevenue: 0,
    totalTopupRevenue: 0,
    totalServiceRevenue: 0,
    totalRefundAmount: 0,
    refundCount: 0,
    netRevenue: 0,
    pendingSupportRequests: 0,
    days: 0,
    startDate,
    endDate
  };

  const chartData = reportData?.chartData || [];
  const analytics = reportData?.analytics || {
    paymentMethods: [],
    topItems: [],
    allItems: [],
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

  useEffect(() => {
    const fetchCsatData = async () => {
      try {
        const [stats, feedbackList, allFbList] = await Promise.all([
          supportService.getStats(),
          supportService.getStaffRequests({ type: 'FEEDBACK', limit: 5 }),
          supportService.getStaffRequests({ type: 'FEEDBACK', limit: 100 }),
        ]);
        setCsatStats(stats || { averageRating: '0.0', totalReviews: 0 });
        setRecentFeedbacks(feedbackList?.rows || []);
        setAllFeedbacks(allFbList?.rows || []);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu CSAT:', err);
      }
    };
    fetchCsatData();
  }, [refreshKey]);

  
  const handleExportExcel = async () => {
    if (isExporting) return;
    if (!startDate || !endDate || startDate > endDate) {
      setFilterError('Khoảng ngày không hợp lệ. Vui lòng kiểm tra lại trước khi xuất Excel.');
      return;
    }

    setIsExporting(true);
    setFilterError('');

    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      const { blob, filename } = await reportService.exportRevenueExcel(
        { startDate, endDate },
        controller.signal
      );

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
        setFilterError(err.message || 'Có lỗi xảy ra khi xuất file báo cáo Excel');
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
            
          {/* Tiêu đề và Thanh lọc kỳ báo cáo */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Báo Cáo &amp; Thống Kê
                </h1>

                {/* Nút Làm mới + Xuất Excel (Mở cho cả Admin và Staff) */}
                <div className="flex items-center gap-2 self-start sm:self-center">
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
                    disabled={isExporting || Boolean(filterError)}
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

              {/* Dải nút chọn nhanh + 2 ô Từ ngày - Đến ngày (Light Theme) */}
              <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activePreset === preset.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-500">Từ</span>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => {
                        setActivePreset('custom');
                        setStartDate(e.target.value);
                      }}
                      className="bg-transparent font-mono text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                  <span className="text-slate-400 font-bold">➔</span>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-500">Đến</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      max={toLocalDateStr(new Date())}
                      onChange={(e) => {
                        setActivePreset('custom');
                        setEndDate(e.target.value);
                      }}
                      className="bg-transparent font-mono text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {filterError && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {filterError}
                </div>
              )}
            </div>

            {/* 3 Thẻ thống kê */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
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
                 <span>
                    Kỳ: {summary.startDate || startDate} ➔ {summary.endDate || endDate} ({summary.days} ngày)
                  </span>
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

              {/* Thẻ 4: Chỉ số hài lòng CSAT */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Điểm Hài Lòng (CSAT Score)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-amber-500 font-mono tracking-tight">
                        {csatStats.averageRating}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/ 5.0 ⭐</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center font-bold">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Dựa trên {csatStats.totalReviews} lượt đánh giá</span>
                </div>
              </div>

            </div>

            {/* Dải tóm tắt Dòng tiền thực thu và Vận hành sự cố */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Doanh Thu Sau Hoàn Tiền</p>
                    <p className="text-sm font-black font-mono text-emerald-700">
                      {(summary.netRevenue ?? Math.max(0, summary.totalRevenue - (summary.totalRefundAmount || 0))).toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Hoàn Tiền Sự Cố Kỳ Này</p>
                    <p className="text-sm font-black font-mono text-rose-600">
                      -{(summary.totalRefundAmount || 0).toLocaleString('vi-VN')} ₫{' '}
                      <span className="text-[11px] font-sans font-semibold text-slate-400">
                        ({summary.refundCount || 0} lượt)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Phiếu Hỗ Trợ Đang Chờ</p>
                    <p className="text-sm font-black font-mono text-amber-700">
                      {summary.pendingSupportRequests ?? csatStats.pendingRequests ?? 0}{' '}
                      <span className="text-[11px] font-sans font-semibold text-slate-400">phiếu mở</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/staff?tab=TICKETS')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-xs border border-amber-200 transition-all cursor-pointer shrink-0 shadow-2xs"
                  title="Đi tới danh sách Hỗ Trợ / Khiếu Nại đang chờ xử lý"
                >
                  Xem chi tiết ➔
                </button>
              </div>
            </div>

            {/* Hàng 1: Biểu Đồ Xu Hướng Doanh Thu toàn chiều rộng */}
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

            {/* Hàng 2: 3 cột cân đối (Phương thức thanh toán | Top Hội Viên | Top Món F&B) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="flex flex-col">
                {loading ? (
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center flex-1 min-h-[280px]">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <PaymentMethodChart data={analytics.paymentMethods} />
                )}
              </div>
              <div className="flex flex-col">
                {loading ? (
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center flex-1 min-h-[280px]">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <TopMembersTable
                    data={analytics.topMembers}
                    allMembers={analytics.allMembers || analytics.topMembers}
                  />
                )}
              </div>
              <div className="flex flex-col">
                {loading ? (
                  <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-center flex-1 min-h-[280px]">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : (
                  <TopSellingItems
                    data={analytics.topItems}
                    allItems={analytics.allItems || analytics.topItems}
                  />
                )}
              </div>
            </div>

            {/* Hàng 3: Khối đánh giá khách hàng toàn chiều rộng (không khoảng trắng trống) */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    Ý Kiến &amp; Đánh Giá Mới Nhất Từ Khách Hàng
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">5 đánh giá gần nhất</span>
                  <button
                    type="button"
                    onClick={() => setIsAllFeedbacksModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-extrabold text-xs border border-cyan-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Xem danh sách toàn bộ đánh giá của khách hàng"
                  >
                    <span>Xem tất cả ({csatStats.totalReviews || allFeedbacks.length}) ➔</span>
                  </button>
                </div>
              </div>
              {recentFeedbacks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Chưa có đánh giá nào từ khách hàng.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentFeedbacks.map((fb) => (
                    <div key={fb.request_id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800">
                            @{fb.member?.userInfo?.username || 'khach'}
                          </span>
                          <span className="text-[11px] text-amber-500 font-black">
                            {'⭐'.repeat(fb.rating || 5)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(fb.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        {fb.description && (
                          <p className="text-xs text-slate-600 italic font-medium">
                            "{fb.description}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Modal Xem Toàn Bộ Đánh Giá */}
          <ViewAllFeedbacksModal
            isOpen={isAllFeedbacksModalOpen}
            onClose={() => setIsAllFeedbacksModalOpen(false)}
            feedbacks={allFeedbacks}
          />

          {/* Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
}