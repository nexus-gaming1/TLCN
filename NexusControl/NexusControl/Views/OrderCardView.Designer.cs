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
            flowButtons = new FlowLayoutPanel();
            btnConfirmCash = new AntdUI.Button();
            btnStartPreparing = new AntdUI.Button();
            btnDeliver = new AntdUI.Button();
            btnComplete = new AntdUI.Button();
            btnCancel = new AntdUI.Button();
            pnlFooter = new Panel();
            lblTotalLabel = new AntdUI.Label();
            lblTotalAmount = new AntdUI.Label();
            dividerBottom = new AntdUI.Divider();
            txtItemsSummary = new AntdUI.Label();
            lblItemsTitle = new AntdUI.Label();
            dividerTop = new AntdUI.Divider();
            flowBadges = new FlowLayoutPanel();
            badgeStatus = new AntdUI.Badge();
            badgePayment = new AntdUI.Badge();
            lblCustomerName = new AntdUI.Label();
            lblCreatedAt = new AntdUI.Label();
            lblOrderId = new AntdUI.Label();
            pnlCard.SuspendLayout();
            flowButtons.SuspendLayout();
            pnlFooter.SuspendLayout();
            flowBadges.SuspendLayout();
            SuspendLayout();
            // 
            // pnlCard
            // 
            pnlCard.Back = Color.White;
            pnlCard.BorderColor = Color.FromArgb(226, 232, 240);
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
            pnlCard.Padding = new Padding(16, 19, 16, 19);
            pnlCard.Radius = 12;
            pnlCard.Shadow = 3;
            pnlCard.ShadowColor = Color.FromArgb(20, 0, 0, 0);
            pnlCard.Size = new Size(350, 480);
            pnlCard.TabIndex = 0;
            // 
            // flowButtons
            // 
            flowButtons.BackColor = Color.Transparent;
            flowButtons.Controls.Add(btnConfirmCash);
            flowButtons.Controls.Add(btnStartPreparing);
            flowButtons.Controls.Add(btnDeliver);
            flowButtons.Controls.Add(btnComplete);
            flowButtons.Controls.Add(btnCancel);
            flowButtons.FlowDirection = FlowDirection.RightToLeft;
            flowButtons.Location = new Point(11, 363);
            flowButtons.Margin = new Padding(0);
            flowButtons.Name = "flowButtons";
            flowButtons.Size = new Size(318, 103);
            flowButtons.TabIndex = 9;
            // 
            // btnConfirmCash
            // 
            btnConfirmCash.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnConfirmCash.Location = new Point(190, 3);
            btnConfirmCash.Margin = new Padding(5, 3, 0, 5);
            btnConfirmCash.Name = "btnConfirmCash";
            btnConfirmCash.Size = new Size(128, 45);
            btnConfirmCash.TabIndex = 0;
            btnConfirmCash.Text = "Thu Tiền Mặt";
            btnConfirmCash.Type = AntdUI.TTypeMini.Primary;
            btnConfirmCash.Visible = false;
            // 
            // btnStartPreparing
            // 
            btnStartPreparing.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnStartPreparing.Location = new Point(57, 3);
            btnStartPreparing.Margin = new Padding(5, 3, 0, 5);
            btnStartPreparing.Name = "btnStartPreparing";
            btnStartPreparing.Size = new Size(128, 45);
            btnStartPreparing.TabIndex = 1;
            btnStartPreparing.Text = "Bắt Đầu Nấu";
            btnStartPreparing.Type = AntdUI.TTypeMini.Primary;
            btnStartPreparing.Visible = false;
            // 
            // btnDeliver
            // 
            btnDeliver.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnDeliver.Location = new Point(190, 56);
            btnDeliver.Margin = new Padding(5, 3, 0, 5);
            btnDeliver.Name = "btnDeliver";
            btnDeliver.Size = new Size(128, 45);
            btnDeliver.TabIndex = 2;
            btnDeliver.Text = "Giao Món";
            btnDeliver.Type = AntdUI.TTypeMini.Success;
            btnDeliver.Visible = false;
            // 
            // btnComplete
            // 
            btnComplete.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnComplete.Location = new Point(57, 56);
            btnComplete.Margin = new Padding(5, 3, 0, 5);
            btnComplete.Name = "btnComplete";
            btnComplete.Size = new Size(128, 45);
            btnComplete.TabIndex = 3;
            btnComplete.Text = "Hoàn Tất";
            btnComplete.Type = AntdUI.TTypeMini.Primary;
            btnComplete.Visible = false;
            // 
            // btnCancel
            // 
            btnCancel.Font = new Font("Segoe UI", 8.5F);
            btnCancel.ForeColor = Color.White;
            btnCancel.Location = new Point(219, 109);
            btnCancel.Margin = new Padding(0, 3, 5, 5);
            btnCancel.Name = "btnCancel";
            btnCancel.Size = new Size(94, 45);
            btnCancel.TabIndex = 4;
            btnCancel.Text = "Hủy Đơn";
            btnCancel.Type = AntdUI.TTypeMini.Error;
            btnCancel.Visible = false;
            // 
            // pnlFooter
            // 
            pnlFooter.BackColor = Color.Transparent;
            pnlFooter.Controls.Add(lblTotalLabel);
            pnlFooter.Controls.Add(lblTotalAmount);
            pnlFooter.Location = new Point(16, 297);
            pnlFooter.Margin = new Padding(0);
            pnlFooter.Name = "pnlFooter";
            pnlFooter.Size = new Size(313, 66);
            pnlFooter.TabIndex = 8;
            // 
            // lblTotalLabel
            // 
            lblTotalLabel.Font = new Font("Segoe UI", 9F);
            lblTotalLabel.ForeColor = Color.FromArgb(100, 116, 139);
            lblTotalLabel.Location = new Point(0, 5);
            lblTotalLabel.Margin = new Padding(3, 4, 3, 4);
            lblTotalLabel.Name = "lblTotalLabel";
            lblTotalLabel.Size = new Size(80, 61);
            lblTotalLabel.TabIndex = 0;
            lblTotalLabel.Text = "Tổng tiền:";
            // 
            // lblTotalAmount
            // 
            lblTotalAmount.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            lblTotalAmount.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            lblTotalAmount.ForeColor = Color.FromArgb(220, 38, 38);
            lblTotalAmount.Location = new Point(20, 3);
            lblTotalAmount.Margin = new Padding(3, 4, 3, 4);
            lblTotalAmount.Name = "lblTotalAmount";
            lblTotalAmount.Size = new Size(261, 63);
            lblTotalAmount.TabIndex = 1;
            lblTotalAmount.Text = "0 ₫";
            lblTotalAmount.TextAlign = ContentAlignment.MiddleRight;
            // 
            // dividerBottom
            // 
            dividerBottom.Location = new Point(17, 284);
            dividerBottom.Margin = new Padding(0);
            dividerBottom.Name = "dividerBottom";
            dividerBottom.Size = new Size(312, 13);
            dividerBottom.TabIndex = 7;
            // 
            // txtItemsSummary
            // 
            txtItemsSummary.AutoEllipsis = true;
            txtItemsSummary.Font = new Font("Segoe UI", 9.25F);
            txtItemsSummary.ForeColor = Color.FromArgb(15, 23, 42);
            txtItemsSummary.Location = new Point(16, 160);
            txtItemsSummary.Margin = new Padding(3, 4, 3, 4);
            txtItemsSummary.Name = "txtItemsSummary";
            txtItemsSummary.Size = new Size(313, 120);
            txtItemsSummary.TabIndex = 6;
            txtItemsSummary.Text = "• Đang cập nhật...";
            // 
            // lblItemsTitle
            // 
            lblItemsTitle.Font = new Font("Segoe UI", 8F, FontStyle.Italic);
            lblItemsTitle.ForeColor = Color.FromArgb(148, 163, 184);
            lblItemsTitle.Location = new Point(16, 136);
            lblItemsTitle.Margin = new Padding(3, 4, 3, 4);
            lblItemsTitle.Name = "lblItemsTitle";
            lblItemsTitle.Size = new Size(345, 21);
            lblItemsTitle.TabIndex = 5;
            lblItemsTitle.Text = "Chi tiết món đã đặt:";
            // 
            // dividerTop
            // 
            dividerTop.Location = new Point(16, 120);
            dividerTop.Margin = new Padding(0);
            dividerTop.Name = "dividerTop";
            dividerTop.Size = new Size(345, 13);
            dividerTop.TabIndex = 4;
            // 
            // flowBadges
            // 
            flowBadges.BackColor = Color.Transparent;
            flowBadges.Controls.Add(badgeStatus);
            flowBadges.Controls.Add(badgePayment);
            flowBadges.Location = new Point(16, 83);
            flowBadges.Margin = new Padding(0);
            flowBadges.Name = "flowBadges";
            flowBadges.Size = new Size(313, 35);
            flowBadges.TabIndex = 3;
            // 
            // badgeStatus
            // 
            badgeStatus.AutoSizeMode = AntdUI.TAutoSize.Auto;
            badgeStatus.Font = new Font("Segoe UI", 8.5F);
            badgeStatus.Location = new Point(0, 3);
            badgeStatus.Margin = new Padding(0, 3, 9, 0);
            badgeStatus.Name = "badgeStatus";
            badgeStatus.Size = new Size(93, 20);
            badgeStatus.State = AntdUI.TState.Processing;
            badgeStatus.TabIndex = 0;
            badgeStatus.Text = "Chờ Xử Lý";
            // 
            // badgePayment
            // 
            badgePayment.AutoSizeMode = AntdUI.TAutoSize.Auto;
            badgePayment.Font = new Font("Segoe UI", 8.5F);
            badgePayment.Location = new Point(102, 3);
            badgePayment.Margin = new Padding(0, 3, 0, 0);
            badgePayment.Name = "badgePayment";
            badgePayment.Size = new Size(114, 20);
            badgePayment.State = AntdUI.TState.Warn;
            badgePayment.TabIndex = 1;
            badgePayment.Text = "Chờ Thu Tiền";
            // 
            // lblCustomerName
            // 
            lblCustomerName.Font = new Font("Segoe UI", 9.5F);
            lblCustomerName.ForeColor = Color.FromArgb(71, 85, 105);
            lblCustomerName.Location = new Point(16, 51);
            lblCustomerName.Margin = new Padding(3, 4, 3, 4);
            lblCustomerName.Name = "lblCustomerName";
            lblCustomerName.Size = new Size(345, 27);
            lblCustomerName.TabIndex = 2;
            lblCustomerName.Text = "Khách: Đang tải...";
            // 
            // lblCreatedAt
            // 
            lblCreatedAt.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            lblCreatedAt.Font = new Font("Segoe UI", 8.5F);
            lblCreatedAt.ForeColor = Color.FromArgb(148, 163, 184);
            lblCreatedAt.Location = new Point(231, 16);
            lblCreatedAt.Margin = new Padding(3, 4, 3, 4);
            lblCreatedAt.Name = "lblCreatedAt";
            lblCreatedAt.Size = new Size(95, 27);
            lblCreatedAt.TabIndex = 1;
            lblCreatedAt.Text = "00:00 - 01/01";
            lblCreatedAt.TextAlign = ContentAlignment.MiddleRight;
            // 
            // lblOrderId
            // 
            lblOrderId.Font = new Font("Segoe UI", 12.5F, FontStyle.Bold);
            lblOrderId.ForeColor = Color.FromArgb(30, 41, 59);
            lblOrderId.Location = new Point(16, 16);
            lblOrderId.Margin = new Padding(3, 4, 3, 4);
            lblOrderId.Name = "lblOrderId";
            lblOrderId.Size = new Size(157, 32);
            lblOrderId.TabIndex = 0;
            lblOrderId.Text = "ĐƠN #000";
            // 
            // OrderCardView
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            BackColor = Color.Transparent;
            Controls.Add(pnlCard);
            Margin = new Padding(11, 13, 11, 13);
            Name = "OrderCardView";
            Size = new Size(350, 480);
            pnlCard.ResumeLayout(false);
            flowButtons.ResumeLayout(false);
            pnlFooter.ResumeLayout(false);
            flowBadges.ResumeLayout(false);
            flowBadges.PerformLayout();
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