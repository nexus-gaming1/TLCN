import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  Layers, 
  ListFilter, 
  Calendar
} from 'lucide-react';
import { exportMemberExcel } from '../utils/exportMemberExcel';

// Khởi tạo mốc thời gian tĩnh ngoài component để tránh re-compute Date liên tục giữa các lần render
const INITIAL_DATE = new Date();
const CURRENT_MONTH_NUM = INITIAL_DATE.getMonth() + 1;
const CURRENT_YEAR_NUM = INITIAL_DATE.getFullYear();

export default function ExportMemberModal({
  isOpen,
  onClose,
  members = [],
  filteredMembers = [],
  onExportPDF
}) {
  const [reportType, setReportType] = useState('detailed'); // 'overview' | 'detailed'
  const [dataScope, setDataScope] = useState('current_filter'); // 'current_filter' | 'all'
  
  // Quản lý lọc Tháng & Năm
  const [dateRangeMode, setDateRangeMode] = useState('all'); // 'all' | 'this_month' | 'this_year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState(String(CURRENT_MONTH_NUM)); // 'all' | '1'..'12'
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR_NUM)); // '2026', '2025',...
  
  const [format, setFormat] = useState('excel'); // 'excel' | 'pdf'
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Quản lý ref dọn dẹp bộ nhớ chống rò rỉ timer khi component unmount
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Lấy danh sách hội viên mục tiêu theo phạm vi và thời gian đã chọn
  const targetMembers = useMemo(() => {
    let target = dataScope === 'all' ? members : filteredMembers;

    // Lọc chuẩn xác theo Tháng & Năm đăng ký (created_at / createdAt)
    if (dateRangeMode !== 'all') {
      let filterMonth = selectedMonth; // 'all' hoặc '1'..'12'
      let filterYear = Number(selectedYear);

      if (dateRangeMode === 'this_month') {
        filterMonth = String(CURRENT_MONTH_NUM);
        filterYear = CURRENT_YEAR_NUM;
      } else if (dateRangeMode === 'this_year') {
        filterMonth = 'all';
        filterYear = CURRENT_YEAR_NUM;
      }

      target = target.filter((m) => {
        const rawDate = m.created_at || m.createdAt;
        // Nếu bản ghi thiếu ngày đăng ký, loại bỏ khỏi kết quả lọc thời gian để tránh sai lệch dữ liệu
        if (!rawDate) return false;

        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;

        const mMonth = d.getMonth() + 1;
        const mYear = d.getFullYear();
        const matchYear = mYear === filterYear;
        const matchMonth = filterMonth === 'all' || mMonth === Number(filterMonth);
        return matchYear && matchMonth;
      });
    }

    return target;
  }, [dataScope, members, filteredMembers, dateRangeMode, selectedMonth, selectedYear]);

  if (!isOpen) return null;

  const currentFilterCount = filteredMembers.length;
  const totalCount = members.length;

  // Thực thi xuất báo cáo theo định dạng người dùng chọn
  const handleExecuteExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      if (format === 'excel') {
        await exportMemberExcel({
          targetMembers,
          reportType,
          dateRangeMode,
          selectedMonth,
          selectedYear
        });
        setIsExporting(false);
        setExportSuccess(true);
        timerRef.current = setTimeout(() => {
          setExportSuccess(false);
          onClose();
        }, 1000);
      } else {
        // Định dạng PDF: Đóng modal và chuyển hướng sang chế độ In chuyên biệt
        setIsExporting(false);
        const periodLabel = dateRangeMode === 'all' 
          ? 'Tất cả thời gian' 
          : selectedMonth === 'all' 
          ? `Cả năm ${selectedYear}` 
          : `Tháng ${selectedMonth}/${selectedYear}`;

        onClose();
        if (typeof onExportPDF === 'function') {
          onExportPDF({
            members: targetMembers,
            reportType,
            periodLabel
          });
        } else {
          window.print();
        }
      }
    } catch (err) {
      console.error('Lỗi khi xuất file báo cáo hội viên:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
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
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                  Tổng số, VIP/Normal, tỉ lệ hoạt động/khóa, tổng tài chính.
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
                  Từng tài khoản, hạng, số dư chính, dư KM, điểm và đăng nhập.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Phạm vi dữ liệu */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
            </div>
          </div>

          {/* Section 3: Thời gian đăng ký (Chọn Tháng & Năm) */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Thời gian đăng ký tài khoản</span>
              </span>
              <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {targetMembers.length} hội viên khớp
              </span>
            </label>

            {/* Quick Filter Pills */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'this_month', label: `Tháng ${CURRENT_MONTH_NUM}` },
                { id: 'this_year', label: `Năm ${CURRENT_YEAR_NUM}` },
                { id: 'custom', label: 'Tùy chọn' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDateRangeMode(item.id);
                    if (item.id === 'this_month') {
                      setSelectedMonth(String(CURRENT_MONTH_NUM));
                      setSelectedYear(String(CURRENT_YEAR_NUM));
                    } else if (item.id === 'this_year') {
                      setSelectedMonth('all');
                      setSelectedYear(String(CURRENT_YEAR_NUM));
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

            {/* Month & Year Selectors */}
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
                  {[CURRENT_YEAR_NUM + 1, CURRENT_YEAR_NUM, CURRENT_YEAR_NUM - 1, CURRENT_YEAR_NUM - 2, CURRENT_YEAR_NUM - 3].map((y) => (
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
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                  <span className="text-[10px] text-slate-500">Chuẩn .xlsx, tự căn cột & số tiền</span>
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
            disabled={isExporting || targetMembers.length === 0}
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
