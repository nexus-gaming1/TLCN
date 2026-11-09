using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NexusControl.Models;

namespace NexusControl.Services
{
    
    /// OrderStaffService
    /// Đảm nhiệm toàn bộ nghiệp vụ gọi API Quản lý đơn hàng F&B cho staff
    /// Tuân thủ quy chuẩn domain service kết nối qua ApiClient Singleton, tự động kèm JWT Bearer
    public class OrderStaffService
    {
        private static readonly Lazy<OrderStaffService> _lazy = new(() => new OrderStaffService());
        public static OrderStaffService Instance => _lazy.Value;

        private readonly ApiClient _apiClient;

        public OrderStaffService(ApiClient? apiClient = null)
        {
            _apiClient = apiClient ?? ApiClient.Instance;
        }

        
        /// Lấy danh sách các đơn hàng chờ xử lý (PENDING, PREPARING) cho staff
        /// Gọi HTTP GET: /api/orders/staff/pending
        /// <param name="status">Trạng thái cần lọc (Mặc định null = lấy cả PENDING và PREPARING)</param>
        /// <param name="cancellationToken">Token hỗ trợ hủy request khi đóng giao diện</param>
        public async Task<ApiResponse<List<StaffPendingOrderDto>>> GetPendingOrdersAsync(
            string? status = null,
            CancellationToken cancellationToken = default)
        {
            string endpoint = "/orders/staff/pending";
            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                endpoint += $"?status={Uri.EscapeDataString(status.Trim())}";
            }

            return await _apiClient.GetAsync<List<StaffPendingOrderDto>>(endpoint, cancellationToken);
        }

        
        /// Cập nhật trạng thái chế biến hoặc giao món của đơn hàng
        /// Gọi HTTP PATCH: /api/orders/staff/:id/status
        
        /// <param name="orderId">Mã đơn hàng</param>
        /// <param name="newStatus">Trạng thái mới: PREPARING, DELIVERED, COMPLETED</param>
        /// <param name="cancellationToken">Token hỗ trợ hủy request</param>
        public async Task<ApiResponse<UpdateOrderStatusResult>> UpdateOrderStatusAsync(
            int orderId,
            string newStatus,
            CancellationToken cancellationToken = default)
        {
            if (orderId <= 0)
            {
                return ApiResponse<UpdateOrderStatusResult>.Error("Mã đơn hàng không hợp lệ.");
            }

            if (string.IsNullOrWhiteSpace(newStatus))
            {
                return ApiResponse<UpdateOrderStatusResult>.Error("Trạng thái đơn hàng không được để trống.");
            }

            var request = new UpdateOrderStatusRequest
            {
                Status = newStatus.Trim().ToUpperInvariant()
            };

            return await _apiClient.PatchAsync<UpdateOrderStatusResult>($"/orders/staff/{orderId}/status", request, cancellationToken);
        }

        
        /// Xác nhận đã thu tiền mặt tại quầy và chuyển đơn vào bếp 
        /// Gọi HTTP POST: /api/orders/staff/:id/confirm-cash        
        /// <param name="orderId">Mã đơn hàng tiền mặt cần thu</param>
        /// <param name="cancellationToken">Token hỗ trợ hủy request</param>
        public async Task<ApiResponse<ConfirmCashResult>> ConfirmCashPaymentAsync(
            int orderId,
            CancellationToken cancellationToken = default)
        {
            if (orderId <= 0)
            {
                return ApiResponse<ConfirmCashResult>.Error("Mã đơn hàng không hợp lệ.");
            }

            // Gửi body rỗng theo chuẩn RESTful POST action
            return await _apiClient.PostAsync<ConfirmCashResult>($"/orders/staff/{orderId}/confirm-cash", new { }, cancellationToken);
        }

        
        /// staff  hủy đơn hàng kèm lý do cụ thể (tự động hoàn kho và hoàn ví)
        /// Gọi HTTP POST: /api/orders/staff/:id/cancel
        /// <param name="orderId">Mã đơn hàng</param>
        /// <param name="reason">Lý do từ chối/hủy đơn (Bắt buộc)</param>
        /// <param name="cancellationToken">Token hỗ trợ hủy request</param>
        public async Task<ApiResponse<object>> CancelOrderAsync(
            int orderId,
            string reason,
            CancellationToken cancellationToken = default)
        {
            if (orderId <= 0)
            {
                return ApiResponse<object>.Error("Mã đơn hàng không hợp lệ.");
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                return ApiResponse<object>.Error("Vui lòng cung cấp lý do hủy đơn hàng.");
            }

            var request = new CancelOrderRequest
            {
                Reason = reason.Trim()
            };

            return await _apiClient.PostAsync<object>($"/orders/staff/{orderId}/cancel", request, cancellationToken);
        }

        
        /// Lấy thông tin chi tiết một đơn hàng kèm danh sách món, snapshot đơn giá và lịch sử giao dịch.
        /// Gọi HTTP GET: /api/orders/:id
        /// <param name="orderId">Mã đơn hàng cần xem chi tiết</param>
        /// <param name="cancellationToken">Token hỗ trợ hủy request</param>
        public async Task<ApiResponse<OrderDetailDto>> GetOrderDetailAsync(
            int orderId,
            CancellationToken cancellationToken = default)
        {
            if (orderId <= 0)
            {
                return ApiResponse<OrderDetailDto>.Error("Mã đơn hàng không hợp lệ.");
            }

            return await _apiClient.GetAsync<OrderDetailDto>($"/orders/{orderId}", cancellationToken);
        }
    }
}
