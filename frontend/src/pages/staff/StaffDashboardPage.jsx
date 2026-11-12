import { useState, useEffect, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import authService from '../../shared/api/auth.service';
import orderService from '../../shared/api/order.service';
import { socket, connectSocket } from '../../shared/socket/socket';
import FloatingToast from '../../shared/ui/FloatingToast';
import { CreditCard, Coffee, Search, PlusCircle, CheckCircle2, RefreshCw, Wifi, WifiOff, ShoppingBag  } from 'lucide-react';

import StaffOrderCard from './components/StaffOrderCard';
import CancelOrderModal from './components/CancelOrderModal';
import RefundOrderModal from './components/RefundOrderModal';
import CreateCounterOrderModal from './components/CreateCounterOrderModal';

export default function StaffDashboardPage({ user, onLogout }) {
  const [topupAmount, setTopupAmount] = useState('');
  const [targetMember, setTargetMember] = useState('');
  const [topupSuccess, setTopupSuccess] = useState(false);

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(socket?.connected || false);

  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const [isCreateCounterModalOpen, setIsCreateCounterModalOpen] = useState(false);

  const playChimeSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn('[Audio] Không thể phát âm thanh chuông báo:', err);
    }
  }, []);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingOrders(true);
    try {
      const data = await orderService.getStaffPendingOrders({ status: activeTab });
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Lỗi tải đơn hàng',
        message: error.message || 'Không thể lấy danh sách đơn từ máy chủ',
      });
    } finally {
      if (!isSilent) setLoadingOrders(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    connectSocket();
    socket.emit('staff:join');

    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    const handleOrderCreated = (newOrder) => {
      playChimeSound();
      setToast({
        type: 'success',
        title: '🔔 CÓ ĐƠN HÀNG MỚI!',
        message: `Đơn #${newOrder.order_id} tại ${newOrder.computer_name || 'máy trạm'} vừa được đặt.`,
      });

      setActiveTab((currentTab) => {
        if (currentTab === 'PENDING') {
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.order_id !== newOrder.order_id)]);
        }
        return currentTab;
      });
    };

    const handleOrderUpdated = () => fetchOrders(true);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);

    setIsSocketConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [playChimeSound, fetchOrders]);

  const handleConfirmCash = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await orderService.confirmCashPayment(orderId);
      setToast({ type: 'success', title: 'Đã thu tiền mặt', message: `Đơn #${orderId} đã được xác nhận!` });
      fetchOrders(true);
    } catch (error) {
      setToast({ type: 'error', title: 'Thao tác thất bại', message: error.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartCooking = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await orderService.updateOrderStatus(orderId, 'PREPARING');
      setToast({ type: 'success', title: 'Đã nhận đơn vào bếp', message: `Đơn #${orderId} đang được nấu!` });
      fetchOrders(true);
    } catch (error) {
      setToast({ type: 'error', title: 'Thao tác thất bại', message: error.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await orderService.updateOrderStatus(orderId, 'COMPLETED');
      setToast({ type: 'success', title: 'Phục vụ hoàn tất', message: `Đơn #${orderId} đã giao thành công!` });
      fetchOrders(true);
    } catch (error) {
      setToast({ type: 'error', title: 'Thao tác thất bại', message: error.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModalOrder || !cancelReason.trim()) return;
    setCancelSubmitting(true);
    try {
      await orderService.staffCancelOrder(cancelModalOrder.order_id, cancelReason.trim());
      setToast({ type: 'warning', title: 'Đã hủy đơn hàng', message: `Đơn #${cancelModalOrder.order_id} đã bị hủy.` });
      setCancelModalOrder(null);
      setCancelReason('');
      fetchOrders(true);
    } catch (error) {
      setToast({ type: 'error', title: 'Không thể hủy đơn', message: error.message });
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleConfirmRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundModalOrder || !refundReason.trim() || !refundAmount) return;
    setRefundSubmitting(true);
    try {
      await orderService.refundCompletedOrder(refundModalOrder.order_id, {
        amount: parseFloat(refundAmount),
        reason: refundReason.trim(),
      });
      setToast({ type: 'success', title: 'Hoàn tiền thành công', message: `Đã hoàn ${parseFloat(refundAmount).toLocaleString('vi-VN')}đ.` });
      setRefundModalOrder(null);
      setRefundAmount('');
      setRefundReason('');
      fetchOrders(true);
    } catch (error) {
      setToast({ type: 'error', title: 'Hoàn tiền thất bại', message: error.message });
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    if (onLogout) onLogout();
  };

  const handleTopupSubmit = (e) => {
    e.preventDefault();
    if (!targetMember || !topupAmount) return;
    setTopupSuccess(true);
    setTimeout(() => {
      setTopupSuccess(false);
      setTopupAmount('');
      setTargetMember('');
    }, 3000);
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen text-slate-800 font-sans antialiased">
      <Header user={user} onLogout={handleLogout} />
      <Sidebar activeNav="pos" />

      <div className="lg:pl-[240px]">
        <main className="pt-20 pb-16 px-6 max-w-7xl mx-auto space-y-4">
          {/* 1. Top Bar */}
          <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-4 py-1 rounded-md bg-slate-900 text-cyan-400 font-bold border border-slate-700">
                QUẦY THU NGÂN
              </span>
              <span className="font-extrabold text-slate-800">
                {user?.full_name || 'Nhân Viên Thu Ngân'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-mono">
                Trạm: <strong className="text-slate-700">#01</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                Ca trực: <strong className="text-slate-700 font-mono">CA SÁNG (07:00 - 15:00)</strong>
              </span>
            </div>

            {/* Socket status */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
              {isSocketConnected ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span>Realtime: Đã kết nối</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                  <WifiOff className="w-3 h-3 text-rose-600" />
                  <span>Realtime: Đang nối lại...</span>
                </span>
              )}
            </div>
          </div>

          {/* 2. Quick Top-up Bar */}
          <div className="px-4 py-2.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <form onSubmit={handleTopupSubmit} className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold shrink-0">
                <CreditCard className="w-4 h-4 text-cyan-600" />
                <span className="hidden sm:inline">Nạp Ví Nhanh:</span>
              </div>

              <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                <input
                  type="text"
                  placeholder="Tên tài khoản / SĐT..."
                  value={targetMember}
                  onChange={(e) => setTargetMember(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 font-medium text-xs"
                  required
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>

              <div className="min-w-[130px] flex-1 sm:flex-initial">
                <input
                  type="number"
                  placeholder="Số tiền VNĐ..."
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono placeholder-slate-400 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  required
                />
              </div>

              <div className="hidden md:flex items-center gap-1 font-mono">
                {['20000', '50000', '100000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 font-bold border border-slate-200 text-[11px] transition-colors cursor-pointer"
                  >
                    +{parseInt(amt, 10) / 1000}k
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nạp Tiền</span>
              </button>

              {topupSuccess && (
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã nạp thành công!
                </span>
              )}

              {/* Nút Bán Món Tại Quầy */}
              <button
                type="button"
                onClick={() => setIsCreateCounterModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 ml-auto"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bán Món Tại Quầy</span>
              </button>
            </form>
          </div>

          {/* 3. Trung Tâm Điều Phối KDS */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Điều Phối Dịch Vụ F&B (Kitchen KDS)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchOrders()}
                  disabled={loadingOrders}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin text-cyan-600' : ''}`} />
                </button>

                <div className="flex p-1 rounded-xl bg-slate-100 font-mono text-xs font-bold">
                  {[
                    { id: 'PENDING', label: 'Chờ Xử Lý' },
                    { id: 'PREPARING', label: 'Đang Nấu' },
                    { id: 'COMPLETED', label: 'Lịch Sử Đã Giao' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-white text-cyan-900 shadow-xs font-black'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && orders.length > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-cyan-600 text-white text-[10px]">
                          {orders.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Grid Đa Cột */}
            {loadingOrders && orders.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-medium text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
                Đang đồng bộ dữ liệu đơn hàng...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                🎉 Không có đơn hàng nào trong mục này!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <StaffOrderCard
                    key={order.order_id}
                    order={order}
                    actionLoadingId={actionLoadingId}
                    onConfirmCash={handleConfirmCash}
                    onStartCooking={handleStartCooking}
                    onCompleteOrder={handleCompleteOrder}
                    onOpenCancelModal={(ord) => {
                      setCancelModalOrder(ord);
                      setCancelReason('');
                    }}
                    onOpenRefundModal={(ord) => {
                      setRefundModalOrder(ord);
                      setRefundAmount(String(ord.total_amount));
                      setRefundReason('');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <CancelOrderModal
          order={cancelModalOrder}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          submitting={cancelSubmitting}
          onSubmit={handleConfirmCancelSubmit}
          onClose={() => setCancelModalOrder(null)}
        />

        <RefundOrderModal
          order={refundModalOrder}
          amount={refundAmount}
          onAmountChange={setRefundAmount}
          reason={refundReason}
          onReasonChange={setRefundReason}
          submitting={refundSubmitting}
          onSubmit={handleConfirmRefundSubmit}
          onClose={() => setRefundModalOrder(null)}
        />


        <CreateCounterOrderModal
          isOpen={isCreateCounterModalOpen}
          onClose={() => setIsCreateCounterModalOpen(false)}
          onOrderCreated={() => {
            fetchOrders(true);
            setToast({
              type: 'success',
              title: 'Tạo đơn tại quầy thành công',
              message: 'Đơn hàng mới đã được xuất sang bếp KDS!'
            });
          }}
        />

        <FloatingToast toast={toast} onClose={() => setToast(null)} />
      </div>

      <Footer />
    </div>
  );
}