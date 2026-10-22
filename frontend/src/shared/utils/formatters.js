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
