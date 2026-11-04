using System.Drawing;
using System.Windows.Forms;

namespace NexusControl.Views
{
    partial class OrderCardView
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
            pnlCard = new AntdUI.Panel();
            lblOrderId = new AntdUI.Label();
            lblCreatedAt = new AntdUI.Label();
            lblCustomerName = new AntdUI.Label();
            flowBadges = new FlowLayoutPanel();
            badgeStatus = new AntdUI.Badge();
            badgePayment = new AntdUI.Badge();
            dividerTop = new AntdUI.Divider();
            lblItemsTitle = new AntdUI.Label();
            txtItemsSummary = new AntdUI.Label();
            dividerBottom = new AntdUI.Divider();
            pnlFooter = new Panel();
            lblTotalLabel = new AntdUI.Label();
            lblTotalAmount = new AntdUI.Label();
            flowButtons = new FlowLayoutPanel();
            btnConfirmCash = new AntdUI.Button();
            btnStartPreparing = new AntdUI.Button();
            btnDeliver = new AntdUI.Button();
            btnComplete = new AntdUI.Button();
            btnCancel = new AntdUI.Button();

            pnlCard.SuspendLayout();
            flowBadges.SuspendLayout();
            pnlFooter.SuspendLayout();
            flowButtons.SuspendLayout();
            SuspendLayout();

            
            // pnlCard (Khung bo góc chứa toàn bộ thẻ)
            pnlCard.Back = Color.White;
            pnlCard.BorderColor = Color.FromArgb(226, 232, 240); // Viền xám sáng
            pnlCard.BorderWidth = 1F;
            pnlCard.Controls.Add(flowButtons);
            pnlCard.Controls.Add(pnlFooter);
            pnlCard.Controls.Add(dividerBottom);
            pnlCard.Controls.Add(txtItemsSummary);
            pnlCard.Controls.Add(lblItemsTitle);
            pnlCard.Controls.Add(dividerTop);
            pnlCard.Controls.Add(flowBadges);
            pnlCard.Controls.Add(lblCustomerName);
            pnlCard.Controls.Add(lblCreatedAt);
            pnlCard.Controls.Add(lblOrderId);
            pnlCard.Dock = DockStyle.Fill;
            pnlCard.Location = new Point(0, 0);
            pnlCard.Margin = new Padding(0);
            pnlCard.Name = "pnlCard";
            pnlCard.Padding = new Padding(14);
            pnlCard.Radius = 12;
            pnlCard.Shadow = 3;
            pnlCard.ShadowColor = Color.FromArgb(20, 0, 0, 0);
            pnlCard.Size = new Size(330, 360);
            pnlCard.TabIndex = 0;

            
            // lblOrderId (Mã đơn hàng to, nổi bật)            
            lblOrderId.Font = new Font("Segoe UI", 12.5F, FontStyle.Bold);
            lblOrderId.ForeColor = Color.FromArgb(30, 41, 59);
            lblOrderId.Location = new Point(14, 12);
            lblOrderId.Name = "lblOrderId";
            lblOrderId.Size = new Size(160, 24);
            lblOrderId.TabIndex = 0;
            lblOrderId.Text = "ĐƠN #000";

            
            // lblCreatedAt (Thời gian tạo đơn) 
            lblCreatedAt.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            lblCreatedAt.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblCreatedAt.ForeColor = Color.FromArgb(148, 163, 184);
            lblCreatedAt.Location = new Point(174, 14);
            lblCreatedAt.Name = "lblCreatedAt";
            lblCreatedAt.Size = new Size(142, 20);
            lblCreatedAt.TabIndex = 1;
            lblCreatedAt.Text = "00:00 - 01/01";
            lblCreatedAt.TextAlign = ContentAlignment.TopRight;

            
            // lblCustomerName (Tên khách hàng / Số máy)            
            lblCustomerName.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            lblCustomerName.ForeColor = Color.FromArgb(71, 85, 105);
            lblCustomerName.Location = new Point(14, 38);
            lblCustomerName.Name = "lblCustomerName";
            lblCustomerName.Size = new Size(302, 20);
            lblCustomerName.TabIndex = 2;
            lblCustomerName.Text = "Khách: Đang tải...";

            
            // flowBadges (Hàng chứa 2 Badge trạng thái)            
            flowBadges.BackColor = Color.Transparent;
            flowBadges.Controls.Add(badgeStatus);
            flowBadges.Controls.Add(badgePayment);
            flowBadges.Location = new Point(14, 62);
            flowBadges.Margin = new Padding(0);
            flowBadges.Name = "flowBadges";
            flowBadges.Size = new Size(302, 26);
            flowBadges.TabIndex = 3;

            
            // badgeStatus (Badge trạng thái đơn)            
            badgeStatus.AutoSize = true;
            badgeStatus.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            badgeStatus.Location = new Point(0, 2);
            badgeStatus.Margin = new Padding(0, 2, 8, 0);
            badgeStatus.Name = "badgeStatus";
            badgeStatus.Size = new Size(70, 20);
            badgeStatus.State = AntdUI.TState.Processing;
            badgeStatus.TabIndex = 0;
            badgeStatus.Text = "Chờ Xử Lý";

            
            // badgePayment (Badge trạng thái thanh toán)            
            badgePayment.AutoSize = true;
            badgePayment.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            badgePayment.Location = new Point(78, 2);
            badgePayment.Margin = new Padding(0, 2, 0, 0);
            badgePayment.Name = "badgePayment";
            badgePayment.Size = new Size(95, 20);
            badgePayment.State = AntdUI.TState.Warn;
            badgePayment.TabIndex = 1;
            badgePayment.Text = "Chờ Thu Tiền";

            
            // dividerTop (Đường phân cách trên)            
            dividerTop.Location = new Point(14, 90);
            dividerTop.Margin = new Padding(0);
            dividerTop.Name = "dividerTop";
            dividerTop.Size = new Size(302, 10);
            dividerTop.TabIndex = 4;

            
            // lblItemsTitle (Tiêu đề danh sách món)            
            lblItemsTitle.Font = new Font("Segoe UI", 8F, FontStyle.Italic);
            lblItemsTitle.ForeColor = Color.FromArgb(148, 163, 184);
            lblItemsTitle.Location = new Point(14, 102);
            lblItemsTitle.Name = "lblItemsTitle";
            lblItemsTitle.Size = new Size(302, 16);
            lblItemsTitle.TabIndex = 5;
            lblItemsTitle.Text = "Chi tiết món đã đặt:";

            
            // txtItemsSummary (Vùng in danh sách món nhiều dòng)            
            txtItemsSummary.AutoEllipsis = true;
            txtItemsSummary.Font = new Font("Segoe UI", 9.25F, FontStyle.Regular);
            txtItemsSummary.ForeColor = Color.FromArgb(15, 23, 42);
            txtItemsSummary.Location = new Point(14, 120);
            txtItemsSummary.Name = "txtItemsSummary";
            txtItemsSummary.Size = new Size(302, 110);
            txtItemsSummary.TabIndex = 6;
            txtItemsSummary.Text = "• Đang cập nhật...";

            
            // dividerBottom (Đường phân cách dưới)            
            dividerBottom.Location = new Point(14, 234);
            dividerBottom.Margin = new Padding(0);
            dividerBottom.Name = "dividerBottom";
            dividerBottom.Size = new Size(302, 10);
            dividerBottom.TabIndex = 7;

            
            // pnlFooter (Hàng hiển thị tổng tiền)            
            pnlFooter.BackColor = Color.Transparent;
            pnlFooter.Controls.Add(lblTotalLabel);
            pnlFooter.Controls.Add(lblTotalAmount);
            pnlFooter.Location = new Point(14, 246);
            pnlFooter.Margin = new Padding(0);
            pnlFooter.Name = "pnlFooter";
            pnlFooter.Size = new Size(302, 30);
            pnlFooter.TabIndex = 8;

            
            // lblTotalLabel (Chữ Tổng tiền)            
            lblTotalLabel.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            lblTotalLabel.ForeColor = Color.FromArgb(100, 116, 139);
            lblTotalLabel.Location = new Point(0, 4);
            lblTotalLabel.Name = "lblTotalLabel";
            lblTotalLabel.Size = new Size(70, 22);
            lblTotalLabel.TabIndex = 0;
            lblTotalLabel.Text = "Tổng tiền:";

            
            // lblTotalAmount (Số tiền đỏ nổi bật)            
            lblTotalAmount.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            lblTotalAmount.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblTotalAmount.ForeColor = Color.FromArgb(220, 38, 38); // Màu đỏ 
            lblTotalAmount.Location = new Point(74, 2);
            lblTotalAmount.Name = "lblTotalAmount";
            lblTotalAmount.Size = new Size(228, 26);
            lblTotalAmount.TabIndex = 1;
            lblTotalAmount.Text = "0 ₫";
            lblTotalAmount.TextAlign = ContentAlignment.MiddleRight;

            
            // flowButtons (Hàng chứa 5 nút hành động ở chân thẻ)            
            flowButtons.BackColor = Color.Transparent;
            flowButtons.Controls.Add(btnConfirmCash);
            flowButtons.Controls.Add(btnStartPreparing);
            flowButtons.Controls.Add(btnDeliver);
            flowButtons.Controls.Add(btnComplete);
            flowButtons.Controls.Add(btnCancel);
            flowButtons.FlowDirection = FlowDirection.RightToLeft;
            flowButtons.Location = new Point(14, 282);
            flowButtons.Margin = new Padding(0);
            flowButtons.Name = "flowButtons";
            flowButtons.Size = new Size(302, 64);
            flowButtons.TabIndex = 9;

            // 
            // btnConfirmCash (Nút Thu Tiền Mặt - Primary)
            // 
            btnConfirmCash.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnConfirmCash.Location = new Point(190, 2);
            btnConfirmCash.Margin = new Padding(4, 2, 0, 4);
            btnConfirmCash.Name = "btnConfirmCash";
            btnConfirmCash.Radius = 6;
            btnConfirmCash.Size = new Size(112, 34);
            btnConfirmCash.TabIndex = 0;
            btnConfirmCash.Text = "Thu Tiền Mặt";
            btnConfirmCash.Type = AntdUI.TTypeMini.Primary;
            btnConfirmCash.Visible = false;

            // 
            // btnStartPreparing (Nút Vào Bếp / Bắt Đầu Nấu)
            // 
            btnStartPreparing.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnStartPreparing.Location = new Point(74, 2);
            btnStartPreparing.Margin = new Padding(4, 2, 0, 4);
            btnStartPreparing.Name = "btnStartPreparing";
            btnStartPreparing.Radius = 6;
            btnStartPreparing.Size = new Size(112, 34);
            btnStartPreparing.TabIndex = 1;
            btnStartPreparing.Text = "Bắt Đầu Nấu";
            btnStartPreparing.Type = AntdUI.TTypeMini.Primary;
            btnStartPreparing.Visible = false;

            // 
            // btnDeliver (Nút Giao Món Cho Khách)
            // 
            btnDeliver.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnDeliver.Location = new Point(190, 42);
            btnDeliver.Margin = new Padding(4, 2, 0, 4);
            btnDeliver.Name = "btnDeliver";
            btnDeliver.Radius = 6;
            btnDeliver.Size = new Size(112, 34);
            btnDeliver.TabIndex = 2;
            btnDeliver.Text = "Giao Món";
            btnDeliver.Type = AntdUI.TTypeMini.Success;
            btnDeliver.Visible = false;

            // 
            // btnComplete (Nút Hoàn Tất Đơn)
            // 
            btnComplete.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnComplete.Location = new Point(74, 42);
            btnComplete.Margin = new Padding(4, 2, 0, 4);
            btnComplete.Name = "btnComplete";
            btnComplete.Radius = 6;
            btnComplete.Size = new Size(112, 34);
            btnComplete.TabIndex = 3;
            btnComplete.Text = "Hoàn Tất";
            btnComplete.Type = AntdUI.TTypeMini.Primary;
            btnComplete.Visible = false;

            // 
            // btnCancel (Nút Hủy Đơn - Đỏ Warning)
            // 
            btnCancel.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            btnCancel.ForeColor = Color.FromArgb(239, 68, 68);
            btnCancel.Location = new Point(196, 2);
            btnCancel.Margin = new Padding(0, 2, 4, 4);
            btnCancel.Name = "btnCancel";
            btnCancel.Radius = 6;
            btnCancel.Size = new Size(82, 34);
            btnCancel.TabIndex = 4;
            btnCancel.Text = "Hủy Đơn";
            btnCancel.Type = AntdUI.TTypeMini.Error;
            btnCancel.Visible = false;

            // 
            // OrderCardView
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = Color.Transparent;
            Controls.Add(pnlCard);
            Margin = new Padding(10);
            Name = "OrderCardView";
            Size = new Size(330, 360);
            pnlCard.ResumeLayout(false);
            flowBadges.ResumeLayout(false);
            flowBadges.PerformLayout();
            pnlFooter.ResumeLayout(false);
            flowButtons.ResumeLayout(false);
            ResumeLayout(false);
        }

        #endregion

        private AntdUI.Panel pnlCard;
        private AntdUI.Label lblOrderId;
        private AntdUI.Label lblCreatedAt;
        private AntdUI.Label lblCustomerName;
        private FlowLayoutPanel flowBadges;
        private AntdUI.Badge badgeStatus;
        private AntdUI.Badge badgePayment;
        private AntdUI.Divider dividerTop;
        private AntdUI.Label lblItemsTitle;
        private AntdUI.Label txtItemsSummary;
        private AntdUI.Divider dividerBottom;
        private Panel pnlFooter;
        private AntdUI.Label lblTotalLabel;
        private AntdUI.Label lblTotalAmount;
        private FlowLayoutPanel flowButtons;
        private AntdUI.Button btnConfirmCash;
        private AntdUI.Button btnStartPreparing;
        private AntdUI.Button btnDeliver;
        private AntdUI.Button btnComplete;
        private AntdUI.Button btnCancel;
    }
}