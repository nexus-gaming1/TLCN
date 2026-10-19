import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  Layers, 
  ListFilter, 
  Calendar
} from 'lucide-react';
import { USER_STATUS_LABELS } from '../../../shared/constants/userConstants';

export default function ExportMemberModal({
  isOpen,
  onClose,
  members = [],
  filteredMembers = [],
  selectedIds = []
}) {
  const currentDate = new Date();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentYearNum = currentDate.getFullYear();

  const [reportType, setReportType] = useState('detailed'); // 'overview' | 'detailed'
  const [dataScope, setDataScope] = useState('current_filter'); // 'current_filter' | 'all' | 'selected'
  
  // Quản lý lọc Tháng & Năm
  const [dateRangeMode, setDateRangeMode] = useState('all'); // 'all' | 'this_month' | 'this_year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonthNum)); // 'all' | '1'..'12'
  const [selectedYear, setSelectedYear] = useState(String(currentYearNum)); // '2026', '2025',...
  
  const [format, setFormat] = useState('excel'); // 'excel' | 'pdf'
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Helper ép kiểu text thuần túy cho Excel để không bị auto-format thành Date serial khiến cột bị tràn thành '####'
  const formatExcelText = (value) => {
    if (value === null || value === undefined || value === '') return '""';
    const str = String(value).replace(/"/g, '""');
    return `="${str}"`;
  };

  // Lấy danh sách hội viên mục tiêu theo phạm vi và thời gian đã chọn
  const targetMembers = useMemo(() => {
    let target = [];
    if (dataScope === 'selected') {
      target = members.filter((m) => selectedIds.includes(m.id));
    } else if (dataScope === 'all') {
      target = members;
    } else {
      target = filteredMembers;
    }

    // Lọc theo Tháng & Năm
    if (dateRangeMode !== 'all') {
      let filterMonth = selectedMonth; // 'all' hoặc '1'..'12'
      let filterYear = Number(selectedYear);

      if (dateRangeMode === 'this_month') {
        filterMonth = String(currentMonthNum);
        filterYear = currentYearNum;
      } else if (dateRangeMode === 'this_year') {
        filterMonth = 'all';
        filterYear = currentYearNum;
      }

      target = target.filter((m) => {
        // Trích xuất ngày tạo / đăng ký hội viên
        const rawDate = m.created_at || m.createdAt;
        let d = null;
        if (rawDate) {
          d = new Date(rawDate);
        } else if (m.lastLoginTime && m.lastLoginTime.includes('/')) {
          // Fallback nếu không có created_at nhưng có ngày trong lastLoginTime (DD/MM/YYYY)
          const parts = m.lastLoginTime.replace(/[^0-9]/g, ' ').trim().split(/\s+/);
          if (parts.length >= 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              d = new Date(year, month, day);
            }
          }
        }

        if (d && !isNaN(d.getTime())) {
          const mMonth = d.getMonth() + 1;
          const mYear = d.getFullYear();
          const matchYear = mYear === filterYear;
          const matchMonth = filterMonth === 'all' || mMonth === Number(filterMonth);
          return matchYear && matchMonth;
        }

        // Nếu bản ghi chưa có trường ngày cụ thể, mặc định cho thuộc năm hiện tại
        return filterYear === currentYearNum;
      });
    }

    return target;
  }, [dataScope, members, filteredMembers, selectedIds, dateRangeMode, selectedMonth, selectedYear, currentMonthNum, currentYearNum]);

  if (!isOpen) return null;

  const selectedCount = selectedIds.length;
  const currentFilterCount = filteredMembers.length;
  const totalCount = members.length;

  // Xuất file CSV UTF-8 BOM mở bằng Excel
  const exportExcelCSV = () => {
    const today = new Date().toISOString().slice(0, 10);
    const dateSuffix = dateRangeMode === 'all' 
      ? today 
      : selectedMonth === 'all'
      ? `Nam_${selectedYear}`
      : `T${selectedMonth}_${selectedYear}`;

    if (reportType === 'detailed') {
      const headers = [
        'STT',
        'Mã UID',
        'Tên Hội Viên',
        'Tên Tài Khoản',
        'Số Điện Thoại',
        'Email',
        'Hạng Thành Viên',
        'Số Dư Chính (VNĐ)',
        'Số Dư Khuyến Mãi (VNĐ)',
        'Tổng Số Dư (VNĐ)',
        'Điểm Tích Lũy',
        'Trạng Thái',
        'Máy Đang Ngồi',
        'Đăng Nhập Gần Nhất'
      ];

      const rows = targetMembers.map((m, index) => {
        const sUpper = (m.status || '').toUpperCase();
        const statusText = USER_STATUS_LABELS[sUpper]?.label || m.status || 'Chưa rõ';

        return [
          index + 1,
          formatExcelText(m.uid || ''),
          `"${(m.name || '').replace(/"/g, '""')}"`,
          `"${(m.username || '').replace(/"/g, '""')}"`,
          formatExcelText(m.phone || 'Chưa cập nhật'),
          `"${m.email || 'Chưa cập nhật'}"`,
          `"${m.rankName || (m.tier === 'diamond' ? 'Kim Cương' : m.tier === 'gold' ? 'Vàng' : 'Đồng')}"`,
          m.realBalance || m.balance || 0,
          m.bonusBalance || 0,
          (m.realBalance || m.balance || 0) + (m.bonusBalance || 0),
          m.pts || 0,
          `"${statusText}"`,
          `"${m.stationCode || m.station || 'Chưa vào máy'}"`,
          // Sử dụng formatExcelText ép kiểu chuỗi text, tránh hoàn toàn lỗi #### trong Excel
          formatExcelText(m.lastLoginTime || 'Chưa có')
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      downloadFile(csvContent, `Bao_Cao_Chi_Tiet_Hoi_Vien_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
    } else {
      // Báo cáo tổng quan thống kê - hoàn toàn tính toán từ targetMembers, không hardcode
      const activeCount = targetMembers.filter((m) => (m.status || '').toUpperCase() === 'ACTIVE').length;
      const lockedCount = targetMembers.filter((m) => (m.status || '').toUpperCase() === 'LOCKED').length;
      const bannedCount = targetMembers.filter((m) => (m.status || '').toUpperCase() === 'BANNED').length;
      const vipCount = targetMembers.filter((m) => m.tier === 'diamond' || m.tier === 'gold').length;
      const normalCount = targetMembers.length - vipCount;
      const totalBalanceAll = targetMembers.reduce((sum, m) => sum + (Number(m.realBalance || m.balance || 0)), 0);

      const summaryHeaders = ['Chỉ Số Báo Cáo', 'Giá Trị Thống Kê', 'Đơn Vị / Ghi Chú'];
      const summaryRows = [
        ['Phạm vi trích xuất', `${targetMembers.length} tài khoản`, `Kỳ: ${dateRangeMode === 'all' ? 'Tất cả thời gian' : selectedMonth === 'all' ? `Năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`}`],
        ['Tổng số lượng hội viên trong kỳ', targetMembers.length, 'Tài khoản'],
        ['Hội viên VIP (Diamond & Gold)', vipCount, `${((vipCount / (targetMembers.length || 1)) * 100).toFixed(1)}%`],
        ['Hội viên Normal (Tiêu chuẩn)', normalCount, `${((normalCount / (targetMembers.length || 1)) * 100).toFixed(1)}%`],
        ['Tài khoản đang hoạt động (ACTIVE)', activeCount, `${((activeCount / (targetMembers.length || 1)) * 100).toFixed(1)}%`],
        ['Tài khoản bị tạm khóa (LOCKED)', lockedCount, 'Cần can thiệp quản trị'],
        ['Tài khoản bị cấm (BANNED)', bannedCount, 'Vi phạm điều khoản'],
        ['Tổng số dư tài khoản hội viên', totalBalanceAll.toLocaleString('vi-VN') + ' đ', 'Tổng quỹ nạp khả dụng']
      ];

      const csvContent = '\uFEFF' + [
        'BÁO CÁO THỐNG KÊ TỔNG QUAN TÀI KHOẢN HỘI VIÊN CYBER GAMING',
        `Thời gian xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`,
        `Kỳ báo cáo: ${dateRangeMode === 'all' ? 'Tất cả thời gian' : selectedMonth === 'all' ? `Cả năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`}`,
        '',
        summaryHeaders.join(','),
        ...summaryRows.map((r) => r.map((c) => `"${c}"`).join(','))
      ].join('\r\n');

      downloadFile(csvContent, `Bao_Cao_Tong_Quan_Hoi_Vien_${dateSuffix}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit xuất báo cáo
  const handleExecuteExport = () => {
    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      if (format === 'excel') {
        exportExcelCSV();
        setIsExporting(false);
        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
          onClose();
        }, 1200);
      } else {
        // Định dạng PDF: Đóng modal và mở hộp thoại Print của trình duyệt (Save as PDF)
        setIsExporting(false);
        onClose();
        setTimeout(() => {
          window.print();
        }, 200);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Xuất dữ liệu hội viên</h3>
              <p className="text-xs text-slate-500 font-medium">
                Chọn loại dữ liệu và định dạng file muốn xuất.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="py-4 space-y-4">
          
          {/* Section 1: Loại báo cáo */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Loại báo cáo</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setReportType('overview')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reportType === 'overview'
                    ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">Thống kê tổng quan</span>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'overview'}
                    onChange={() => setReportType('overview')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tổng số, VIP/Normal, tỉ lệ hoạt động/khóa, hội viên mới.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('detailed')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  reportType === 'detailed'
                    ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">Danh sách chi tiết</span>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'detailed'}
                    onChange={() => setReportType('detailed')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Thông tin từng hội viên, hạng, số dư, điểm và trạng thái.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Phạm vi dữ liệu */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-sky-600" />
              <span>Phạm vi dữ liệu</span>
            </label>
            <div className="space-y-2">
              <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                dataScope === 'current_filter' ? 'border-sky-500 bg-sky-50/50' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="dataScope"
                    value="current_filter"
                    checked={dataScope === 'current_filter'}
                    onChange={() => setDataScope('current_filter')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Theo bộ lọc hiện tại</span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  {currentFilterCount} hội viên
                </span>
              </label>

              <label className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                dataScope === 'all' ? 'border-sky-500 bg-sky-50/50' : 'border-slate-200 hover:bg-slate-50'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="dataScope"
                    value="all"
                    checked={dataScope === 'all'}
                    onChange={() => setDataScope('all')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Toàn bộ hội viên</span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  {totalCount} hội viên
                </span>
              </label>

              <label className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                selectedCount === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' :
                dataScope === 'selected' ? 'border-sky-500 bg-sky-50/50 cursor-pointer' : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="dataScope"
                    value="selected"
                    disabled={selectedCount === 0}
                    checked={dataScope === 'selected'}
                    onChange={() => setDataScope('selected')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-slate-800">Chỉ các hội viên đã chọn</span>
                </div>
                <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                  selectedCount > 0 ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {selectedCount} đã chọn
                </span>
              </label>
            </div>
          </div>

          {/* Section 3: Thời gian đăng ký (Chọn Tháng & Năm) */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Thời gian đăng ký</span>
              </span>
              <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {targetMembers.length} hội viên khớp
              </span>
            </label>

            {/* Quick Pills */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'this_month', label: `Tháng ${currentMonthNum}` },
                { id: 'this_year', label: `Năm ${currentYearNum}` },
                { id: 'custom', label: 'Tùy chọn' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDateRangeMode(item.id);
                    if (item.id === 'this_month') {
                      setSelectedMonth(String(currentMonthNum));
                      setSelectedYear(String(currentYearNum));
                    } else if (item.id === 'this_year') {
                      setSelectedMonth('all');
                      setSelectedYear(String(currentYearNum));
                    }
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition ${
                    dateRangeMode === item.id
                      ? 'border-sky-500 bg-sky-500 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Month & Year Selectors (Hiển thị khi cần chọn chi tiết hoặc chuyển tab Tùy chọn) */}
            <div className={`grid grid-cols-2 gap-2.5 p-2.5 rounded-xl border ${
              dateRangeMode === 'all' ? 'bg-slate-50/50 border-slate-200 opacity-60' : 'bg-sky-50/40 border-sky-200'
            }`}>
              {/* Chọn Tháng */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Chọn Tháng
                </label>
                <select
                  disabled={dateRangeMode === 'all'}
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setDateRangeMode('custom');
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="all">Tất cả các tháng (Cả năm)</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      Tháng {m < 10 ? `0${m}` : m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Năm */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Chọn Năm
                </label>
                <select
                  disabled={dateRangeMode === 'all'}
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setDateRangeMode('custom');
                  }}
                  className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {[currentYearNum + 1, currentYearNum, currentYearNum - 1, currentYearNum - 2, currentYearNum - 3].map((y) => (
                    <option key={y} value={String(y)}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Định dạng file */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
              <span>Định dạng file</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Excel (.xlsx)</span>
                  <span className="text-[10px] text-slate-500">Mở với MS Excel UTF-8</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                  format === 'pdf'
                    ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 block">PDF (.pdf)</span>
                  <span className="text-[10px] text-slate-500">Bản in / Lưu PDF chuẩn A4</span>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || (dataScope === 'selected' && selectedCount === 0) || targetMembers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang trích xuất dữ liệu...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Xuất file thành công!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Xuất {targetMembers.length} hội viên</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
