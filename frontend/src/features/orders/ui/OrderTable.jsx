import React from 'react';
import {
  Clock,
  ChefHat,
  Truck,
  CheckCircle2,
  XCircle,
  Wallet,
  Banknote,
  Eye,
  Inbox,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Cấu hình badge cho trạng thái đơn hàng 
const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ nhận',
    icon: Clock,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  PREPARING: {
    label: 'Đang làm',
    icon: ChefHat,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  DELIVERED: {
    label: 'Đã giao',
    icon: Truck,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  COMPLETED: {
    label: 'Hoàn tất',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
  }
};

export default function OrderTable({
  orders = [],
  loading = false,
  pagination = { page: 1, totalPages: 1, total: 0 },
  onPageChange,
  onViewDetail
}) {
  // Format tiền tệ VNĐ
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  // Format thời gian Việt Nam ngắn gọn
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* 1. Phần bảng dữ liệu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <th className="py-3.5 px-4 text-center w-16">Mã Đơn</th>
              <th className="py-3.5 px-4">Thời Gian</th>
              <th className="py-3.5 px-4">Khách Hàng</th>
              <th className="py-3.5 px-4">Món Đã Gọi</th>
              <th className="py-3.5 px-4 text-right">Tổng Tiền</th>
              <th className="py-3.5 px-4 text-center">Thanh Toán</th>
              <th className="py-3.5 px-4 text-center">Trạng Thái</th>
              <th className="py-3.5 px-4">Nhân Viên Xử Lý</th>
              <th className="py-3.5 px-4 text-center w-20">Chi Tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
            {loading ? (
              // Loading khi đang fetch API
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan="9" className="py-4 px-4">
                    <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              // Trạng thái trống
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                    <span className="font-semibold text-slate-500">Không tìm thấy đơn hàng nào</span>
                    <span className="text-[11px] text-slate-400">Thử thay đổi bộ lọc tìm kiếm</span>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusMeta = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusMeta.icon;
                const isWallet = order.payment_method === 'WALLET';
                const isPaid = order.payment_status === 'PAID';

                return (
                  <tr
                    key={order.order_id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onViewDetail(order.order_id)}
                  >
                    {/* Mã đơn */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                      #{order.order_id}
                    </td>

                    {/* Thời gian đặt */}
                    <td className="py-3.5 px-4 text-slate-500 font-normal">
                      {formatDateTime(order.created_at)}
                    </td>

                    {/* Tên khách hàng */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {order.customer_name}
                    </td>

                    {/* Tóm tắt món đã gọi */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="truncate text-slate-700" title={order.items_summary}>
                        {order.items_summary || `${order.item_count || 0} món`}
                      </div>
                    </td>

                    {/* Tổng tiền */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono">
                      {formatCurrency(order.total_amount)}
                    </td>

                    {/* Phương thức và trạng thái thanh toán */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                            isWallet
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isWallet ? (
                            <Wallet className="w-3 h-3" />
                          ) : (
                            <Banknote className="w-3 h-3" />
                          )}
                          {isWallet ? 'VÍ HỘI VIÊN' : 'TIỀN MẶT'}
                        </span>
                        <span
                          className={`text-[9px] font-bold ${
                            isPaid ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {isPaid ? '• Đã thanh toán' : '• Chưa thu tiền'}
                        </span>
                      </div>
                    </td>

                    {/* Trạng thái đơn hàng */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </td>

                    {/* Nhân viên xử lý */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {order.staff_name ? (
                        <span className="font-semibold text-slate-800">{order.staff_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa tiếp nhận</span>
                      )}
                    </td>

                    {/* Cột action: Xem chi tiết */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(order.order_id);
                        }}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all cursor-pointer"
                        title="Xem chi tiết hóa đơn"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Thanh điều hướng phân trang(Pagination Bar) */}
      <div className="py-3 px-4 bg-slate-50/60 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
        <div>
          Hiển thị tổng cộng{' '}
          <span className="font-bold text-slate-800">{pagination.total || 0}</span> đơn hàng
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-bold text-slate-700">
            Trang {pagination.page} / {pagination.totalPages || 1}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}