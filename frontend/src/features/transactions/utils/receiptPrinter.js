/**
 * ReceiptPrinter Utility
 * In phiếu thu / hoá đơn giao dịch chuẩn máy in POS (K80 / A5)
 * Tuân thủ các nguyên tắc:
 * 1. SRP: Tách bạch giữa định dạng dữ liệu, xây dựng template HTML, và thao tác DOM iFrame.
 * 2. OCP: Cấu hình cửa hàng (Tên, địa chỉ, wifi, danh mục) truyền qua config object, không hardcode.
 * 3. Security: Chống XSS bằng escapeHtml cho toàn bộ dữ liệu người dùng/ghi chú.
 * 4. Reliable Async: Dọn dẹp iFrame bằng sự kiện onafterprint thay vì setTimeout cố định ngắn hạn.
 */

/**
 * Cấu hình mặc định cho phiếu in (Tuân thủ OCP - Cho phép ghi đè từ bên ngoài)
 */
export const DEFAULT_RECEIPT_CONFIG = Object.freeze({
  storeName: 'NEXUS CYBER GAMING',
  systemName: 'Hệ Thống Quản Lý Phòng Máy NEXUS Cloud OS',
  address: '123 Đường Công Nghệ, Quận 1, TP. Hồ Chí Minh',
  hotline: '1900 8888',
  wifiName: 'NEXUS_VIP',
  wifiPassword: 'Pass: 88888888',
  policyNotice: 'Phiếu thu có giá trị đối soát trong vòng 24 giờ.',
  thankYouMessage: 'Cảm ơn quý khách đã đồng hành cùng NEXUS! Chúc bạn leo rank vui vẻ.',
  categories: Object.freeze({
    MEMBER_TOPUP: 'Nạp tiền giờ chơi tài khoản',
    SERVICE_SALE: 'Dịch vụ F&B / Ẩm thực ăn uống',
    COMBO_PURCHASE: 'Gói Combo đêm / Khuyến mãi',
    EXPENSE: 'Chi phí phát sinh phòng máy'
  })
});

/**
 * Hàm làm sạch chuỗi (Sanitize) chống lỗ hổng bảo mật XSS
 * @param {any} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Chuyển đổi số tiền thành chữ tiếng Việt (Helper 1 - SRP)
 * @param {number} num 
 * @returns {string}
 */
export function numberToWordsVietnamese(num) {
  if (isNaN(num) || num <= 0) return 'Không đồng';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n, full) {
    let hundred = Math.floor(n / 100);
    let remainder = n % 100;
    let ten = Math.floor(remainder / 10);
    let unit = remainder % 10;
    let res = '';

    if (hundred > 0 || full) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt ';
      else if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm ';
      else if (unit > 0) res += digits[unit] + ' ';
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || full) res += 'lẻ ';
      res += digits[unit] + ' ';
    }

    return res.trim();
  }

  let strNum = Math.floor(num).toString();
  const groups = [];
  while (strNum.length > 0) {
    groups.unshift(parseInt(strNum.slice(-3), 10));
    strNum = strNum.slice(0, -3);
  }

  const words = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const unitIdx = groups.length - 1 - i;
    if (g > 0) {
      const gText = readThreeDigits(g, i > 0);
      const unitText = units[unitIdx];
      words.push(gText + (unitText ? ' ' + unitText : ''));
    }
  }

  let result = words.join(' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.';
  return result;
}

/**
 * Chuẩn hóa và làm sạch dữ liệu giao dịch trước khi đưa vào template (Helper 2 - SRP & Security)
 * @param {Object} txn 
 * @param {Object} config 
 * @returns {Object}
 */
export function formatReceiptData(txn = {}, config = DEFAULT_RECEIPT_CONFIG) {
  const amount = parseFloat(txn.amount || 0);
  const rawDate = txn.createdAt || txn.created_at || Date.now();
  const d = new Date(rawDate);
  const categoryMap = { ...DEFAULT_RECEIPT_CONFIG.categories, ...(config.categories || {}) };

  const rawTxnCode = txn.txnCode || txn.txn_code || `TXN-${String(txn.id || txn.transaction_id || 1).padStart(5, '0')}`;
  const rawMemberName = txn.memberName || txn.member_name || txn.customer_name || 'Khách Vãng Lai';
  const rawUsername = txn.username || '—';
  const rawPhone = txn.phone || txn.member_phone || '—';
  const rawRankName = txn.rankName || txn.rank_name || 'Hội Viên';
  const rawComputerName = txn.computerName || txn.computer_name || 'Quầy Thu Ngân POS';
  const rawStaffName = txn.staffName || txn.staff_name || 'Thu Ngân Quầy';
  const rawPaymentMethod = (txn.paymentMethod || txn.payment_method || 'CASH').toUpperCase();
  const rawNotes = txn.notes || txn.description || '';
  const rawStatus = (txn.status || 'COMPLETED').toUpperCase();

  return {
    txnCode: escapeHtml(rawTxnCode),
    amount,
    formattedAmount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount),
    amountWords: escapeHtml(numberToWordsVietnamese(amount)),
    formattedDate: d.toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    }),
    memberName: escapeHtml(rawMemberName),
    username: escapeHtml(rawUsername),
    phone: escapeHtml(rawPhone),
    rankName: escapeHtml(rawRankName),
    computerName: escapeHtml(rawComputerName),
    staffName: escapeHtml(rawStaffName),
    paymentMethod: escapeHtml(rawPaymentMethod),
    notes: escapeHtml(rawNotes),
    status: escapeHtml(rawStatus === 'COMPLETED' ? 'Đã Thanh Toán (Thành công)' : rawStatus),
    categoryName: escapeHtml(categoryMap[txn.category] || txn.category || 'Giao dịch tài chính')
  };
}

/**
 * Xây dựng chuỗi HTML hóa đơn chuẩn K80 (Helper 3 - SRP)
 * @param {Object} data - Dữ liệu đã được format và escape
 * @param {Object} config - Cấu hình cửa hàng
 * @returns {string}
 */
export function buildReceiptTemplate(data, config = DEFAULT_RECEIPT_CONFIG) {
  const store = { ...DEFAULT_RECEIPT_CONFIG, ...config };

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Phiếu Thu - ${data.txnCode}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 3mm 4mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body {
          width: 76mm;
          margin: 0 auto;
          padding: 6px 0;
          color: #000;
          background: #fff;
          font-size: 11px;
          line-height: 1.35;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .brand {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sub-brand {
          font-size: 9.5px;
          color: #333;
          margin-top: 2px;
        }
        .title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 8px 0 4px 0;
          text-align: center;
        }
        .subtitle {
          font-size: 9px;
          font-style: italic;
          text-align: center;
          margin-bottom: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 10.5px;
        }
        .info-label {
          color: #333;
        }
        .info-value {
          font-weight: 600;
          text-align: right;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .double-divider {
          border-top: 2px solid #000;
          margin: 8px 0;
        }
        .total-box {
          text-align: center;
          padding: 6px 0;
        }
        .total-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .total-amount {
          font-size: 18px;
          font-weight: 900;
          margin-top: 2px;
        }
        .in-words {
          font-size: 9.5px;
          font-style: italic;
          text-align: center;
          margin-top: 3px;
        }
        .footer {
          margin-top: 12px;
          text-align: center;
          font-size: 9px;
          line-height: 1.4;
        }
        .signature-box {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding: 0 8px;
          font-size: 10px;
          text-align: center;
        }
        .sign-title {
          font-weight: 600;
        }
        .sign-space {
          height: 36px;
        }
        @media print {
          body {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">${escapeHtml(store.storeName)}</div>
        <div class="sub-brand">${escapeHtml(store.systemName)}</div>
        <div class="sub-brand">Đ/C: ${escapeHtml(store.address)}</div>
        <div class="sub-brand">Hotline: ${escapeHtml(store.hotline)} | Wifi: ${escapeHtml(store.wifiName)} (${escapeHtml(store.wifiPassword)})</div>
      </div>

      <div class="title">PHIẾU THU TIỀN</div>
      <div class="subtitle">(Mã GD: ${data.txnCode})</div>

      <div class="info-row">
        <span class="info-label">Thời gian:</span>
        <span class="info-value">${data.formattedDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Thu ngân:</span>
        <span class="info-value">${data.staffName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Trạm máy / Vị trí:</span>
        <span class="info-value">${data.computerName}</span>
      </div>

      <div class="divider"></div>

      <div class="info-row">
        <span class="info-label">Khách hàng:</span>
        <span class="info-value">${data.memberName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tài khoản:</span>
        <span class="info-value">${data.username}</span>
      </div>
      <div class="info-row">
        <span class="info-label">SĐT / Hạng thẻ:</span>
        <span class="info-value">${data.phone} (${data.rankName})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Khoản mục:</span>
        <span class="info-value">${data.categoryName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hình thức TT:</span>
        <span class="info-value">${data.paymentMethod}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Trạng thái:</span>
        <span class="info-value">${data.status}</span>
      </div>
      ${data.notes ? `
      <div class="info-row">
        <span class="info-label">Ghi chú:</span>
        <span class="info-value">${data.notes}</span>
      </div>` : ''}

      <div class="double-divider"></div>

      <div class="total-box">
        <div class="total-label">TỔNG TIỀN THANH TOÁN</div>
        <div class="total-amount">${data.formattedAmount}</div>
        <div class="in-words">Bằng chữ: ${data.amountWords}</div>
      </div>

      <div class="signature-box">
        <div>
          <div class="sign-title">Khách hàng</div>
          <div class="sign-space"></div>
          <div>${data.memberName}</div>
        </div>
        <div>
          <div class="sign-title">Thu ngân</div>
          <div class="sign-space"></div>
          <div>${data.staffName}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="footer">
        <div>${escapeHtml(store.thankYouMessage)}</div>
        <div>(${escapeHtml(store.policyNotice)})</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Thao tác DOM nạp iFrame ẩn và kích hoạt in, dọn dẹp bằng onafterprint (Helper 4 - SRP & Race Condition Prevention)
 * @param {string} htmlContent 
 */
export function printViaIframe(htmlContent) {
  const iframeId = '__nexus_receipt_iframe__';
  const existingIframe = document.getElementById(iframeId);
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const win = iframe.contentWindow;

  // Dọn dẹp iFrame an toàn khi đóng hộp thoại in
  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  // Sử dụng sự kiện onafterprint chuẩn của trình duyệt
  win.onafterprint = cleanup;
  if (win.matchMedia) {
    const mql = win.matchMedia('print');
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', (e) => {
        if (!e.matches) cleanup();
      });
    }
  }

  // Fallback an toàn (60 giây) đề phòng trình duyệt cũ không kích hoạt afterprint
  setTimeout(cleanup, 60000);

  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch (err) {
      console.error('[ReceiptPrinter] Lỗi khi kích hoạt lệnh in:', err);
      cleanup();
    }
  }, 200);
}

/**
 * Facade entrypoint: Điều phối quy trình in phiếu thu
 * @param {Object} txn - Dữ liệu giao dịch
 * @param {Object} [customConfig] - Cấu hình thông tin cửa hàng tùy chỉnh
 */
export function printTransactionReceipt(txn, customConfig = {}) {
  if (!txn) return;
  const formattedData = formatReceiptData(txn, customConfig);
  const htmlContent = buildReceiptTemplate(formattedData, customConfig);
  printViaIframe(htmlContent);
}
