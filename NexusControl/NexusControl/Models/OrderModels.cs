using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json.Serialization;

namespace NexusControl.Models
{
    #region 1. DTO Chi tiết món ăn trong đơn
    /// DTO đại diện cho một món ăn/nước uống nằm trong đơn hàng F&B
    /// Khớp nối dữ liệu trả về từ backend (items)    
    public class OrderItemDto
    {
        [JsonPropertyName("service_item_id")]
        public int ServiceItemId { get; set; }

        [JsonPropertyName("item_name")]
        public string ItemName { get; set; } = string.Empty;

        [JsonPropertyName("price")]
        public decimal Price { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("subtotal")]
        public decimal Subtotal { get; set; }

        #region Thuộc tính Helper UI
        
        /// Định dạng giá VNĐ
        [JsonIgnore]
        public string FormattedPrice => string.Format(new CultureInfo("vi-VN"), "{0:C0}", Price);

        
        /// Định dạng giá VNĐ       
        [JsonIgnore]
        public string FormattedSubtotal => string.Format(new CultureInfo("vi-VN"), "{0:C0}", (Subtotal > 0 ? Subtotal : Price * Quantity));
        #endregion
    }
    #endregion

    #region 2. DTO Đơn hàng dành cho nhân viên 
    /// DTO đại diện cho đơn hàng hiển thị tại màn hình staff
    /// Ánh xạ với đối tượng trong mảng 'data' của API GET /api/orders/staff/pending
    public class StaffPendingOrderDto
    {
        [JsonPropertyName("order_id")]
        public int OrderId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "PENDING"; // PENDING, PREPARING, DELIVERED, COMPLETED, CANCELLED

        [JsonPropertyName("payment_status")]
        public string PaymentStatus { get; set; } = "UNPAID"; // PAID, UNPAID

        [JsonPropertyName("total_amount")]
        public decimal TotalAmount { get; set; }

        [JsonPropertyName("customer_name")]
        public string CustomerName { get; set; } = "Khách Hàng";

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("items")]
        public List<OrderItemDto> Items { get; set; } = new();

        #region Thuộc tính Helper hỗ trợ UI và trạng thái 
        /// Định dạng giá         
        [JsonIgnore]
        public string FormattedTotalAmount => string.Format(new CultureInfo("vi-VN"), "{0:C0}", TotalAmount);

        
        /// Tên tiếng Việt hiển thị cho trạng thái đơn hàng        
        [JsonIgnore]
        public string StatusDisplayName => Status switch
        {
            "PENDING" => "Chờ Xử Lý",
            "PREPARING" => "Đang Chế Biến",
            "DELIVERED" => "Đã Giao Món",
            "COMPLETED" => "Hoàn Tất",
            "CANCELLED" => "Đã Hủy",
            _ => Status
        };

        
        /// Tên tiếng Việt hiển thị cho trạng thái thanh toán        
        [JsonIgnore]
        public string PaymentStatusDisplayName => PaymentStatus switch
        {
            "PAID" => "Đã Thanh Toán",
            "UNPAID" => "Chờ Thu Tiền Mặt",
            _ => PaymentStatus
        };

        
        /// Tóm tắt danh sách món ngắn gọn        
        [JsonIgnore]
        public string ItemsSummary => Items != null && Items.Count > 0
            ? string.Join(", ", Items.Select(i => $"{i.Quantity}x {i.ItemName}"))
            : "—";

        
        /// Cho phép thu tiền mặt: Đơn chưa thanh toán và đang ở trạng thái PENDING        
        [JsonIgnore]
        public bool CanConfirmCash => PaymentStatus == "UNPAID" && Status == "PENDING";

        
        /// Cho phép chuyển vào bếp chế biến: Đã thanh toán và đang ở PENDING        
        [JsonIgnore]
        public bool CanStartPreparing => Status == "PENDING" && PaymentStatus == "PAID";

        
        /// Cho phép giao món cho khách: Đơn đang ở PREPARING        
        [JsonIgnore]
        public bool CanDeliver => Status == "PREPARING";

        
        /// Cho phép hoàn tất đơn hàng: Đơn đã giao món DELIVERED        
        [JsonIgnore]
        public bool CanComplete => Status == "DELIVERED";

        
        /// Cho phép staff hủy đơn: Đơn đang ở PENDING hoặc PREPARING        
        [JsonIgnore]
        public bool CanCancel => Status == "PENDING" || Status == "PREPARING";
        #endregion
    }
    #endregion

    #region 3. DTO Bao bọc kết quả danh sách đơn Chờ (Staff Response Envelope)
    
    /// Envelope nhận toàn bộ dữ liệu trả về từ GET /api/orders/staff/pending
    /// Bao gồm mảng data, total và message    
    public class StaffPendingOrdersResponse
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = "success";

        [JsonPropertyName("data")]
        public List<StaffPendingOrderDto> Orders { get; set; } = new();

        [JsonPropertyName("total")]
        public int Total { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }
    }
    #endregion

    #region 4. DTO Chi tiết đơn hàng đầy đủ     
    /// DTO chi tiết một đơn hàng kèm thông tin 
    /// Ánh xạ từ GET /api/orders/:id
    public class OrderDetailDto
    {
        [JsonPropertyName("order_id")]
        public int OrderId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("payment_status")]
        public string PaymentStatus { get; set; } = string.Empty;

        [JsonPropertyName("total_amount")]
        public decimal TotalAmount { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("member")]
        public OrderMemberDto? Member { get; set; }

        [JsonPropertyName("processedBy")]
        public OrderStaffDto? ProcessedBy { get; set; }

        [JsonPropertyName("items")]
        public List<OrderItemDto> Items { get; set; } = new();

        [JsonPropertyName("transactions")]
        public List<OrderTransactionSnapshotDto> Transactions { get; set; } = new();

        [JsonIgnore]
        public string FormattedTotalAmount => string.Format(new CultureInfo("vi-VN"), "{0:C0}", TotalAmount);
    }

    public class OrderMemberDto
    {
        [JsonPropertyName("member_id")]
        public int MemberId { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("full_name")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;
    }

    public class OrderStaffDto
    {
        [JsonPropertyName("user_id")]
        public int UserId { get; set; }

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("full_name")]
        public string FullName { get; set; } = string.Empty;
    }

    public class OrderTransactionSnapshotDto
    {
        [JsonPropertyName("transaction_id")]
        public int TransactionId { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("payment_method")]
        public string PaymentMethod { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }
    }
    #endregion

    #region 5. Request DTOs (Gửi lên Server )

    /// Payload gửi lên khi chuyển trạng thái đơn (PATCH /api/orders/staff/:id/status)
    public class UpdateOrderStatusRequest
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
    }

    
    /// Payload gửi lên khi từ chối / hủy đơn kèm lý do (POST /api/orders/staff/:id/cancel)    
    public class CancelOrderRequest
    {
        [JsonPropertyName("reason")]
        public string Reason { get; set; } = string.Empty;
    }

    
    /// Kết quả trả về sau khi cập nhật trạng thái đơn hàng
    public class UpdateOrderStatusResult
    {
        [JsonPropertyName("order_id")]
        public int OrderId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("payment_status")]
        public string PaymentStatus { get; set; } = string.Empty;

        [JsonPropertyName("processed_by")]
        public int? ProcessedBy { get; set; }
    }

    
    /// Kết quả trả về sau khi xác nhận thu tiền mặt tại quầy
    public class ConfirmCashResult
    {
        [JsonPropertyName("order_id")]
        public int OrderId { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("payment_status")]
        public string PaymentStatus { get; set; } = string.Empty;

        [JsonPropertyName("total_amount")]
        public decimal TotalAmount { get; set; }

        [JsonPropertyName("transaction_id")]
        public int TransactionId { get; set; }

        [JsonPropertyName("processed_by")]
        public int ProcessedBy { get; set; }
    }
    #endregion
}
