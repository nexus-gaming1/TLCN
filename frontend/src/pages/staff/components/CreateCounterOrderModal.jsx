import { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Minus, ShoppingBag, Banknote, CreditCard, AlertCircle } from 'lucide-react';
import orderService from '../../../shared/api/order.service';

export default function CreateCounterOrderModal({ isOpen, onClose, onOrderCreated }) {
  const [customerUsername, setCustomerUsername] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [searchItem, setSearchItem] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ service_item_id, name, price, quantity }]
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tải menu khi mở modal
  useEffect(() => {
    if (isOpen) {
      setLoadingMenu(true);
      setErrorMsg('');
      orderService.getMenu()
        .then((data) => setMenu(Array.isArray(data) ? data : []))
        .catch((err) => setErrorMsg('Không thể tải thực đơn: ' + err.message))
        .finally(() => setLoadingMenu(false));
    } else {
      // Reset form khi đóng
      setCustomerUsername('');
      setSelectedItems([]);
      setPaymentMethod('CASH');
      setErrorMsg('');
    }
  }, [isOpen]);

  // Lọc món theo ô tìm kiếm
  const filteredMenu = useMemo(() => {
    return menu.filter((item) =>
      item.name?.toLowerCase().includes(searchItem.toLowerCase().trim())
    );
  }, [menu, searchItem]);

  // Thêm món vào đơn
  const handleAddItem = (item) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.service_item_id === item.service_item_id);
      if (existing) {
        return prev.map((i) =>
          i.service_item_id === item.service_item_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { service_item_id: item.service_item_id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId, qty) => {
    if (qty <= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.service_item_id !== itemId));
    } else {
      setSelectedItems((prev) =>
        prev.map((i) => (i.service_item_id === itemId ? { ...i, quantity: qty } : i))
      );
    }
  };

  const totalAmount = selectedItems.reduce(
    (sum, it) => sum + parseFloat(it.price || 0) * it.quantity,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerUsername.trim()) {
      setErrorMsg('Vui lòng nhập tên tài khoản hội viên!');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 món ăn/nước uống!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        target_member_id: customerUsername.trim(),
        paymentMethod,
        items: selectedItems.map((i) => ({
          service_item_id: i.service_item_id,
          quantity: i.quantity,
        })),
      };

      await orderService.createOrder(payload);
      onOrderCreated();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tạo đơn tại quầy');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Bán Hàng &amp; Tạo Đơn F&amp;B Tại Quầy</h3>
              <p className="text-[11px] text-slate-400">Xuất đơn trực tiếp cho khách mua tại quầy thu ngân</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
          {/* Thông tin hội viên & Phương thức thanh toán */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tài khoản hội viên mua hàng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập username (vd: user)..."
                  value={customerUsername}
                  onChange={(e) => setCustomerUsername(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  required
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phương thức thanh toán</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Tiền Mặt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('WALLET')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    paymentMethod === 'WALLET'
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Trừ Ví</span>
                </button>
              </div>
            </div>
          </div>

          {/* Khu vực chọn món & Giỏ tạm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Cột trái: Thực đơn có sẵn */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col overflow-hidden bg-slate-50/50">
              <div className="relative mb-2 shrink-0">
                <input
                  type="text"
                  placeholder="Tìm món..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {loadingMenu ? (
                  <p className="text-center text-slate-400 text-xs py-8">Đang tải thực đơn...</p>
                ) : filteredMenu.map((item) => (
                  <div
                    key={item.service_item_id}
                    onClick={() => handleAddItem(item)}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:border-cyan-400 hover:shadow-2xs cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Còn: {item.stock_quantity}</p>
                    </div>
                    <span className="font-mono font-bold text-cyan-700">
                      {parseFloat(item.price || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột phải: Món đã chọn trong đơn */}
            <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                <h4 className="text-xs font-extrabold text-slate-700 pb-1.5">Món trong đơn ({selectedItems.length})</h4>
                {selectedItems.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-8">Chưa chọn món nào</p>
                ) : (
                  selectedItems.map((it) => (
                    <div key={it.service_item_id} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-1">
                        <p className="font-bold text-slate-800 truncate">{it.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {(parseFloat(it.price || 0) * it.quantity).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(it.service_item_id, it.quantity - 1)}
                          className="w-5 h-5 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1.5 font-mono font-bold text-xs">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(it.service_item_id, it.quantity + 1)}
                          className="w-5 h-5 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tổng tiền */}
              <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-bold">Tổng thanh toán:</span>
                <span className="text-base font-black font-mono text-cyan-800">
                  {totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{submitting ? 'Đang tạo đơn...' : 'XÁC NHẬN & XUẤT ĐƠN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}