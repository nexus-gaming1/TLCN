import { useState, useEffect, useCallback } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';
import authService from '../../shared/api/auth.service';
import orderService from '../../shared/api/order.service';
import supportService from '../../shared/api/support.service';
import { socket, connectSocket } from '../../shared/socket/socket';
import FloatingToast from '../../shared/ui/FloatingToast';
import {
  CreditCard,
  Coffee,
  Search,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  ShoppingBag,
  Megaphone,
} from 'lucide-react';

import StaffOrderCard from './components/StaffOrderCard';
import CancelOrderModal from './components/CancelOrderModal';
import RefundOrderModal from './components/RefundOrderModal';
import CreateCounterOrderModal from './components/CreateCounterOrderModal';
import AnnouncementManagementModal from './components/AnnouncementManagementModal';
import StaffSupportTicketSection from './components/StaffSupportTicketSection';

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
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Âm thanh chuông báo động KDS
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
      osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12);
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

  // 1. Tải danh sách đơn hàng F&B
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (activeTab === 'TICKETS') return; // Không gọi API đơn hàng khi đang ở tab hỗ trợ
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

  // 2. Tải danh sách yêu cầu hỗ trợ / khiếu nại (ĐỘC LẬP Ở CẤP COMPONENT)
  const fetchSupportTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await supportService.getStaffRequests({ limit: 30 });
      const actionableTickets = (res.rows || []).filter((t) => t.type !== 'FEEDBACK'); //Chỉ giữ lại sự cố cần hành động tại phòng máy
      setSupportTickets(actionableTickets);
    } catch (err) {
      console.error('Lỗi khi tải support tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  // 3. Xử lý ticket (Tiếp nhận / Hoàn tất / Bác bỏ / Duyệt Hoàn tiền)
  const handleProcessTicket = async (ticketId, action, refundAmountVal = null, note = '') => {
    try {
      let defaultNote = '';
      if (action === 'IN_PROGRESS') {
        defaultNote = 'Nhân viên đang tới máy hỗ trợ';
      } else if (action === 'RESOLVE') {
        defaultNote = 'Nhân viên đã hỗ trợ xử lý hoàn tất';
      } else if (action === 'REJECT') {
        defaultNote = 'Từ chối yêu cầu';
      } else if (action === 'REFUND') {
        defaultNote = 'Duyệt hoàn tiền sự cố món ăn';
      }

      const payload = {
        action,
        resolution_note: note || defaultNote,
      };
      // Chốt chặn an toàn: Chỉ gán refund_amount khi có giá trị số hợp lệ (Tránh lỗi NaN ở Backend)
      if (refundAmountVal !== null && refundAmountVal !== undefined && !isNaN(parseFloat(refundAmountVal))) {
        payload.refund_amount = parseFloat(refundAmountVal);
      }
      await supportService.processRequest(ticketId, payload);
      setToast({ type: 'success', title: 'Thành công', message: 'Đã cập nhật trạng thái yêu cầu!' });
      fetchSupportTickets();
      if (action === 'REFUND') {
        fetchOrders(true); // Cập nhật lại danh sách đơn hàng nếu có hoàn tiền
      }
    } catch (err) {
      setToast({ type: 'error', title: 'Thao tác thất bại', message: err.message || 'Lỗi khi cập nhật ticket' });
    }
  };

  // Khởi chạy khi mount hoặc khi tab thay đổi
  useEffect(() => {
    fetchOrders();
    fetchSupportTickets();
  }, [fetchOrders, fetchSupportTickets]);

  // Realtime Socket listeners & Cleanups
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

    const handleSupportCreated = (newTicket) => {
      if (newTicket.type === 'FEEDBACK') return; //nếu là feedback thì bỏ qua kích hoạt chuông 

      playChimeSound();
      setToast({
        type: 'warning',
        title: 'CÓ YÊU CẦU HỖ TRỢ MỚI!',
        message: `${newTicket.title} - ${newTicket.description || 'Khách cần hỗ trợ tại máy'}`,
      });
      fetchSupportTickets();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('order:created', handleOrderCreated);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('support:created', handleSupportCreated);
    socket.on('support:updated', fetchSupportTickets);
    setIsSocketConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('order:created', handleOrderCreated);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('support:created', handleSupportCreated);
      socket.off('support:updated', fetchSupportTickets);
    };
  }, [playChimeSound, fetchOrders, fetchSupportTickets]);

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
      setToast({
        type: 'success',
        title: 'Hoàn tiền thành công',
        message: `Đã hoàn ${parseFloat(refundAmount).toLocaleString('vi-VN')}đ.`,
      });
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

  // Mảng tab điều phối bao gồm cả Tab Tickets
  const pendingTicketsCount = supportTickets.filter((t) => t.status === 'PENDING').length;
  const tabs = [
    { id: 'PENDING', label: 'Chờ Xử Lý' },
    { id: 'PREPARING', label: 'Đang Nấu' },
    { id: 'COMPLETED', label: 'Lịch Sử Đã Giao' },
    {
      id: 'TICKETS',
      label: 'Yêu Cầu / Khiếu Nại',
      badge: pendingTicketsCount,
    },
  ];

  return (
    <div className="bg-[#F8F9FA] min-h-screen text-slate-800 font-sans antialiased">
      <Header user={user} onLogout={handleLogout} />
      <Sidebar activeNav="pos" role={user?.role} />

      <div className="lg:pl-[240px]">
        <main className="pt-20 pb-16 px-6 max-w-7xl mx-auto space-y-4">
            {/* 1. Thanh Tiêu Đề & Trạng Thái Socket */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Điều Phối Phòng Máy & F&B KDS</span>
                </h1>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Tiếp nhận đơn hàng, yêu cầu hỗ trợ máy trạm và nạp giờ chơi trực tiếp.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                    isSocketConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  }`}
                >
                  {isSocketConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span>{isSocketConnected ? 'Realtime Online' : 'Mất Kết Nối Socket'}</span>
                </span>
              </div>
            </div>

            {/* 2. Thanh Công Cụ Nhanh (Nạp Tiền Ví & Phát Sóng Banner) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <form onSubmit={handleTopupSubmit} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs shrink-0">
                  <CreditCard className="w-4 h-4 text-cyan-600" />
                  <span>Nạp Tiền Hội Viên:</span>
                </div>

                <div className="relative min-w-[140px] flex-1 max-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={targetMember}
                    onChange={(e) => setTargetMember(e.target.value)}
                    placeholder="Tên tài khoản..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-hidden font-medium"
                  />
                </div>

                <div className="min-w-[130px] flex-1 max-w-[180px]">
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Số tiền (VNĐ)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!targetMember || !topupAmount}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
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

                {/* Nút Quản Lý Banner Thông Báo */}
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 ml-auto cursor-pointer"
                  title="Quản lý và phát sóng banner thông báo phòng máy"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Quản Lý Banner</span>
                </button>

                {/* Nút Bán Món Tại Quầy */}
                <button
                  type="button"
                  onClick={() => setIsCreateCounterModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Bán Món Tại Quầy</span>
                </button>
              </form>
            </div>

            {/* 3. Trung Tâm Điều Phối KDS & Hỗ Trợ */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {activeTab === 'TICKETS' ? 'Yêu Cầu Hỗ Trợ & Khiếu Nại Phòng Máy' : 'Điều Phối Dịch Vụ F&B (Kitchen KDS)'}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'TICKETS') {
                        fetchSupportTickets();
                      } else {
                        fetchOrders();
                      }
                    }}
                    disabled={loadingOrders || loadingTickets}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-4 h-4 ${(loadingOrders || loadingTickets) ? 'animate-spin text-cyan-600' : ''}`} />
                  </button>

                  <div className="flex p-1 rounded-xl bg-slate-100 font-mono text-xs font-bold">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (tab.id === 'TICKETS') fetchSupportTickets();
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer relative ${
                          activeTab === tab.id
                            ? 'bg-white text-cyan-900 shadow-xs font-black'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                        {tab.badge > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] animate-pulse font-mono font-black">
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Nội dung Tab: Hiển thị Ticket hoặc Grid Đơn Hàng */}
              {activeTab === 'TICKETS' ? (
                <StaffSupportTicketSection
                  tickets={supportTickets}
                  loading={loadingTickets}
                  onProcessTicket={handleProcessTicket}
                />
              ) : (
                <>
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
                </>
              )}
            </div>
        </main>

        {/* Các Modals nghiệp vụ */}
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
              message: 'Đơn hàng mới đã được xuất sang bếp KDS!',
            });
          }}
        />

        <AnnouncementManagementModal
          isOpen={isAnnouncementModalOpen}
          onClose={() => setIsAnnouncementModalOpen(false)}
        />

        <FloatingToast toast={toast} onClose={() => setToast(null)} />
      </div>

      <Footer />
    </div>
  );
}