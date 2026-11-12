import { useState, useEffect, useCallback, useMemo } from 'react';
import CustomerLayout from '../../widgets/layouts/customer/CustomerLayout';
import {
  UtensilsCrossed,
  Search,
  RefreshCw,
  AlertTriangle,
  Monitor,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

import orderService from '../../shared/api/order.service';
import profileService from '../../shared/api/profile.service';
import { socket, connectSocket } from '../../shared/socket/socket';
import FloatingToast from '../../shared/ui/FloatingToast';

import MenuCard from './components/MenuCard';
import CartDrawer from './components/CartDrawer';
import ActiveOrderTracker from './components/ActiveOrderTracker';

export default function CustomerFoodPage({ user, onLogout }) {
  const memberId = user?.member_id ?? user?.id ?? user?.user_id;

  // State Thực đơn & Tìm kiếm
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State Giỏ hàng & Thanh toán
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Phiên chơi & Hồ sơ (Số dư ví)
  const [sessionInfo, setSessionInfo] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // State Đơn hàng cá nhân
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Feedback Toast
  const [toast, setToast] = useState(null);

  // Âm thanh báo khi trạng thái đơn thay đổi
  const playNotifySound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('[Audio] Không thể phát âm thanh:', e);
    }
  }, []);

  // 1. Tải thực đơn, phiên chơi và số dư ví
  const loadInitialData = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const [menuData, sessionData, profileData] = await Promise.all([
        orderService.getMenu().catch(() => []),
        orderService.checkSessionStatus().catch(() => ({ can_order: false })),
        memberId ? profileService.getProfile(memberId).catch(() => null) : Promise.resolve(null),
      ]);

      setMenu(Array.isArray(menuData) ? menuData : []);
      setSessionInfo(sessionData);

      if (profileData?.balances?.real_balance !== undefined) {
        setWalletBalance(parseFloat(profileData.balances.real_balance || 0));
      }
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: error.message || 'Không thể đồng bộ dữ liệu với máy chủ',
      });
    } finally {
      setLoadingMenu(false);
    }
  }, [memberId]);

  // 2. Tải danh sách đơn hàng của khách
  const fetchMyOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingOrders(true);
    try {
      const data = await orderService.getMyOrders();
      const list = Array.isArray(data) ? data : data?.data || [];
      setOrders(list);
    } catch (error) {
      if (!isSilent) {
        console.error('Lỗi tải danh sách đơn:', error);
      }
    } finally {
      if (!isSilent) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    fetchMyOrders();
  }, [loadInitialData, fetchMyOrders]);

  // 3. Kết nối Realtime Socket vào Room khách hàng
  useEffect(() => {
    if (!memberId) return;

    connectSocket();
    socket.emit('customer:join', memberId);

    const handleOrderUpdated = (updatedOrder) => {
      playNotifySound();
      setToast({
        type: 'success',
        title: 'Trạng thái đơn hàng cập nhật!',
        message: `Đơn #${updatedOrder.order_id} hiện tại: ${
          updatedOrder.status === 'PREPARING'
            ? 'Đang nấu trong bếp 🍳'
            : updatedOrder.status === 'COMPLETED'
            ? 'Đã phục vụ hoàn tất 🎉'
            : updatedOrder.status === 'CANCELLED'
            ? 'Đã hủy đơn ❌'
            : updatedOrder.status
        }`,
      });

      // Tự động tải lại đơn và số dư
      fetchMyOrders(true);
      if (memberId) {
        profileService.getProfile(memberId).then((res) => {
          if (res?.balances?.real_balance !== undefined) {
            setWalletBalance(parseFloat(res.balances.real_balance || 0));
          }
        }).catch(() => {});
      }
    };

    socket.on('order:updated', handleOrderUpdated);

    return () => {
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [memberId, playNotifySound, fetchMyOrders]);

  // 4. Danh mục món ăn
  const categories = useMemo(() => {
    const set = new Set();
    menu.forEach((item) => {
      if (item.category_name) set.add(item.category_name);
    });
    return ['ALL', ...Array.from(set)];
  }, [menu]);

  // 5. Lọc thực đơn
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory;
      const matchSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  // 6. Xử lý Giỏ hàng
  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.service_item_id === item.service_item_id);
      if (existing) {
        return prev.map((i) =>
          i.service_item_id === item.service_item_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          service_item_id: item.service_item_id,
          name: item.name,
          price: item.price,
          quantity: 1,
          stock_quantity: item.stock_quantity,
        },
      ];
    });
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((i) => i.service_item_id !== itemId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.service_item_id === itemId ? { ...i, quantity: newQuantity } : i))
      );
    }
  };

  const handleRemoveItem = (itemId) => {
    setCart((prev) => prev.filter((i) => i.service_item_id !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // 7. Gửi đơn đặt món
  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !sessionInfo?.can_order) return;

    setIsSubmitting(true);
    try {
      const payload = {
        paymentMethod,
        items: cart.map((i) => ({
          service_item_id: i.service_item_id,
          quantity: i.quantity,
        })),
      };

      await orderService.createOrder(payload);

      setToast({
        type: 'success',
        title: 'Đặt món thành công!',
        message: 'Đơn hàng của bạn đã được chuyển tới quầy thu ngân & bếp!',
      });

      // Reset giỏ hàng và cập nhật đơn
      setCart([]);
      fetchMyOrders(true);
      loadInitialData();
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Đặt món thất bại',
        message: error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại!',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Hủy đơn hàng PENDING
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${orderId} không?`)) {
      return;
    }

    setCancellingOrderId(orderId);
    try {
      await orderService.customerCancelOrder(orderId);
      setToast({
        type: 'warning',
        title: 'Đã hủy đơn hàng',
        message: `Đơn #${orderId} đã được hủy thành công. Tiền (nếu đã trừ ví) đã được hoàn trả!`,
      });
      fetchMyOrders(true);
      loadInitialData();
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Không thể hủy đơn',
        message: error.message || 'Thao tác hủy đơn không thành công.',
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <CustomerLayout user={user} onLogout={onLogout} activeTab="orders">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner tiêu đề trang + Trạng thái máy trạm */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Dịch Vụ Ăn Uống & Giải Khát (F&B)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Món ăn nấu tại chỗ - Phục vụ tận bàn trong vài phút
              </p>
            </div>
          </div>

          {/* Máy trạm đang ngồi */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-600" />
              <div className="text-left text-xs">
                <span className="text-[10px] text-slate-400 font-mono block">VỊ TRÍ PHỤC VỤ</span>
                <span className="font-extrabold text-slate-800 font-mono">
                  {sessionInfo?.computer_name || (sessionInfo?.can_order ? 'Máy trạm' : 'Chưa có máy')}
                </span>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div className="text-left text-xs">
                <span className="text-[10px] text-slate-400 font-mono block">SỐ DƯ VÍ</span>
                <span className="font-black text-emerald-600 font-mono">
                  {walletBalance.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cảnh báo nếu không có phiên chơi trực tiếp */}
        {!sessionInfo?.can_order && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <strong className="block text-amber-800 font-bold">
                {sessionInfo?.reason === 'REMOTE_SESSION'
                  ? 'Tài khoản đang trong phiên chơi từ xa (Remote Session)'
                  : 'Chưa phát hiện phiên chơi trực tiếp tại phòng máy'}
              </strong>
              <span className="text-amber-700">
                {sessionInfo?.message ||
                  'Bạn vẫn có thể duyệt thực đơn, nhưng cần đăng nhập vào một máy trạm tại quán để gửi đơn đặt món.'}
              </span>
            </div>
          </div>
        )}

        {/* Bố Cục Chính: 2 Cột (Trái: Menu Thực Đơn, Phải: Giỏ Hàng & Đơn Hàng Realtime) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CỘT TRÁI: THỰC ĐƠN (2/3 Chiều Rộng) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Bộ lọc Danh mục & Ô tìm kiếm */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'Tất Cả Món' : cat}
                  </button>
                ))}
              </div>

              {/* Ô tìm kiếm */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Tìm món ăn, nước uống..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Lưới các món ăn (Grid 2 - 3 Cột) */}
            {loadingMenu ? (
              <div className="p-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
                Đang chuẩn bị thực đơn tươi ngon...
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
                🍽️ Không tìm thấy món ăn nào phù hợp với từ khóa!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredMenu.map((item) => {
                  const cartItem = cart.find((i) => i.service_item_id === item.service_item_id);
                  return (
                    <MenuCard
                      key={item.service_item_id}
                      item={item}
                      cartItem={cartItem}
                      onAddToCart={handleAddToCart}
                      onUpdateQuantity={handleUpdateQuantity}
                      canOrder={sessionInfo?.can_order}
                      disabledReason={sessionInfo?.message}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* CỘT PHẢI: GIỎ HÀNG + THEO DÕI ĐƠN HÀNG REALTIME (1/3 Chiều Rộng) */}
          <div className="space-y-4">
            {/* Giỏ Hàng */}
            <CartDrawer
              cartItems={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              walletBalance={walletBalance}
              sessionInfo={sessionInfo}
              isSubmitting={isSubmitting}
              onSubmitOrder={handleSubmitOrder}
            />

            {/* Theo dõi đơn hàng Realtime */}
            <ActiveOrderTracker
              orders={orders}
              loading={loadingOrders}
              cancellingOrderId={cancellingOrderId}
              onCancelOrder={handleCancelOrder}
              onRefresh={() => fetchMyOrders(false)}
            />
          </div>
        </div>
      </div>

      <FloatingToast toast={toast} onClose={() => setToast(null)} />
    </CustomerLayout>
  );
}
