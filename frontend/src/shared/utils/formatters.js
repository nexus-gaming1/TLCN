/**
 * Format số tiền VND chuẩn VNĐ
 * @param {number|string} val
 * @returns {string}
 */
export function formatVND(val) {
  const numericVal = Number(val) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericVal);
}

/**
 * Format số nguyên có dấu phân cách hàng nghìn (1,000,000)
 * @param {number|string} val
 * @returns {string}
 */
export function formatNumberWithCommas(val) {
  if (val === undefined || val === null || val === '') return '';
  const numStr = String(val).replace(/[^\d]/g, '');
  if (!numStr) return '';
  return new Intl.NumberFormat('en-US').format(Number(numStr));
}

/**
 * Chuyển chuỗi đã định dạng về số nguyên
 * @param {string} val
 * @returns {number}
 */
export function parseFormattedNumber(val) {
  if (!val) return 0;
  const cleanNumber = String(val).replace(/[^\d]/g, '');
  return cleanNumber ? Number(cleanNumber) : 0;
}

/**
 * Đọc số tiền ra chữ tiếng Việt chuẩn xác (Port từ AmountInputForm trong NexusControl)
 * @param {number|string} value
 * @returns {string}
 */
export function toVietnameseWords(value) {
  const num = Math.floor(Math.abs(Number(value) || 0));
  if (num === 0) return 'Không đồng';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(n) {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor((n % 100) / 10);
    const ones = n % 10;
    let res = hundreds > 0 ? `${digits[hundreds]} trăm` : '';
    if (tens > 1) res += ` ${digits[tens]} mươi`;
    else if (tens === 1) res += ' mười';
    else if (hundreds > 0 && ones > 0) res += ' lẻ';

    if (ones > 0) {
      const oneText = (ones === 1 && tens > 1)
        ? 'mốt'
        : (ones === 5 && tens > 0)
          ? 'lăm'
          : digits[ones];
      res += ` ${oneText}`;
    }
    return res.trim();
  }

  const parts = [];
  let temp = num;
  let unitIndex = 0;

  while (temp > 0) {
    const group = temp % 1000;
    if (group > 0) {
      let groupText = readGroup(group);
      if (unitIndex > 0) {
        groupText += ` ${units[unitIndex % units.length]}`;
      }
      parts.unshift(groupText);
    }
    temp = Math.floor(temp / 1000);
    unitIndex++;
  }

  const result = parts.join(' ').trim();
  const capitalized = result.charAt(0).toUpperCase() + result.slice(1);
  return `${capitalized} đồng`;
}
