using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using System.Linq;
using NexusControl.Models;

namespace NexusControl.Views
{
    /// UserControl hiển thị một thẻ đơn hàng F&B độc lập.
    /// Tuân thủ nguyên lý Component-Based: Chỉ nhận dữ liệu để vẽ UI và bắn Event ra ngoài.
    public partial class OrderCardView : UserControl
    {
        // Lưu trữ đơn hàng đang được bind vào thẻ này
        private StaffPendingOrderDto? _currentOrder;
        #region 1. Khai báo 5 Custom Events (Tín hiệu bắn ra ngoài)
        /// Bắn ra khi bấm nút "Thu Tiền Mặt"
        public event Action<StaffPendingOrderDto>? ConfirmCashClicked;

        /// Bắn ra khi bấm nút "Bắt Đầu Nấu"
        public event Action<StaffPendingOrderDto>? StartPreparingClicked;

        /// Bắn ra khi bấm nút "Giao Món"
        public event Action<StaffPendingOrderDto>? DeliverClicked;

        /// Bắn ra khi bấm nút "Hoàn Tất"
        public event Action<StaffPendingOrderDto>? CompleteClicked;

        /// Bắn ra khi bấm nút "Hủy Đơn"
        public event Action<StaffPendingOrderDto>? CancelClicked;

        #endregion
        /// Truy xuất dữ liệu đơn hàng hiện tại của thẻ
        public StaffPendingOrderDto? CurrentOrder => _currentOrder;

        public OrderCardView()
        {
            InitializeComponent();
            RegisterButtonClicks();
        }
        
        /// Gắn các sự kiện click chuột nội bộ của 5 nút bấm
        private void RegisterButtonClicks()
        {
            btnConfirmCash.Click += (s, e) =>
            {
                if (_currentOrder != null) ConfirmCashClicked?.Invoke(_currentOrder);
            };
            btnStartPreparing.Click += (s, e) =>
            {
                if (_currentOrder != null) StartPreparingClicked?.Invoke(_currentOrder);
            };
            btnDeliver.Click += (s, e) =>
            {
                if (_currentOrder != null) DeliverClicked?.Invoke(_currentOrder);
            };
            btnComplete.Click += (s, e) =>
            {
                if (_currentOrder != null) CompleteClicked?.Invoke(_currentOrder);
            };
            btnCancel.Click += (s, e) =>
            {
                if (_currentOrder != null) CancelClicked?.Invoke(_currentOrder);
            };
        }
        
        /// Nạp và hiển thị dữ liệu của một đơn hàng lên thẻ.
        /// Đảm bảo UI Thread Safety (InvokeRequired)        
        /// <param name="order">Đối tượng DTO của đơn hàng cần hiển thị</param>
        public void BindData(StaffPendingOrderDto order)
        {
            // Kiểm tra an toàn luồng giao diện WinForms
            if (InvokeRequired)
            {
                Invoke(new Action<StaffPendingOrderDto>(BindData), order);
                return;
            }
            _currentOrder = order ?? throw new ArgumentNullException(nameof(order));
            // 1. Header và thông tin chung
            lblOrderId.Text = $"ĐƠN #{order.OrderId}";
            lblCustomerName.Text = $"Khách: {order.CustomerName}";
            lblCreatedAt.Text = order.CreatedAt.ToString("HH:mm - dd/MM");

            // Tính tổng tiền gốc (chưa giảm)
            decimal itemsSubtotal = order.Items?.Sum(i => i.Subtotal > 0 ? i.Subtotal : i.Price * i.Quantity) ?? 0;

            // Nếu có giảm giá VIP/Combo
            if (itemsSubtotal > order.TotalAmount && order.TotalAmount > 0)
            {
                decimal discount = itemsSubtotal - order.TotalAmount;
                lblTotalLabel.Text = $"Gốc: {itemsSubtotal:N0}đ\n(Giảm: -{discount:N0}đ)";
                lblTotalAmount.Text = order.FormattedTotalAmount;
            }
            else
            {
                lblTotalLabel.Text = "Tổng tiền:";
                lblTotalAmount.Text = order.FormattedTotalAmount;
            }
            
            // 2. Trạng thái đơn hàng 
            badgeStatus.Text = order.StatusDisplayName;
            badgeStatus.State = order.Status switch
            {
                "PENDING" => AntdUI.TState.Warn,          // Vàng cam: Đang chờ tiếp nhận
                "PREPARING" => AntdUI.TState.Processing,  // Xanh dương: Đang nấu trong bếp
                "DELIVERED" => AntdUI.TState.Primary,     // Xanh tím: Đã mang ra bàn
                "COMPLETED" => AntdUI.TState.Success,     // Xanh lá: Hoàn tất trọn vẹn
                "CANCELLED" => AntdUI.TState.Error,       // Đỏ: Đã hủy
                _ => AntdUI.TState.Default
            };
            // 3. Trạng thái thanh toán 
            badgePayment.Text = order.PaymentStatusDisplayName;
            badgePayment.State = order.PaymentStatus switch
            {
                "PAID" => AntdUI.TState.Success,          // Xanh lá: Đã thanh toán
                "UNPAID" => AntdUI.TState.Error,          // Đỏ: Chờ thu tiền mặt
                _ => AntdUI.TState.Default
            };
            // 4. Danh sách món ăn chi tiết 
            if (order.Items != null && order.Items.Count > 0)
            {
                txtItemsSummary.Text = string.Join(Environment.NewLine,
                    order.Items.Select(i => $"• {i.Quantity}x {i.ItemName} ({i.FormattedPrice})"));
            }
            else
            {
                txtItemsSummary.Text = string.IsNullOrWhiteSpace(order.ItemsSummary)
                    ? "• Không có thông tin món"
                    : order.ItemsSummary;
            }
            // 5. Ẩn / Hiện 5 nút thao tác theo 5 biến Can.. của DTO
            btnConfirmCash.Visible = order.CanConfirmCash;
            btnStartPreparing.Visible = order.CanStartPreparing;
            btnDeliver.Visible = order.CanDeliver;
            btnComplete.Visible = order.CanComplete;
            btnCancel.Visible = order.CanCancel;
        }
    }
}
