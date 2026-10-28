import React, { useState, useEffect, useRef } from 'react';
import Header from '../../widgets/header/Header';
import Sidebar from '../../widgets/sidebar/Sidebar';
import Footer from '../../widgets/footer/Footer';

import orderService from '../../shared/api/order.service';
import OrderTable from '../../features/orders/ui/OrderTable';
import OrderDetailModal from '../../features/orders/ui/OrderDetailModal';

import {
  UtensilsCrossed,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt
} from 'lucide-react';

export default function OrderHistoryPage({ user, onLogout }) {
  // 1. States dữ liệu đơn hàng & phân trang
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // 2. States bộ lọc
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all'); // 'today' | '7days' | '30days' | 'all'
  const [refreshKey, setRefreshKey] = useState(0);

  // 3. State Modal chi tiết
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Ref quản lý AbortController chống Race Condition & Memory Leak
  const abortControllerRef = useRef(null);

  // Tính toán mốc ngày từ datePreset
  const getDateRange = (preset) => {
    if (preset === 'all') return { startDate: '', endDate: '' };

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (preset === '7days') {
      start.setDate(start.getDate() - 6);
    } else if (preset === '30days') {
      start.setDate(start.getDate() - 29);
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  };

  // Fetch dữ liệu từ Backend API
  useEffect(() => {
    // Hủy request cũ nếu đang chạy
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(datePreset);
        const result = await orderService.getOrderHistory(
          {
            status: statusFilter,
            paymentStatus: paymentStatusFilter,
            startDate,
            endDate,
            search
          },
          {
            page: pagination.page,
            limit: pagination.limit
          },
          controller.signal
        );

        setOrders(result.orders);
        setPagination(result.pagination);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Lỗi khi nạp danh sách đơn hàng F&B:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      controller.abort();
    };
  }, [pagination.page, statusFilter, paymentStatusFilter, datePreset, refreshKey]);

  // Xử lý khi người dùng submit form tìm kiếm
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setRefreshKey((prev) => prev + 1);
  };

  // Tính toán nhanh 4 chỉ số KPI từ danh sách đơn hiện tại
  const kpiMetrics = React.useMemo(() => {
    let pendingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let totalRevenue = 0;

    orders.forEach((o) => {
      if (['PENDING', 'PREPARING'].includes(o.status)) pendingCount++;
      if (o.status === 'COMPLETED') completedCount++;
      if (o.status === 'CANCELLED') cancelledCount++;
      if (o.payment_status === 'PAID') totalRevenue += parseFloat(o.total_amount || 0);
    });

    return { pendingCount, completedCount, cancelledCount, totalRevenue };
  }, [orders]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Top Header */}
      <Header user={user} onLogout={onLogout} />

      {/* Sidebar (Kích hoạt nav 'orders') */}
      <Sidebar activeNav="orders" bootromStatus="ONLINE" />

      {/* Vùng nội dung chính */}
      <div className="pl-[240px]">
        <main className="relative pt-16 pb-20 min-h-screen bg-[#F8F9FA] w-full px-8 py-6 flex flex-col justify-between">
          <div className="flex flex-col w-full gap-6">
            
            {/* Header trang và nút làm mới */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] uppercase text-sky-700 font-extrabold tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    F&amp;B Kitchen &amp; Orders
                  </span>
                  <span className="text-slate-400 font-bold">•</span>
                  <span className="text-slate-500 font-semibold">Nhật Ký Dịch Vụ Máy Trạm</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Lịch Sử Đơn Hàng Dịch Vụ F&amp;B
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Tra cứu chi tiết hóa đơn đồ ăn, thức uống, người duyệt và trạng thái thanh toán từ các máy khách.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  disabled={loading}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {/* 4 Thẻ kpi tổng quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Đơn Trang Này
                  </span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                    {orders.length}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Doanh Thu Trang Này
                  </span>
                  <span className="text-2xl font-black text-emerald-600 font-mono mt-0.5 block">
                    {formatCurrency(kpiMetrics.totalRevenue)}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Đang Chờ &amp; Làm
                  </span>
                  <span className="text-2xl font-black text-amber-600 font-mono mt-0.5 block">
                    {kpiMetrics.pendingCount}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Đã Hoàn Thành
                  </span>
                  <span className="text-2xl font-black text-purple-600 font-mono mt-0.5 block">
                    {kpiMetrics.completedCount}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Thanh tìm kiếm và bộ lọc đa năng */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Ô Search */}
              <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã đơn (#101), tên khách..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 transition-all outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </form>

              {/* Các bộ lọc Dropdown và presets */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Lọc trạng thái đơn */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ nhận (PENDING)</option>
                  <option value="PREPARING">Đang làm (PREPARING)</option>
                  <option value="DELIVERED">Đã giao (DELIVERED)</option>
                  <option value="COMPLETED">Hoàn tất (COMPLETED)</option>
                  <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                </select>

                {/* Lọc theo trạng thái thanh toán */}
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value="ALL">Mọi thanh toán</option>
                  <option value="PAID">Đã thanh toán (PAID)</option>
                  <option value="UNPAID">Chưa thanh toán (UNPAID)</option>
                </select>

                {/* Bộ nút chọn mốc thời gian */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'today', label: 'Hôm nay' },
                    { id: '7days', label: '7 ngày' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setDatePreset(p.id);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        datePreset === p.id
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bảng hiển thị hoá đơn */}
            <OrderTable
              orders={orders}
              loading={loading}
              pagination={pagination}
              onPageChange={(newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
              onViewDetail={(orderId) => setSelectedOrderId(orderId)}
            />
          </div>

          <Footer />
        </main>
      </div>

      {/* Modal xem chi tiết đơn hàng */}
      <OrderDetailModal
        isOpen={!!selectedOrderId}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}