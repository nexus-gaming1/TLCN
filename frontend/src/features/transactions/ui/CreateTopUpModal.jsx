import { useState } from 'react';
import { X, CreditCard, Banknote, QrCode, Wallet, Check, AlertCircle, Loader2 } from 'lucide-react';

const QUICK_AMOUNTS = [30000, 50000, 100000, 200000];
const MAX_TOPUP_AMOUNT = 100_000_000;
const UNSAFE_REGEX = /<script|javascript:|data:\s*text\/html|\0/i;

const PAYMENT_OPTIONS = [
  { value: 'CASH', label: 'Tiền Mặt', icon: Banknote, iconColor: 'text-amber-600' },
  { value: 'VIETQR', label: 'VietQR Pro', icon: QrCode, iconColor: 'text-sky-600' },
  { value: 'WALLET', label: 'Ví Hội Viên', icon: Wallet, iconColor: 'text-indigo-600' }
];

export default function CreateTopUpModal({ isOpen, onClose, onSubmit }) {
  const [customerInput, setCustomerInput] = useState('');
  const [amount, setAmount] = useState(50000);
  const [category, setCategory] = useState('MEMBER_TOPUP');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleQuickAmount = (val) => {
    setAmount((prev) => Math.min(MAX_TOPUP_AMOUNT, (Number(prev) || 0) + val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedCustomer = customerInput.trim();
    const numericAmount = Number(amount);

    if (!trimmedCustomer) {
      setErrorMsg('Vui lòng nhập mã hội viên, số điện thoại hoặc tên đăng nhập!');
      return;
    }
    if (UNSAFE_REGEX.test(trimmedCustomer) || UNSAFE_REGEX.test(notes)) {
      setErrorMsg('Thông tin nhập vào chứa ký tự không an toàn!');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 10000) {
      setErrorMsg('Số tiền nạp tối thiểu là 10,000 ₫!');
      return;
    }
    if (numericAmount > MAX_TOPUP_AMOUNT) {
      setErrorMsg(`Số tiền nạp tối đa là ${MAX_TOPUP_AMOUNT.toLocaleString('vi-VN')} ₫!`);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        customer_identifier: trimmedCustomer,
        amount: numericAmount,
        category,
        payment_method: paymentMethod,
        notes: notes.trim()
      });
      setCustomerInput('');
      setAmount(50000);
      setNotes('');
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Lỗi khi ghi nhận nạp tiền tại quầy.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col gap-4 border border-slate-100 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base sm:text-lg text-slate-900 truncate">Nạp Tiền Giờ &amp; Dịch Vụ</span>
              <span className="text-xs text-slate-500 truncate">Quầy Thu Ngân Trung Tâm - Giao Dịch Trực Tiếp</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Mã Hội Viên / Số Điện Thoại / Tên Đăng Nhập <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="Nhập ID hội viên, SĐT hoặc username (VD: 1, 0912345678)"
              required
              className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-200 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Số Tiền Nạp (₫) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="10000"
              max={MAX_TOPUP_AMOUNT}
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 rounded-lg text-slate-900 font-mono text-xl font-bold focus:bg-white focus:outline-none border border-slate-200"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="py-1.5 rounded bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 text-xs font-mono font-semibold transition-colors border border-slate-200 cursor-pointer"
                >
                  +{val.toLocaleString('en-US')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Khoản Mục</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-900 focus:outline-none border border-slate-200 font-medium cursor-pointer"
            >
              <option value="MEMBER_TOPUP">Nạp Giờ Chơi (PC Time)</option>
              <option value="SERVICE_SALE">Dịch Vụ F&amp;B (Đồ Ăn &amp; Nước)</option>
              <option value="COMBO_PURCHASE">Combo Đêm (Overnight Pack)</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Phương Thức Thanh Toán</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = paymentMethod === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pm"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setPaymentMethod(opt.value)}
                      className="hidden"
                    />
                    <Icon className={`w-4 h-4 ${opt.iconColor} shrink-0`} />
                    <span className="text-xs truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Ghi Chú (Tùy chọn)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Khách thanh toán tiền mặt tại quầy 1..."
              maxLength={500}
              className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-sky-600 text-white font-semibold text-sm shadow-md hover:bg-sky-700 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Thu Tiền</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
