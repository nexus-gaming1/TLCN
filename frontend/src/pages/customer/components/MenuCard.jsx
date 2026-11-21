import { Plus, Minus, Check, Utensils, AlertCircle } from 'lucide-react';

export default function MenuCard({
  item,
  cartItem,
  onAddToCart,
  onUpdateQuantity,
  canOrder = true,
  disabledReason = '',
}) {
  const isOutOfStock = !item.stock_quantity || item.stock_quantity <= 0;
  const quantityInCart = cartItem?.quantity || 0;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between bg-white ${
        isOutOfStock
          ? 'border-slate-200 opacity-60 bg-slate-50'
          : 'border-slate-200 hover:border-cyan-300 hover:shadow-md shadow-xs'
      }`}
    >
      <div>
        {/* Header thẻ: Tên món + Badge tồn kho */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider block mb-0.5">
              {item.category_name || 'MÓN NGON'}
            </span>
            <h4 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2" title={item.name}>
              {item.name}
            </h4>
          </div>

          <div className="shrink-0">
            {isOutOfStock ? (
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
                Hết hàng
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                Còn: {item.stock_quantity}
              </span>
            )}
          </div>
        </div>

        {/* Giá tiền */}
        <div className="mt-1 mb-3">
          <span className="text-base font-extrabold font-mono text-slate-900">
            {parseFloat(item.price || 0).toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Hành động Thêm / Tăng giảm số lượng */}
      <div className="pt-2 border-t border-slate-100">
        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="w-full py-2 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed text-center"
          >
            Tạm ngưng phục vụ
          </button>
        ) : quantityInCart > 0 ? (
          <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-xl p-1">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.service_item_id, quantityInCart - 1)}
              className="w-7 h-7 rounded-lg bg-white hover:bg-cyan-100 text-cyan-800 flex items-center justify-center shadow-xs transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-extrabold text-sm text-cyan-900 px-2">
              {quantityInCart}
            </span>
            <button
              type="button"
              disabled={quantityInCart >= item.stock_quantity}
              onClick={() => onUpdateQuantity(item.service_item_id, quantityInCart + 1)}
              className="w-7 h-7 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào giỏ</span>
          </button>
        )}
      </div>
    </div>
  );
}
