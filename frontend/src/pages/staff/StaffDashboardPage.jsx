import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import authService from '../../shared/api/auth.service';
import orderService from '../../shared/api/order.service';
import { socket, connectSocket } from '../../shared/socket/socket';
import FloatingToast from '../../shared/ui/FloatingToast';
import { CreditCard, Coffee, Search, PlusCircle, CheckCircle2, RefreshCw } from 'lucide-react';

import StaffOrderCard from './components/StaffOrderCard';
import CancelOrderModal from './components/CancelOrderModal';
import RefundOrderModal from './components/RefundOrderModal';

export default function StaffDashboardPage({ user, onLogout }) {
  // State nạp tiền
  const [topupAmount, setTopupAmount] = useState('');
  const [targetMember, setTargetMember] = useState('');
  const [topupSuccess, setTopupSuccess] = useState(false);

  // State đơn hàng
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'PREPARING' | 'COMPLETED'
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // State Modals
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Âm thanh chuông báo Web Audio API
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

  // Fetch danh sách đơn
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingOrders(true);
    try {
      const data = await orderService.getStaffPendingOrders({ status: activeTab });
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Lỗi tải đơn hàng',
        message: error.message || 'Không thể lấy danh sách đơn từ máy chủ'
      });
    } finally {
      if (!isSilent) setLoadingOrders(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime Socket
  useEffect(() => {
    connectSocket();
    socket.emit('staff:join');

    const handleOrderCreated = (newOrder) => {
      playChimeSound();
      setToast({
        type: 'success',
        title: '🔔 CÓ ĐƠN HÀNG MỚI!',
        message: `Đơn #${newOrder.order_id} tại ${newOrder.computer_name || 'máy trạm'} vừa được đặt.`
      });

      setActiveTab((currentTab) => {
        if (currentTab === 'PENDING') {
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.order_id !== newOrder.order_id)]);
        }
        return currentTab;
      });
    };

    const handleOrderUpdated = () => fetchOrders(true);

    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [playChimeSound, fetchOrders]);

  // Hành động xử lý đơn
  const handleConfirmCash = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await orderService.confirmCashPayment(orderId);
      setToast({ type: 'success', title: 'Đã thu tiền mặt', message: `Đơn #${orderId} đã chuyển sang bếp chế biến!` });
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
        reason: refundReason.trim()
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
      <Sidebar role="EMPLOYEE" />

      <div className="lg:pl-[240px]">
        <main className="pt-20 pb-16 px-6 max-w-7xl mx-auto space-y-6">
          {/* Welcome Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 inline-block mb-2">
                👨‍💼 QUẦY THU NGÂN TẠI QUÁN
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">Xin chào, {user?.full_name || 'Nhân Viên Thu Ngân'}!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Trạm thu ngân số #1 | Ca làm việc: <span className="font-bold text-slate-700 font-mono">CA SÁNG (07:00 - 15:00)</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">TỔNG NẠP CA TRỰC</span>
                <span className="text-lg font-extrabold text-emerald-600 font-mono">4,850,000 đ</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top-up Form Panel (Cột Trái) */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  Nạp Tiền Tài Khoản Hội Viên
                </h3>
              </div>
              {topupSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Đã nạp tiền thành công cho tài khoản!</span>
                </div>
              )}
              <form onSubmit={handleTopupSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Tên tài khoản hội viên / SĐT</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nhập tên user..."
                      value={targetMember}
                      onChange={(e) => setTargetMember(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium"
                      required
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Số tiền nạp (VNĐ)</label>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono placeholder-slate-400 font-bold text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                  {['20000', '50000', '100000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className="py-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 text-center font-bold border border-slate-200 transition-colors"
                    >
                      +{parseInt(amt, 10).toLocaleString('vi-VN')}đ
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>XÁC NHẬN NẠP TIỀN</span>
                </button>
              </form>
            </div>

            {/* Kitchen KDS Panel (Cột Phải) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Điều Phối Dịch Vụ F&B (Kitchen KDS)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchOrders()}
                    disabled={loadingOrders}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin text-amber-600' : ''}`} />
                  </button>

                  <div className="flex p-1 rounded-xl bg-slate-100 font-mono text-xs font-bold">
                    {['PENDING', 'PREPARING', 'COMPLETED'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          activeTab === tab
                            ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab === 'PENDING' ? 'Chờ Xử Lý' : tab === 'PREPARING' ? 'Đang Nấu' : 'Lịch Sử Đã Giao'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Danh sách Thẻ đơn hàng */}
              <div className="space-y-3.5">
                {loadingOrders && orders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    Đang đồng bộ dữ liệu đơn hàng...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    🎉 Không có đơn hàng nào trong mục này!
                  </div>
                ) : (
                  orders.map((order) => (
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
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modal Hủy Đơn */}
        <CancelOrderModal
          order={cancelModalOrder}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          submitting={cancelSubmitting}
          onSubmit={handleConfirmCancelSubmit}
          onClose={() => setCancelModalOrder(null)}
        />

        {/* Modal Hoàn Tiền Sự Cố */}
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

        <FloatingToast toast={toast} onClose={() => setToast(null)} />
      </div>

      <Footer />
    </div>
  );
}