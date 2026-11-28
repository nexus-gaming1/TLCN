import ExcelJS from 'exceljs';
import { USER_STATUS_LABELS, getMemberRankLabel, MEMBER_TIERS } from '../../../shared/constants/userConstants';

/**
 * Trình trợ giúp xuất file Excel (.xlsx) chuyên nghiệp cho module quản lý hội viên Cyber
 * @param {Object} options
 * @param {Array} options.targetMembers - Danh sách hội viên đã qua bộ lọc
 * @param {string} options.reportType - 'detailed' | 'overview'
 * @param {string} options.dateRangeMode - 'all' | 'this_month' | 'this_year' | 'custom'
 * @param {string} options.selectedMonth - 'all' | '1'..'12'
 * @param {string} options.selectedYear - e.g. '2026'
 */
export async function exportMemberExcel({
  targetMembers = [],
  reportType = 'detailed',
  dateRangeMode = 'all',
  selectedMonth = 'all',
  selectedYear = '2026'
}) {
  const today = new Date().toISOString().slice(0, 10);
  const dateSuffix = dateRangeMode === 'all' 
    ? today 
    : selectedMonth === 'all'
    ? `Nam_${selectedYear}`
    : `T${selectedMonth}_${selectedYear}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cyber Gaming Management OS';
  workbook.lastModifiedBy = 'Nexus Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const periodLabel = dateRangeMode === 'all' 
    ? 'Tất cả thời gian' 
    : selectedMonth === 'all' 
    ? `Cả năm ${selectedYear}` 
    : `Tháng ${selectedMonth}/${selectedYear}`;

  if (reportType === 'detailed') {
    const sheet = workbook.addWorksheet('Danh Sách Hội Viên', {
      views: [{ showGridLines: true }]
    });

    // 1. Tiêu đề lớn
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO DANH SÁCH CHI TIẾT TÀI KHOẢN HỘI VIÊN';
    titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 34;

    // 2. Phụ đề hệ thống
    sheet.mergeCells('A2:M2');
    const subCell = sheet.getCell('A2');
    subCell.value = 'HỆ THỐNG QUẢN LÝ CYBER GAMING & CLOUD ESPORTS • BẢN ĐỐI SOÁT CÔNG NỢ & TÀI CHÍNH NỘI BỘ';
    subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF94A3B8' } }; // Slate 400
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    // 3. Metadata thông tin trích xuất
    sheet.mergeCells('A3:M3');
    const metaCell = sheet.getCell('A3');
    metaCell.value = `Thời gian xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}  |  Kỳ báo cáo: ${periodLabel}  |  Phạm vi trích xuất: ${targetMembers.length} hội viên`;
    metaCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate 100
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 22;

    // 4. Dòng đệm
    sheet.getRow(4).height = 8;

    // 5. Tiêu đề các cột dữ liệu (13 cột, đã loại bỏ cột Máy Đang Chơi)
    const headerRow = sheet.getRow(5);
    headerRow.values = [
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
      'Đăng Nhập Gần Nhất'
    ];
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate 800
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    // 6. Đổ dữ liệu từng dòng
    const startDataRow = 6;
    targetMembers.forEach((m, idx) => {
      const row = sheet.getRow(startDataRow + idx);
      const realBal = Number(m.realBalance || m.balance || 0);
      const bonusBal = Number(m.bonusBalance || 0);
      const totalBal = realBal + bonusBal;
      const pts = Number(m.pts || 0);
      const sUpper = (m.status || '').toUpperCase();
      const statusText = USER_STATUS_LABELS[sUpper]?.label || m.status || 'Chưa rõ';
      const rankName = getMemberRankLabel(m.tier, m.rankName);
      const lastLogin = m.lastLoginTime || 'Chưa đăng nhập';

      row.values = [
        idx + 1,
        m.uid || `#MB-${String(m.id).padStart(3, '0')}`,
        m.name || 'Hội Viên',
        m.username || '',
        m.phone || 'Chưa cập nhật',
        m.email || 'Chưa cập nhật',
        rankName,
        realBal,
        bonusBal,
        totalBal,
        pts,
        statusText,
        lastLogin
      ];
      row.height = 22;

      // Căn lề dữ liệu
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

      // Cột 8, 9, 10: Số tiền - Format #,##0 và căn phải
      [8, 9, 10].forEach((colIdx) => {
        const cell = row.getCell(colIdx);
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      });
      row.getCell(10).font = { name: 'Segoe UI', size: 10, bold: true };

      // Cột 11: Điểm - Format #,##0
      row.getCell(11).numFmt = '#,##0';
      row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };

      // Viền từng ô
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // 7. Dòng tổng cộng cuối bảng (Footer SUM)
    const lastDataRow = startDataRow + targetMembers.length - 1;
    const totalRowIdx = lastDataRow + 1;
    const totalRow = sheet.getRow(totalRowIdx);
    totalRow.height = 26;

    if (targetMembers.length > 0) {
      totalRow.values = [
        '', '', '', '', '', '',
        'TỔNG CỘNG:',
        { formula: `SUM(H${startDataRow}:H${lastDataRow})` },
        { formula: `SUM(I${startDataRow}:I${lastDataRow})` },
        { formula: `SUM(J${startDataRow}:J${lastDataRow})` },
        { formula: `SUM(K${startDataRow}:K${lastDataRow})` },
        '', ''
      ];
      totalRow.getCell(7).font = { name: 'Segoe UI', size: 10, bold: true };
      totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

      [8, 9, 10, 11].forEach((colIdx) => {
        const cell = totalRow.getCell(colIdx);
        cell.numFmt = '#,##0';
        cell.font = { 
          name: 'Segoe UI', 
          size: 10, 
          bold: true, 
          color: { argb: colIdx === 10 ? 'FF0284C7' : 'FF0F172A' } 
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 11 ? 'center' : 'right' };
      });

      totalRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF475569' } }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Slate 50
        };
      });
    }

    // 8. Tự động căn chỉnh độ rộng cột (Auto-fit Column Widths) kết hợp độ rộng tối thiểu
    const minColWidths = [
      8,   // STT
      16,  // Mã UID
      26,  // Tên Hội Viên
      20,  // Tên Tài Khoản
      18,  // Số Điện Thoại
      28,  // Email
      18,  // Hạng Thành Viên
      22,  // Số Dư Chính (VNĐ)
      24,  // Số Dư Khuyến Mãi (VNĐ)
      22,  // Tổng Số Dư (VNĐ)
      16,  // Điểm Tích Lũy
      16,  // Trạng Thái
      24   // Đăng Nhập Gần Nhất
    ];

    sheet.columns.forEach((column, index) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber >= 5) {
          const cellVal = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
          const calcLen = typeof cell.value === 'number' ? cellVal.length + 5 : cellVal.length;
          if (calcLen > maxLen) maxLen = calcLen;
        }
      });
      const minW = minColWidths[index] || 15;
      column.width = Math.max(maxLen + 3, minW);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    triggerFileDownload(buffer, `Bao_Cao_Chi_Tiet_Hoi_Vien_${dateSuffix}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    // Báo cáo tổng quan thống kê
    const sheet = workbook.addWorksheet('Thống Kê Tổng Quan', {
      views: [{ showGridLines: true }]
    });

    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO THỐNG KÊ TỔNG QUAN TÀI KHOẢN HỘI VIÊN';
    titleCell.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:C2');
    const metaCell = sheet.getCell('A2');
    metaCell.value = `Thời gian xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')} | Kỳ báo cáo: ${periodLabel}`;
    metaCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.getRow(3).height = 8;

    const headerRow = sheet.getRow(4);
    headerRow.values = ['Chỉ Số Báo Cáo', 'Giá Trị Thống Kê', 'Đơn Vị / Tỷ Lệ'];
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const activeCount = targetMembers.filter((m) => (m.status || '').toUpperCase() === 'ACTIVE').length;
    const lockedCount = targetMembers.filter((m) => (m.status || '').toUpperCase() === 'LOCKED').length;
    const bannedCount = targetMembers.filter((m) => (m.status || '').toUpperCase() === 'BANNED').length;
    const vipCount = targetMembers.filter((m) => m.tier === MEMBER_TIERS.DIAMOND || m.tier === MEMBER_TIERS.GOLD).length;
    const normalCount = targetMembers.length - vipCount;
    const totalRealBalance = targetMembers.reduce((sum, m) => sum + Number(m.realBalance || m.balance || 0), 0);
    const totalBonusBalance = targetMembers.reduce((sum, m) => sum + Number(m.bonusBalance || 0), 0);
    const totalBalanceAll = totalRealBalance + totalBonusBalance;

    const summaryRows = [
      ['Phạm vi trích xuất', targetMembers.length, 'Tài khoản'],
      ['Hội viên VIP (Kim Cương & Vàng)', vipCount, `${((vipCount / (targetMembers.length || 1)) * 100).toFixed(1)}%`],
      ['Hội viên Tiêu chuẩn (Bạc & Đồng)', normalCount, `${((normalCount / (targetMembers.length || 1)) * 100).toFixed(1)}%`],
      ['Tài khoản đang hoạt động (ACTIVE)', activeCount, `${((activeCount / (targetMembers.length || 1)) * 100).toFixed(1)}%`],
      ['Tài khoản bị tạm khóa (LOCKED)', lockedCount, 'Cần can thiệp quản trị'],
      ['Tài khoản bị cấm (BANNED)', bannedCount, 'Vi phạm điều khoản'],
      ['Tổng số dư chính (Tiền nạp thật)', totalRealBalance, 'VNĐ (#,##0)'],
      ['Tổng số dư khuyến mãi (Tiền thưởng)', totalBonusBalance, 'VNĐ (#,##0)'],
      ['Tổng số dư toàn bộ tài khoản', totalBalanceAll, 'Tổng quỹ khả dụng']
    ];

    summaryRows.forEach((r, idx) => {
      const row = sheet.getRow(5 + idx);
      row.values = r;
      row.height = 22;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

      if (typeof r[1] === 'number') {
        row.getCell(2).numFmt = '#,##0';
      }
      if (idx >= 6) {
        row.getCell(1).font = { bold: true };
        row.getCell(2).font = { bold: true, color: { argb: 'FF0284C7' } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    sheet.getColumn(1).width = 40;
    sheet.getColumn(2).width = 24;
    sheet.getColumn(3).width = 24;

    const buffer = await workbook.xlsx.writeBuffer();
    triggerFileDownload(buffer, `Bao_Cao_Tong_Quan_Hoi_Vien_${dateSuffix}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

/**
 * Trợ giúp tải file nhị phân trong môi trường Client Browser
 */
function triggerFileDownload(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
