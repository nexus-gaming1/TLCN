import { Trash2, Plus, Minus, AlertTriangle, ShoppingCart, ArrowRight } from 'lucide-react';

export default function CartDrawer({
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  paymentMethod,
  onPaymentMethodChange,
  walletBalance = 0,
  sessionInfo = null,
  isSubmitting = false,
  onSubmitOrder,
}) {
  const totalAmount = cartItems.reduce(
    (sum, it) => sum + parseFloat(it.price || 0) * it.quantity,
    0
  );

  const isWallet = paymentMethod === 'WALLET';
  const isWalletInsufficient = isWallet && walletBalance < totalAmount;
  const canSubmit = sessionInfo?.can_order && cartItems.length > 0 && !isWalletInsufficient && !isSubmitting;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between space-y-3">
      {/* 1. Header Giỏ Hàng */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Giỏ Hàng Của Bạn</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {cartItems.length} món đã chọn
              </p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa hết</span>
            </button>
          )}
        </div>

        {/* 2. Cảnh Báo Phiên Chơi (In-shop vs Remote) */}
        {!sessionInfo?.can_order && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {sessionInfo?.reason === 'REMOTE_SESSION'
                  ? 'Không thể đặt từ xa'
                  : 'Chưa có phiên chơi'}
              </span>
            </div>
            <p className="text-[11px] text-amber-700">
              {sessionInfo?.message || 'Bạn cần mở máy trạm trực tiếp tại phòng máy để được phục vụ F&B.'}
            </p>
          </div>
        )}

        {/* 3. Danh sách các món trong giỏ */}
        <div className="mt-3 divide-y divide-slate-100 max-h-[0px] overflow-y-auto pr-1">
          {cartItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-medium">
              🛒 Giỏ hàng đang trống. Hãy chọn món bên thực đơn!
            </div>
          ) : (
            cartItems.map((it) => (
              <div key={it.service_item_id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-xs text-slate-800 truncate" title={it.name}>
                    {it.name}
                  </h5>
                  <p className="text-[11px] font-mono text-cyan-700 font-semibold mt-0.5">
                    {parseFloat(it.price || 0).toLocaleString('vi-VN')} đ
                  </p>
                </div>

                {/* Bộ nút tăng giảm */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(it.service_item_id, it.quantity - 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-2xs transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-xs text-slate-800 px-2">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={it.stock_quantity && it.quantity >= it.stock_quantity}
                      onClick={() => onUpdateQuantity(it.service_item_id, it.quantity + 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center shadow-2xs transition disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(it.service_item_id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                    title="Xóa món"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Chọn Phương Thức Thanh Toán & Xác Nhận */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Thanh toán:</span>
            <div className="flex p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => onPaymentMethodChange('WALLET')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  isWallet ? 'bg-white text-cyan-800 shadow-2xs font-extrabold' : 'text-slate-500'
                }`}
              >
                Ví ({walletBalance.toLocaleString('vi-VN')}đ)
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange('CASH')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paymentMethod === 'CASH' ? 'bg-white text-amber-800 shadow-2xs font-extrabold' : 'text-slate-500'
                }`}
              >
                Tiền Mặt
              </button>
            </div>
          </div>
          {/* Tổng tiền và Nút đặt món nằm sát ngay dưới */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Tổng:</span>
            <span className="text-base font-black font-mono text-slate-900">
              {totalAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmitOrder}
            className={`w-full py-2.5 rounded-xl font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 ${
              canSubmit
                ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Đang gửi đơn...' : 'XÁC NHẬN ĐẶT MÓN'}
          </button>
        </div>

        {/* Cảnh báo số dư ví không đủ */}
        {isWalletInsufficient && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Số dư ví không đủ thanh toán!</p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Bạn còn thiếu {(totalAmount - walletBalance).toLocaleString('vi-VN')} đ. Vui lòng nạp thêm tiền hoặc chọn thanh toán <strong>Tiền Mặt</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Tổng tiền */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Tổng thanh toán</span>
          <span className="text-lg font-black font-mono text-slate-900">
            {totalAmount.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Nút gửi đơn hàng */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmitOrder}
          className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2 ${
            canSubmit
              ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white cursor-pointer active:scale-98'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span>Đang gửi đơn hàng...</span>
          ) : (
            <>
              <span>XÁC NHẬN ĐẶT MÓN</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
