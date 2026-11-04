using System.Drawing;
using System.Windows.Forms;

namespace NexusControl.Views
{
    partial class OrderManagementView
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code

        private void InitializeComponent()
        {
            pnlToolbar = new AntdUI.Panel();
            segmentedFilter = new AntdUI.Segmented();
            txtSearch = new AntdUI.Input();
            btnRefresh = new AntdUI.Button();
            lblOrderCount = new AntdUI.Label();
            pnlBody = new Panel();
            flowLayoutPanelOrders = new FlowLayoutPanel();
            lblEmpty = new AntdUI.Label();

            pnlToolbar.SuspendLayout();
            pnlBody.SuspendLayout();
            SuspendLayout();

            
            //pnlToolbar (Thanh công cụ trên cùng)            
            pnlToolbar.Back = Color.White;
            pnlToolbar.BorderColor = Color.FromArgb(226, 232, 240);
            pnlToolbar.BorderWidth = 1F;
            pnlToolbar.Controls.Add(lblOrderCount);
            pnlToolbar.Controls.Add(btnRefresh);
            pnlToolbar.Controls.Add(txtSearch);
            pnlToolbar.Controls.Add(segmentedFilter);
            pnlToolbar.Dock = DockStyle.Top;
            pnlToolbar.Location = new Point(0, 0);
            pnlToolbar.Name = "pnlToolbar";
            pnlToolbar.Padding = new Padding(16, 12, 16, 12);
            pnlToolbar.Radius = 0;
            pnlToolbar.Size = new Size(1100, 60);
            pnlToolbar.TabIndex = 0;

            
            //segmentedFilter (Chuyển tab lọc trạng thái)            
            segmentedFilter.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            segmentedFilter.Location = new Point(16, 12);
            segmentedFilter.Name = "segmentedFilter";
            segmentedFilter.Radius = 6;
            segmentedFilter.SelectIndex = 0;
            segmentedFilter.Size = new Size(390, 36);
            segmentedFilter.TabIndex = 0;

            
            //txtSearch (Ô tìm kiếm mã đơn hoặc tên khách)            
            txtSearch.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            txtSearch.Location = new Point(418, 12);
            txtSearch.Name = "txtSearch";
            txtSearch.PlaceholderText = "Tìm theo mã đơn, tên khách hàng...";
            txtSearch.Radius = 6;
            txtSearch.Size = new Size(260, 36);
            txtSearch.TabIndex = 1;

            
            //btnRefresh (Nút làm mới thủ công)            
            btnRefresh.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnRefresh.Location = new Point(688, 12);
            btnRefresh.Name = "btnRefresh";
            btnRefresh.Radius = 6;
            btnRefresh.Size = new Size(100, 36);
            btnRefresh.TabIndex = 2;
            btnRefresh.Text = "Làm Mới";
            btnRefresh.Type = AntdUI.TTypeMini.Primary;

            
            //lblOrderCount (Nhãn hiển thị số lượng đơn)            
            lblOrderCount.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            lblOrderCount.Font = new Font("Segoe UI", 9F, FontStyle.Italic);
            lblOrderCount.ForeColor = Color.FromArgb(100, 116, 139);
            lblOrderCount.Location = new Point(890, 18);
            lblOrderCount.Name = "lblOrderCount";
            lblOrderCount.Size = new Size(194, 24);
            lblOrderCount.TabIndex = 3;
            lblOrderCount.Text = "Đang tải dữ liệu...";
            lblOrderCount.TextAlign = ContentAlignment.MiddleRight;

            
            //pnlBody (Khung bao bọc phần thân chứa lưới thẻ)            
            pnlBody.Controls.Add(lblEmpty);
            pnlBody.Controls.Add(flowLayoutPanelOrders);
            pnlBody.Dock = DockStyle.Fill;
            pnlBody.Location = new Point(0, 60);
            pnlBody.Name = "pnlBody";
            pnlBody.Size = new Size(1100, 640);
            pnlBody.TabIndex = 1;

            
            //flowLayoutPanelOrders (Lưới chứa thẻ đơn hàng tự động cuộn)
            flowLayoutPanelOrders.AutoScroll = true;
            flowLayoutPanelOrders.BackColor = Color.FromArgb(241, 245, 249); //Nền xám 
            flowLayoutPanelOrders.Dock = DockStyle.Fill;
            flowLayoutPanelOrders.Location = new Point(0, 0);
            flowLayoutPanelOrders.Name = "flowLayoutPanelOrders";
            flowLayoutPanelOrders.Padding = new Padding(12);
            flowLayoutPanelOrders.Size = new Size(1100, 640);
            flowLayoutPanelOrders.TabIndex = 0;

            
            //lblEmpty (Thông báo khi không có đơn hàng)            
            lblEmpty.BackColor = Color.Transparent;
            lblEmpty.Dock = DockStyle.Fill;
            lblEmpty.Font = new Font("Segoe UI", 12F, FontStyle.Regular);
            lblEmpty.ForeColor = Color.FromArgb(148, 163, 184);
            lblEmpty.Location = new Point(0, 0);
            lblEmpty.Name = "lblEmpty";
            lblEmpty.Size = new Size(1100, 640);
            lblEmpty.TabIndex = 1;
            lblEmpty.Text = "Hiện không có đơn hàng nào cần xử lý.";
            lblEmpty.TextAlign = ContentAlignment.MiddleCenter;
            lblEmpty.Visible = false;

            
            //OrderManagementView            
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = Color.FromArgb(241, 245, 249);
            Controls.Add(pnlBody);
            Controls.Add(pnlToolbar);
            Name = "OrderManagementView";
            Size = new Size(1100, 700);
            pnlToolbar.ResumeLayout(false);
            pnlBody.ResumeLayout(false);
            ResumeLayout(false);
        }

        #endregion

        private AntdUI.Panel pnlToolbar;
        private AntdUI.Segmented segmentedFilter;
        private AntdUI.Input txtSearch;
        private AntdUI.Button btnRefresh;
        private AntdUI.Label lblOrderCount;
        private Panel pnlBody;
        private FlowLayoutPanel flowLayoutPanelOrders;
        private AntdUI.Label lblEmpty;
    }
}