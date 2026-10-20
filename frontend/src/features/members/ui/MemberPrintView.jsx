import { USER_STATUS_LABELS } from '../../../shared/constants/userConstants';

export default function MemberPrintView({
  members = [],
  currentAdmin = 'Admin',
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

  const totalBalance = members.reduce(
    (sum, m) => sum + Number(m.realBalance || m.balance || 0) + Number(m.bonusBalance || 0),
    0
  );

  return (
    <div className="hidden print:block w-full text-slate-900 bg-white font-sans p-2">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
        }
      `}</style>

      {/* Print Document Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-wider text-slate-900">
            HỆ THỐNG QUẢN LÝ CYBER GAMING & CLOUD ESPORTS
          </h1>
          <p className="text-[11px] text-slate-600">Đơn vị: Trạm máy chủ Cyber Gaming Trung Tâm</p>
          <p className="text-[11px] text-slate-600">Địa chỉ: Khu Công Nghệ Cao, TP. Hồ Chí Minh</p>
        </div>
        <div className="text-right text-[11px] text-slate-600">
          <p className="font-bold text-slate-900">Mẫu biểu: BC-HV-01</p>
          <p>Ngày in: <span className="font-semibold text-slate-900">{currentDate}</span> lúc {currentTime}</p>
          <p>Người in: <span className="font-semibold text-slate-900">{currentAdmin}</span></p>
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center my-4">
        <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900 mb-1">
          BÁO CÁO DANH SÁCH TÀI KHOẢN HỘI VIÊN
        </h2>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-600 font-medium">
          <span>Tổng số bản ghi: <strong className="text-slate-900">{members.length} hội viên</strong></span>
          <span>•</span>
          <span>
            Hạng: {tierFilter === 'all' ? 'Tất cả' : tierFilter.toUpperCase()}
          </span>
          <span>•</span>
          <span>
            Trạng thái: {statusFilter === 'all' ? 'Toàn bộ' : USER_STATUS_LABELS[statusFilter]?.label || statusFilter}
          </span>
          {searchQuery && (
            <>
              <span>•</span>
              <span>Từ khóa tìm kiếm: "{searchQuery}"</span>
            </>
          )}
        </div>
      </div>

      {/* Main Data Table */}
      <div className="mt-4 mb-6">
        <table className="print-table w-full text-[11px] text-left border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase text-[10px]">
              <th className="py-2 px-2 border-r border-slate-300 text-center w-8">STT</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center w-20">Mã UID</th>
              <th className="py-2 px-2 border-r border-slate-300">Họ và Tên</th>
              <th className="py-2 px-2 border-r border-slate-300">Tên Tài Khoản</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center">Số ĐT</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center">Hạng</th>
              <th className="py-2 px-2 border-r border-slate-300 text-right">Số Dư (VNĐ)</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center">Điểm</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center">Trạng Thái</th>
              <th className="py-2 px-2 text-center">Máy Trạm</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-6 text-center text-slate-500 italic">
                  Không có dữ liệu hội viên phù hợp với tiêu chí in.
                </td>
              </tr>
            ) : (
              members.map((m, idx) => {
                const totalBal = Number(m.realBalance || m.balance || 0) + Number(m.bonusBalance || 0);
                const sUpper = (m.status || '').toUpperCase();
                const statusPrint = USER_STATUS_LABELS[sUpper]?.label || m.status || 'Hoạt động';

                return (
                  <tr key={m.id || idx} className="border-b border-slate-200">
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono font-bold text-center text-[10px]">{m.uid}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-bold">{m.name}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[10px]">{m.username}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{m.phone || '-'}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-semibold">{m.rankName || (m.tier === 'diamond' ? 'VIP Kim Cương' : m.tier === 'gold' ? 'VIP Vàng' : 'Đồng')}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold">
                      {totalBal.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">{m.pts || 0}</td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-semibold">
                      {statusPrint}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-[10px]">
                      {m.stationCode || m.station || 'Chưa vào'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {members.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td colSpan="6" className="py-2 px-2 border-r border-slate-300 text-right uppercase text-[10px]">
                  Tổng cộng số dư toàn danh sách:
                </td>
                <td className="py-2 px-2 border-r border-slate-300 text-right font-mono text-xs">
                  {totalBalance.toLocaleString('vi-VN')} đ
                </td>
                <td colSpan="3" className="py-2 px-2 text-slate-500 italic text-[10px]">
                  {members.length} hội viên được liệt kê
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Signatures & Footer Note */}
      <div className="mt-8 pt-4 grid grid-cols-2 text-center text-xs">
        <div>
          <p className="font-bold text-slate-900 mb-1">NGƯỜI LẬP BẢNG</p>
          <p className="text-[10px] text-slate-500 mb-12">(Ký và ghi rõ họ tên)</p>
          <p className="font-bold text-slate-800">{currentAdmin}</p>
        </div>
        <div>
          <p className="font-bold text-slate-900 mb-1">QUẢN LÝ CA TRỰC / THỦ QUỸ</p>
          <p className="text-[10px] text-slate-500 mb-12">(Ký và xác nhận con dấu)</p>
          <p className="font-semibold text-slate-400">................................................</p>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
        Báo cáo nội bộ được tạo tự động từ Cyber Management OS • Ngày xuất: {currentDate} {currentTime}
      </div>
    </div>
  );
}
