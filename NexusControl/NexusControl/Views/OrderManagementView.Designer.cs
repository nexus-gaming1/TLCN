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
            lblOrderCount = new AntdUI.Label();
            btnRefresh = new AntdUI.Button();
            txtSearch = new AntdUI.Input();
            segmentedFilter = new AntdUI.Segmented();
            pnlBody = new Panel();
            lblEmpty = new AntdUI.Label();
            flowLayoutPanelOrders = new FlowLayoutPanel();
            pnlToolbar.SuspendLayout();
            pnlBody.SuspendLayout();
            SuspendLayout();
            // 
            // pnlToolbar
            // 
            pnlToolbar.Back = Color.White;
            pnlToolbar.BorderColor = Color.FromArgb(226, 232, 240);
            pnlToolbar.BorderWidth = 1F;
            pnlToolbar.Controls.Add(lblOrderCount);
            pnlToolbar.Controls.Add(btnRefresh);
            pnlToolbar.Controls.Add(txtSearch);
            pnlToolbar.Controls.Add(segmentedFilter);
            pnlToolbar.Dock = DockStyle.Top;
            pnlToolbar.Location = new Point(0, 0);
            pnlToolbar.Margin = new Padding(3, 4, 3, 4);
            pnlToolbar.Name = "pnlToolbar";
            pnlToolbar.Padding = new Padding(18, 16, 18, 16);
            pnlToolbar.Radius = 0;
            pnlToolbar.Size = new Size(1257, 80);
            pnlToolbar.TabIndex = 0;
            // 
            // lblOrderCount
            // 
            lblOrderCount.Font = new Font("Segoe UI", 9F, FontStyle.Italic);
            lblOrderCount.ForeColor = Color.FromArgb(100, 116, 139);
            lblOrderCount.Location = new Point(906, 22);
            lblOrderCount.Margin = new Padding(3, 4, 3, 4);
            lblOrderCount.Name = "lblOrderCount";
            lblOrderCount.Size = new Size(222, 32);
            lblOrderCount.TabIndex = 3;
            lblOrderCount.Text = "Đang tải dữ liệu...";
            lblOrderCount.TextAlign = ContentAlignment.MiddleCenter;
            // 
            // btnRefresh
            // 
            btnRefresh.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnRefresh.Location = new Point(786, 16);
            btnRefresh.Margin = new Padding(3, 4, 3, 4);
            btnRefresh.Name = "btnRefresh";
            btnRefresh.Size = new Size(114, 48);
            btnRefresh.TabIndex = 2;
            btnRefresh.Text = "Làm Mới";
            btnRefresh.Type = AntdUI.TTypeMini.Primary;
            // 
            // txtSearch
            // 
            txtSearch.Font = new Font("Segoe UI", 9F);
            txtSearch.Location = new Point(478, 16);
            txtSearch.Margin = new Padding(3, 4, 3, 4);
            txtSearch.Name = "txtSearch";
            txtSearch.PlaceholderText = "Tìm theo mã đơn, tên khách hàng...";
            txtSearch.Size = new Size(297, 48);
            txtSearch.TabIndex = 1;
            // 
            // segmentedFilter
            // 
            segmentedFilter.Font = new Font("Segoe UI", 9F);
            segmentedFilter.Location = new Point(18, 16);
            segmentedFilter.Margin = new Padding(3, 4, 3, 4);
            segmentedFilter.Name = "segmentedFilter";
            segmentedFilter.Size = new Size(446, 48);
            segmentedFilter.TabIndex = 0;
            // 
            // pnlBody
            // 
            pnlBody.Controls.Add(lblEmpty);
            pnlBody.Controls.Add(flowLayoutPanelOrders);
            pnlBody.Dock = DockStyle.Fill;
            pnlBody.Location = new Point(0, 80);
            pnlBody.Margin = new Padding(3, 4, 3, 4);
            pnlBody.Name = "pnlBody";
            pnlBody.Size = new Size(1257, 853);
            pnlBody.TabIndex = 1;
            // 
            // lblEmpty
            // 
            lblEmpty.BackColor = Color.Transparent;
            lblEmpty.Dock = DockStyle.Fill;
            lblEmpty.Font = new Font("Segoe UI", 12F);
            lblEmpty.ForeColor = Color.FromArgb(148, 163, 184);
            lblEmpty.Location = new Point(0, 0);
            lblEmpty.Margin = new Padding(3, 4, 3, 4);
            lblEmpty.Name = "lblEmpty";
            lblEmpty.Size = new Size(1257, 853);
            lblEmpty.TabIndex = 1;
            lblEmpty.Text = "Hiện không có đơn hàng nào cần xử lý.";
            lblEmpty.TextAlign = ContentAlignment.MiddleCenter;
            lblEmpty.Visible = false;
            // 
            // flowLayoutPanelOrders
            // 
            flowLayoutPanelOrders.AutoScroll = true;
            flowLayoutPanelOrders.BackColor = Color.FromArgb(241, 245, 249);
            flowLayoutPanelOrders.Dock = DockStyle.Fill;
            flowLayoutPanelOrders.Location = new Point(0, 0);
            flowLayoutPanelOrders.Margin = new Padding(3, 4, 3, 4);
            flowLayoutPanelOrders.Name = "flowLayoutPanelOrders";
            flowLayoutPanelOrders.Padding = new Padding(14, 16, 14, 16);
            flowLayoutPanelOrders.Size = new Size(1257, 853);
            flowLayoutPanelOrders.TabIndex = 0;
            // 
            // OrderManagementView
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = Color.FromArgb(241, 245, 249);
            Controls.Add(pnlBody);
            Controls.Add(pnlToolbar);
            Margin = new Padding(3, 4, 3, 4);
            Name = "OrderManagementView";
            Size = new Size(1257, 933);
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