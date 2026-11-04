using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using System.Linq;
using System.Threading.Tasks;
using NexusControl.Models;
using NexusControl.Services;

namespace NexusControl.Views
{
    /// UserControl Quản lý danh sách đơn hàng F&B
    /// Đóng vai trò là Controller: Điều phối dữ liệu, lắng nghe các thẻ con và gọi API
    public partial class OrderManagementView : UserControl
    {
        /// Bộ nhớ đệm lưu danh sách đơn hàng lấy từ server về
        private List<StaffPendingOrderDto> _allOrders = new();
        public OrderManagementView()
        {
            InitializeComponent();
            SetupSegmentedTabs();
            RegisterToolbarEvents();
        }
        
        /// Khởi tạo 3 tab lọc trạng thái cho AntdUI.Segmented        
        private void SetupSegmentedTabs()
        {
            segmentedFilter.Items.Add(new AntdUI.SegmentedItem { Text = "Tất cả đơn chờ" });
            segmentedFilter.Items.Add(new AntdUI.SegmentedItem { Text = "Chờ xử lý (Pending)" });
            segmentedFilter.Items.Add(new AntdUI.SegmentedItem { Text = "Đang nấu (Preparing)" });
            segmentedFilter.SelectIndex = 0;
        }
        
        /// Gắn sự kiện cho các điều khiển trên thanh Toolbar        
        private void RegisterToolbarEvents()
        {
            /// Khi chọn tab lọc khác nhau
            segmentedFilter.SelectIndexChanged += (sender, e) =>
            {
                ApplyFilterAndRender();
            };
            /// Khi gõ từ khóa tìm kiếm
            txtSearch.TextChanged += (sender, e) =>
            {
                ApplyFilterAndRender();
            };
            /// Khi bấm nút "Làm mới" thủ công
            btnRefresh.Click += async (sender, e) =>
            {
                await LoadOrdersAsync();
            };
        }
        
        /// Tự động nạp dữ liệu khi màn hình được hiển thị lần đầu        
        protected override async void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            // Kiểm tra không chạy 
            if (!DesignMode)
            {
                await LoadOrdersAsync();
            }
        }
        
        /// Gọi API lấy toàn bộ đơn hàng F&B đang chờ xử lý từ Backend.
        /// Đảm bảo UI Thread Safety và hiệu ứng Loading trên nút bấm.
        
        public async Task LoadOrdersAsync()
        {
            if (InvokeRequired)
            {
                Invoke(new Func<Task>(LoadOrdersAsync));
                return;
            }
            try
            {
                /// Bật trạng thái Loading trên nút bấm
                btnRefresh.Loading = true;
                btnRefresh.Enabled = false;
                /// Gọi Domain Service lấy danh sách
                var response = await OrderStaffService.Instance.GetPendingOrdersAsync();
                if (response.IsSuccess && response.Data != null)
                {
                    _allOrders = response.Data;
                    ApplyFilterAndRender();
                }
                else
                {
                    var parentForm = this.FindForm() ?? Form.ActiveForm;
                    if (parentForm != null)
                    {
                        AntdUI.Message.error(parentForm, response.Message ?? "Không thể lấy danh sách đơn hàng.");
                    }
                }
            }
            catch (Exception ex)
            {
                var parentForm = this.FindForm() ?? Form.ActiveForm;
                if (parentForm != null)
                {
                    AntdUI.Message.error(parentForm, $"Lỗi kết nối: {ex.Message}");
                }
            }
            finally
            {
                // Phục hồi nút bấm
                btnRefresh.Loading = false;
                btnRefresh.Enabled = true;
            }
        }
        
        /// Lọc dữ liệu client-side và render các thẻ OrderCardView lên FlowLayoutPanel.
        /// Sử dụng SuspendLayout/ResumeLayout để chống giật lag và giải phóng RAM triệt để.
        
        private void ApplyFilterAndRender()
        {
            if (InvokeRequired)
            {
                Invoke(new Action(ApplyFilterAndRender));
                return;
            }
            // Tạm dừng tính toán vẽ lại của FlowLayoutPanel để chống giật lag
            flowLayoutPanelOrders.SuspendLayout();
            try
            {
                // 1. Dọn dẹp các thẻ cũ: Gỡ bỏ Event Handler để chống rò rỉ bộ nhớ (Memory Leak)
                foreach (Control ctrl in flowLayoutPanelOrders.Controls)
                {
                    if (ctrl is OrderCardView oldCard)
                    {
                        oldCard.ConfirmCashClicked -= OnCardConfirmCashClicked;
                        oldCard.StartPreparingClicked -= OnCardStartPreparingClicked;
                        oldCard.DeliverClicked -= OnCardDeliverClicked;
                        oldCard.CompleteClicked -= OnCardCompleteClicked;
                        oldCard.CancelClicked -= OnCardCancelClicked;
                    }
                    ctrl.Dispose();
                }
                flowLayoutPanelOrders.Controls.Clear();
                /// 2. Lọc theo Tab Segmented
                IEnumerable<StaffPendingOrderDto> filtered = _allOrders;
                switch (segmentedFilter.SelectIndex)
                {
                    case 1: // Chỉ lấy đơn PENDING
                        filtered = filtered.Where(o => o.Status == "PENDING");
                        break;
                    case 2: // Chỉ lấy đơn PREPARING
                        filtered = filtered.Where(o => o.Status == "PREPARING");
                        break;
                    default: // Tất cả đơn chờ
                        break;
                }
                /// 3. Lọc theo từ khóa tìm kiếm (mã đơn hoặc tên khách hàng)
                string keyword = txtSearch.Text?.Trim() ?? string.Empty;
                if (!string.IsNullOrEmpty(keyword))
                {
                    filtered = filtered.Where(o =>
                        o.OrderId.ToString().Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                        o.CustomerName.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                        o.ItemsSummary.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                    );
                }
                var listToRender = filtered.ToList();
                lblOrderCount.Text = $"Đang hiển thị: {listToRender.Count} đơn";
                /// 4. Kiểm tra danh sách rỗng 
                if (listToRender.Count == 0)
                {
                    lblEmpty.Visible = true;
                    lblEmpty.BringToFront();
                    return;
                }
                lblEmpty.Visible = false;
                /// 5. Khởi tạo từng thẻ OrderCardView và đăng ký lắng nghe sự kiện
                foreach (var order in listToRender)
                {
                    var card = new OrderCardView();
                    card.BindData(order);
                    /// Lắng nghe 5 sự kiện từ thẻ bắn ra
                    card.ConfirmCashClicked += OnCardConfirmCashClicked;
                    card.StartPreparingClicked += OnCardStartPreparingClicked;
                    card.DeliverClicked += OnCardDeliverClicked;
                    card.CompleteClicked += OnCardCompleteClicked;
                    card.CancelClicked += OnCardCancelClicked;
                    flowLayoutPanelOrders.Controls.Add(card);
                }
            }
            finally
            {
                /// Hoàn tất và vẽ lại một lần duy nhất
                flowLayoutPanelOrders.ResumeLayout(true);
            }
        }
        #region 2. Xử lý các Sự kiện bấm nút trên Thẻ (Action Handlers)
        
        /// Xử lý khi nhân viên bấm "Thu Tiền Mặt" trên một thẻ        
        private async void OnCardConfirmCashClicked(StaffPendingOrderDto order)
        {
            var parentForm = this.FindForm() ?? Form.ActiveForm;
            try
            {
                var response = await OrderStaffService.Instance.ConfirmCashPaymentAsync(order.OrderId);
                if (response.IsSuccess)
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.success(parentForm,
                            $"Thu tiền thành công đơn #{order.OrderId}! Đơn đã được chuyển vào bếp.");
                    }
                    await LoadOrdersAsync(); // Tải lại danh sách
                }
                else
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.error(parentForm, response.Message ?? "Xác nhận thu tiền thất bại.");
                    }
                }
            }
            catch (Exception ex)
            {
                if (parentForm != null)
                {
                    AntdUI.Message.error(parentForm, $"Lỗi: {ex.Message}");
                }
            }
        }
        
        /// Xử lý khi nhân viên bấm  bắt đầu nấu (chuyển sang PREPARING)       
        private async void OnCardStartPreparingClicked(StaffPendingOrderDto order)
        {
            var parentForm = this.FindForm() ?? Form.ActiveForm;
            try
            {
                var response = await OrderStaffService.Instance.UpdateOrderStatusAsync(order.OrderId, "PREPARING");
                if (response.IsSuccess)
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.success(parentForm, $"Đơn #{order.OrderId} đã bắt đầu chế biến.");
                    }
                    await LoadOrdersAsync();
                }
                else
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.error(parentForm, response.Message ?? "Không thể chuyển trạng thái nấu.");
                    }
                }
            }
            catch (Exception ex)
            {
                if (parentForm != null)
                {
                    AntdUI.Message.error(parentForm, $"Lỗi: {ex.Message}");
                }
            }
        }
        
        /// Xử lý khi nhân viên bấm Giao Món (chuyển sang DELIVERED)        
        private async void OnCardDeliverClicked(StaffPendingOrderDto order)
        {
            var parentForm = this.FindForm() ?? Form.ActiveForm;
            try
            {
                var response = await OrderStaffService.Instance.UpdateOrderStatusAsync(order.OrderId, "DELIVERED");
                if (response.IsSuccess)
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.success(parentForm, $"Đơn #{order.OrderId} đã mang ra giao cho khách.");
                    }
                    await LoadOrdersAsync();
                }
                else
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.error(parentForm, response.Message ?? "Không thể chuyển trạng thái giao món.");
                    }
                }
            }
            catch (Exception ex)
            {
                if (parentForm != null)
                {
                    AntdUI.Message.error(parentForm, $"Lỗi: {ex.Message}");
                }
            }
        }
        
        /// Xử lý khi nhân viên bấm "Hoàn Tất" (chuyển sang COMPLETED)
        private async void OnCardCompleteClicked(StaffPendingOrderDto order)
        {
            var parentForm = this.FindForm() ?? Form.ActiveForm;
            try
            {
                var response = await OrderStaffService.Instance.UpdateOrderStatusAsync(order.OrderId, "COMPLETED");
                if (response.IsSuccess)
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.success(parentForm, $"Đã hoàn tất trọn vẹn đơn hàng #{order.OrderId}!");
                    }
                    await LoadOrdersAsync();
                }
                else
                {
                    if (parentForm != null)
                    {
                        AntdUI.Message.error(parentForm, response.Message ?? "Không thể hoàn tất đơn hàng.");
                    }
                }
            }
            catch (Exception ex)
            {
                if (parentForm != null)
                {
                    AntdUI.Message.error(parentForm, $"Lỗi: {ex.Message}");
                }
            }
        }
        
        /// Xử lý khi bấm "Hủy Đơn": Mở Modal AntdUI với TextBox nhập lý do hủy.
        /// Sử dụng delegate OnOkAsync để tự động bật Spinner Loading trên nút xác nhận.
        private void OnCardCancelClicked(StaffPendingOrderDto order)
        {
            var parentForm = this.FindForm() ?? Form.ActiveForm;
            ///1. Tạo giao diện nội dung bên trong Modal
            var pnlModalContent = new Panel
            {
                Size = new Size(380, 115),
                BackColor = Color.Transparent
            };
            var lblPrompt = new AntdUI.Label
            {
                Text = "Vui lòng nhập lý do hủy đơn (hết nguyên liệu, đổi ý...):",
                Location = new Point(0, 0),
                Size = new Size(380, 22),
                Font = new Font("Segoe UI", 9F, FontStyle.Regular),
                ForeColor = Color.FromArgb(71, 85, 105)
            };
            var txtReason = new AntdUI.Input
            {
                Multiline = true,
                PlaceholderText = "Nhập lý do cụ thể tại đây (bắt buộc)...",
                Location = new Point(0, 26),
                Size = new Size(380, 80),
                Radius = 6,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Regular)
            };
            pnlModalContent.Controls.Add(lblPrompt);
            pnlModalContent.Controls.Add(txtReason);
            ///2. Thiết lập cấu hình AntdUI.Modal.Config chuẩn
            var config = new AntdUI.Modal.Config(parentForm, $"Xác nhận hủy đơn hàng #{order.OrderId}", pnlModalContent)
            {
                OkText = "Xác Nhận Hủy",
                CancelText = "Bỏ Qua",
                OkType = AntdUI.TTypeMini.Error, /// Nút đỏ cảnh báo
                Width = 430,
                ///Delegate OnOkAsync: Chạy bất đồng bộ, tự động bật hiệu ứng Loading trên nút OK
                OnOkAsync = async (cfg) =>
                {
                    string reason = txtReason.Text.Trim();
                    ///Kiểm tra validation đầu vào
                    if (string.IsNullOrWhiteSpace(reason))
                    {
                        if (parentForm != null)
                        {
                            AntdUI.Message.warn(parentForm, "Vui lòng không để trống lý do hủy đơn!");
                        }
                        return false; ///Giữ nguyên Modal không cho đóng
                    }
                    /// Gọi API hủy đơn và hoàn tiền/kho
                    var cancelResult = await OrderStaffService.Instance.CancelOrderAsync(order.OrderId, reason);
                    if (!cancelResult.IsSuccess)
                    {
                        if (parentForm != null)
                        {
                            AntdUI.Message.error(parentForm, cancelResult.Message ?? "Hủy đơn hàng thất bại.");
                        }
                        return false; ///Giữ Modal lại để nhân viên đọc lỗi
                    }
                    ///Thông báo thành công
                    if (parentForm != null)
                    {
                        AntdUI.Message.success(parentForm, $"Đã hủy đơn #{order.OrderId} thành công!");
                    }
                    ///Nạp lại danh sách đơn hàng
                    _ = LoadOrdersAsync();
                    return true; ///Đóng Modal thành công
                }
            };
            ///3. Mở Modal
            AntdUI.Modal.open(config);
        }
        #endregion
    }
}
