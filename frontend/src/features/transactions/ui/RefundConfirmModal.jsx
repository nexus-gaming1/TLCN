import { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

const UNSAFE_REGEX = /<script|javascript:|data:\s*text\/html|\0/i;

export default function RefundConfirmModal({ isOpen, onClose, onSubmit, transaction }) {
  const [reason, setReason] = useState('Nhầm lẫn');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập lý do hoàn tiền!');
      return;
    }
    if (trimmed.length > 500 || UNSAFE_REGEX.test(trimmed)) {
      setErrorMsg('Lý do hoàn tiền không hợp lệ hoặc vượt quá 500 ký tự!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmit(transaction, trimmed);
      onClose();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể hoàn tiền giao dịch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>Xác nhận hoàn tiền</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs sm:text-sm text-rose-700">
            Bạn đang yêu cầu hoàn tiền cho giao dịch <strong>{transaction.txnCode}</strong> của{' '}
            <strong>{transaction.memberName || transaction.member_name || 'Khách hàng'}</strong>. Hành động này không thể hoàn tác.
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
              Lý do hoàn tiền <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Hoàn Tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
