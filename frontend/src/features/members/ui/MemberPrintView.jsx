import { USER_STATUS_LABELS, getMemberRankLabel, MEMBER_TIERS } from '../../../shared/constants/userConstants';

export default function MemberPrintView({
  members = [],
  currentUser = null,
  currentAdmin = '',
  reportType = 'detailed', // 'detailed' | 'overview'
  periodLabel = '',
  searchQuery = '',
  tierFilter = 'all',
  statusFilter = 'all'
}) {
  const currentDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const currentTime = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Xác định quyền hạn: Admin hay Nhân viên
  const role = String(currentUser?.role || (currentAdmin === 'Admin' || currentAdmin === 'admin' ? 'ADMIN' : 'ADMIN')).toUpperCase();
  const isAdmin = role === 'ADMIN';

  // Lấy họ và tên thật (Full Name), không lấy username 'admin'
  const extractFullName = () => {
    const candidate = currentUser?.full_name || currentUser?.fullName || currentUser?.name || currentAdmin || '';
    const trimmed = String(candidate).trim();
    if (!trimmed || /^(admin|administrator|quanly|nhanvien)$/i.test(trimmed)) {
      return '';
    }
    return trimmed;
  };
  const printedName = extractFullName();

  // Thống kê tài chính
  const totalRealBalance = members.reduce(
    (sum, m) => sum + Number(m.realBalance || m.balance || 0),
    0
  );
  const totalBonusBalance = members.reduce(
    (sum, m) => sum + Number(m.bonusBalance || 0),
    0
  );
  const totalBalance = totalRealBalance + totalBonusBalance;

  // Thống kê phân loại cho báo cáo Overview
  const activeCount = members.filter((m) => (m.status || '').toUpperCase() === 'ACTIVE').length;
  const lockedCount = members.filter((m) => (m.status || '').toUpperCase() === 'LOCKED').length;
  const bannedCount = members.filter((m) => (m.status || '').toUpperCase() === 'BANNED').length;
  const vipCount = members.filter((m) => m.tier === MEMBER_TIERS.DIAMOND || m.tier === MEMBER_TIERS.GOLD).length;
  const normalCount = members.length - vipCount;

  return (
    <div className="hidden print:block print-document w-full text-slate-900 bg-white font-sans p-1 leading-normal">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          header, nav, aside, footer, [role="dialog"], [aria-modal="true"], .print\\:hidden {
            display: none !important;
          }
          .print-document {
            display: block !important;
            width: 100% !important;
          }
          .print-table {
            border-collapse: collapse;
            width: 100%;
          }
          .print-table thead {
            display: table-header-group;
          }
          .print-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-signatures {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Print Document Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2 mb-2">
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">
            HỆ THỐNG QUẢN LÝ CYBER GAMING & CLOUD ESPORTS
          </h1>
          <p className="text-[10px] text-slate-600">Đơn vị: Trạm máy chủ Cyber Gaming Trung Tâm</p>
          <p className="text-[10px] text-slate-600">Địa chỉ: Khu Công Nghệ Cao, TP. Hồ Chí Minh</p>
        </div>
        <div className="text-right text-[10px] text-slate-600">
          <p className="font-bold text-slate-900">Mẫu biểu: {reportType === 'overview' ? 'BC-HV-02 (Tổng quan)' : 'BC-HV-01 (Chi tiết)'}</p>
          <p>Ngày in: <span className="font-semibold text-slate-900">{currentDate}</span> lúc {currentTime}</p>
          <p>Người in: <span className="font-semibold text-slate-900">{printedName || (isAdmin ? 'Quản trị viên' : 'Nhân viên')}</span></p>
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center my-2">
        <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900 mb-0.5">
          {reportType === 'overview' ? 'BÁO CÁO THỐNG KÊ TỔNG QUAN TÀI KHOẢN HỘI VIÊN' : 'BÁO CÁO DANH SÁCH CHI TIẾT TÀI KHOẢN HỘI VIÊN'}
        </h2>
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-600 font-medium">
          <span>Tổng số bản ghi: <strong className="text-slate-900">{members.length} hội viên</strong></span>
          {periodLabel && (
            <>
              <span>•</span>
              <span>Kỳ báo cáo: <strong className="text-slate-900">{periodLabel}</strong></span>
            </>
          )}
          {reportType === 'detailed' && (
            <>
              <span>•</span>
              <span>Hạng: {tierFilter === 'all' ? 'Tất cả' : tierFilter.toUpperCase()}</span>
              <span>•</span>
              <span>Trạng thái: {statusFilter === 'all' ? 'Toàn bộ' : USER_STATUS_LABELS[statusFilter]?.label || statusFilter}</span>
            </>
          )}
          {searchQuery && (
            <>
              <span>•</span>
              <span>Từ khóa: "{searchQuery}"</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content: Overview vs Detailed */}
      {reportType === 'overview' ? (
        /* Bảng Thống Kê Tổng Quan */
        <div className="mt-3 mb-4">
          <table className="print-table w-full text-[10.5px] text-left border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10px]">
                <th className="py-2 px-3 border-r border-slate-300 text-center w-12">STT</th>
                <th className="py-2 px-3 border-r border-slate-300">Chỉ Số Báo Cáo / Hạng Mục Thống Kê</th>
                <th className="py-2 px-3 border-r border-slate-300 text-right w-44">Giá Trị Thống Kê</th>
                <th className="py-2 px-3 text-center w-36">Đơn Vị / Tỷ Lệ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Phạm vi trích xuất dữ liệu', val: `${members.length} tài khoản`, rate: '100%' },
                { label: 'Hội viên VIP (Kim Cương & Vàng)', val: `${vipCount} tài khoản`, rate: `${((vipCount / (members.length || 1)) * 100).toFixed(1)}%` },
                { label: 'Hội viên Tiêu chuẩn (Bạc & Đồng)', val: `${normalCount} tài khoản`, rate: `${((normalCount / (members.length || 1)) * 100).toFixed(1)}%` },
                { label: 'Tài khoản đang hoạt động (ACTIVE)', val: `${activeCount} tài khoản`, rate: `${((activeCount / (members.length || 1)) * 100).toFixed(1)}%` },
                { label: 'Tài khoản bị tạm khóa (LOCKED)', val: `${lockedCount} tài khoản`, rate: 'Cần can thiệp' },
                { label: 'Tài khoản bị cấm (BANNED)', val: `${bannedCount} tài khoản`, rate: 'Vi phạm' },
                { label: 'Tổng số dư chính (Tiền nạp tiền mặt thực tế)', val: `${totalRealBalance.toLocaleString('vi-VN')} VNĐ`, rate: 'Tiền mặt khả dụng', highlight: true },
                { label: 'Tổng số dư khuyến mãi (Tiền thưởng hệ thống)', val: `${totalBonusBalance.toLocaleString('vi-VN')} VNĐ`, rate: 'Quỹ khuyến mãi', highlight: true },
                { label: 'Tổng số dư toàn bộ tài khoản hội viên', val: `${totalBalance.toLocaleString('vi-VN')} VNĐ`, rate: 'Tổng hạn mức chi tiêu', highlight: true, bold: true }
              ].map((item, idx) => (
                <tr key={idx} className={`border-b border-slate-200 ${item.highlight ? 'bg-slate-50/70 font-semibold' : ''}`}>
                  <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                  <td className={`py-2 px-3 border-r border-slate-200 ${item.bold ? 'font-bold text-slate-900' : ''}`}>{item.label}</td>
                  <td className={`py-2 px-3 border-r border-slate-200 text-right font-mono ${item.bold ? 'font-extrabold text-slate-900 text-[11px]' : ''}`}>{item.val}</td>
                  <td className="py-2 px-3 text-center text-slate-600 font-medium">{item.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Bảng Danh Sách Chi Tiết */
        <div className="mt-2 mb-3">
          <table className="print-table w-full text-[10px] text-left border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[9.5px]">
                <th className="py-1.5 px-1.5 border-r border-slate-300 text-center w-7">STT</th>
                <th className="py-1.5 px-1 border-r border-slate-300 text-center w-12">Mã UID</th>
                <th className="py-1.5 px-2 border-r border-slate-300 w-36">Họ và Tên</th>
                <th className="py-1.5 px-1.5 border-r border-slate-300 w-20">Tên Tài Khoản</th>
                <th className="py-1.5 px-1.5 border-r border-slate-300 text-center">Số ĐT</th>
                <th className="py-1.5 px-1.5 border-r border-slate-300 text-center">Hạng</th>
                <th className="py-1.5 px-2 border-r border-slate-300 text-right whitespace-nowrap">Dư Chính (VNĐ)</th>
                <th className="py-1.5 px-2 border-r border-slate-300 text-right whitespace-nowrap">Dư KM (VNĐ)</th>
                <th className="py-1.5 px-2 border-r border-slate-300 text-right whitespace-nowrap">Tổng Dư (VNĐ)</th>
                <th className="py-1.5 px-1.5 border-r border-slate-300 text-center">Điểm</th>
                <th className="py-1.5 px-1.5 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-4 text-center text-slate-500 italic">
                    Không có dữ liệu hội viên phù hợp với tiêu chí in.
                  </td>
                </tr>
              ) : (
                members.map((m, idx) => {
                  const realBal = Number(m.realBalance || m.balance || 0);
                  const bonusBal = Number(m.bonusBalance || 0);
                  const totalBal = realBal + bonusBal;
                  const sUpper = (m.status || '').toUpperCase();
                  const statusPrint = USER_STATUS_LABELS[sUpper]?.label || m.status || 'Hoạt động';
                  const rankName = getMemberRankLabel(m.tier, m.rankName);

                  return (
                    <tr key={m.id || idx} className="border-b border-slate-200">
                      <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="py-1 px-1 border-r border-slate-200 font-mono font-bold text-center text-[9px] whitespace-nowrap">{m.uid}</td>
                      <td className="py-1 px-2 border-r border-slate-200 font-bold">{m.name}</td>
                      <td className="py-1 px-1.5 border-r border-slate-200 font-mono text-[9px] break-all">{m.username}</td>
                      <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono">{m.phone || '-'}</td>
                      <td className="py-1 px-1.5 border-r border-slate-200 text-center font-semibold">{rankName}</td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono whitespace-nowrap">
                        {realBal.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono whitespace-nowrap text-slate-600">
                        {bonusBal.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold whitespace-nowrap text-slate-900">
                        {totalBal.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono">{m.pts || 0}</td>
                      <td className="py-1 px-1.5 text-center font-semibold">
                        {statusPrint}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {members.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <td colSpan="6" className="py-1.5 px-2 border-r border-slate-300 text-right uppercase text-[9.5px]">
                    Tổng cộng số dư toàn danh sách:
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 text-right font-mono text-[11px] whitespace-nowrap">
                    {totalRealBalance.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 text-right font-mono text-[11px] whitespace-nowrap text-slate-700">
                    {totalBonusBalance.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-300 text-right font-mono text-[11px] whitespace-nowrap text-slate-900">
                    {totalBalance.toLocaleString('vi-VN')}
                  </td>
                  <td colSpan="2" className="py-1.5 px-2 text-slate-500 italic text-[9.5px] text-center">
                    {members.length} hội viên được liệt kê
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Signatures & Footer Note */}
      {isAdmin ? (
        /* Khi Admin là người xuất: Chỉ 1 cụm chữ ký duy nhất căn phải */
        <div className="print-signatures mt-5 pt-1.5 flex justify-end text-center text-xs">
          <div className="w-64">
            <p className="font-bold text-slate-900 mb-0.5 uppercase tracking-wider text-[11px]">
              QUẢN TRỊ VIÊN / NGƯỜI LẬP BẢNG
            </p>
            <p className="text-[10px] text-slate-500 mb-10 italic">(Ký và ghi rõ họ tên)</p>
            {printedName ? (
              <p className="font-bold text-slate-800 text-[11px]">{printedName}</p>
            ) : (
              <p className="font-semibold text-slate-400 tracking-widest text-[11px]">................................................</p>
            )}
          </div>
        </div>
      ) : (
        /* Khi Nhân viên là người xuất: 2 cụm chữ ký để bàn giao và đối soát */
        <div className="print-signatures mt-5 pt-1.5 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="font-bold text-slate-900 mb-0.5 uppercase tracking-wider text-[11px]">
              NGƯỜI LẬP BẢNG
            </p>
            <p className="text-[10px] text-slate-500 mb-10 italic">(Ký và ghi rõ họ tên)</p>
            {printedName ? (
              <p className="font-bold text-slate-800 text-[11px]">{printedName}</p>
            ) : (
              <p className="font-semibold text-slate-400 tracking-widest text-[11px]">................................................</p>
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900 mb-0.5 uppercase tracking-wider text-[11px]">
              XÁC NHẬN CỦA QUẢN TRỊ VIÊN
            </p>
            <p className="text-[10px] text-slate-500 mb-10 italic">(Ký và ghi rõ họ tên)</p>
            <p className="font-semibold text-slate-400 tracking-widest text-[11px]">................................................</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-1.5">
        Báo cáo nội bộ được tạo tự động từ Cyber Management OS • Ngày xuất: {currentDate} {currentTime}
      </div>
    </div>
  );
}
