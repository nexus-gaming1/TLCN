namespace NetClient.UI.Forms;

partial class LockOverlay
{
    private System.ComponentModel.IContainer components = null;
    private Label lblMachineName;
    private Label lblStatusBadge;
    private Label lblMainPrompt;
    private Label lblSubPrompt;
    private Label lblClock;
    private Label lblDate;
    private Label lblLogo;
    private Panel pnlCenterCard;
    private Panel pnlLogin;
    private Label lblLoginTitle;
    private Label lblUsername;
    private TextBox txtUsername;
    private Label lblLoginError;
    private Button btnLogin;
    private Label lblHint;
    private Panel pnlNotification;
    private Label lblNotifTitle;
    private Label lblNotifMessage;

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            components?.Dispose();
            _clockTimer?.Dispose();
            _notifTimer?.Dispose();
        }
        base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
        pnlCenterCard = new Panel();
        pnlLogin = new Panel();
        lblHint = new Label();
        btnLogin = new Button();
        lblLoginError = new Label();
        txtUsername = new TextBox();
        lblUsername = new Label();
        lblLoginTitle = new Label();
        lblSubPrompt = new Label();
        lblMainPrompt = new Label();
        lblStatusBadge = new Label();
        lblMachineName = new Label();
        lblDate = new Label();
        lblClock = new Label();
        lblLogo = new Label();
        pnlNotification = new Panel();
        lblNotifTitle = new Label();
        lblNotifMessage = new Label();
        pnlCenterCard.SuspendLayout();
        pnlLogin.SuspendLayout();
        pnlNotification.SuspendLayout();
        SuspendLayout();
        // 
        // pnlCenterCard
        // 
        pnlCenterCard.Anchor = AnchorStyles.None;
        pnlCenterCard.BackColor = Color.FromArgb(24, 32, 47);
        pnlCenterCard.Controls.Add(pnlLogin);
        pnlCenterCard.Controls.Add(lblSubPrompt);
        pnlCenterCard.Controls.Add(lblMainPrompt);
        pnlCenterCard.Controls.Add(lblStatusBadge);
        pnlCenterCard.Controls.Add(lblMachineName);
        pnlCenterCard.Controls.Add(lblDate);
        pnlCenterCard.Controls.Add(lblClock);
        pnlCenterCard.Controls.Add(lblLogo);
        pnlCenterCard.Location = new Point(114, 100);
        pnlCenterCard.Margin = new Padding(3, 4, 3, 4);
        pnlCenterCard.Name = "pnlCenterCard";
        pnlCenterCard.Size = new Size(777, 650);
        pnlCenterCard.TabIndex = 1;
        // 
        // pnlLogin
        // 
        pnlLogin.BackColor = Color.FromArgb(15, 23, 42);
        pnlLogin.Controls.Add(lblHint);
        pnlLogin.Controls.Add(btnLogin);
        pnlLogin.Controls.Add(lblLoginError);
        pnlLogin.Controls.Add(txtUsername);
        pnlLogin.Controls.Add(lblUsername);
        pnlLogin.Controls.Add(lblLoginTitle);
        pnlLogin.Location = new Point(148, 325);
        pnlLogin.Margin = new Padding(3, 4, 3, 4);
        pnlLogin.Name = "pnlLogin";
        pnlLogin.Size = new Size(480, 280);
        pnlLogin.TabIndex = 7;
        // 
        // lblHint
        // 
        lblHint.Font = new Font("Segoe UI", 8.5F, FontStyle.Italic);
        lblHint.ForeColor = Color.FromArgb(148, 163, 184);
        lblHint.Location = new Point(20, 218);
        lblHint.Name = "lblHint";
        lblHint.Size = new Size(440, 24);
        lblHint.TabIndex = 5;
        lblHint.Text = "💡 Chế độ thử nghiệm: Nhập bất kỳ username nào và nhấn Enter";
        lblHint.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // btnLogin
        // 
        btnLogin.BackColor = Color.FromArgb(16, 185, 129);
        btnLogin.Cursor = Cursors.Hand;
        btnLogin.FlatAppearance.BorderSize = 0;
        btnLogin.FlatStyle = FlatStyle.Flat;
        btnLogin.Font = new Font("Segoe UI", 11.5F, FontStyle.Bold);
        btnLogin.ForeColor = Color.White;
        btnLogin.Location = new Point(35, 155);
        btnLogin.Name = "btnLogin";
        btnLogin.Size = new Size(410, 48);
        btnLogin.TabIndex = 4;
        btnLogin.Text = "⚡ ĐĂNG NHẬP (MỞ MÁY)";
        btnLogin.UseVisualStyleBackColor = false;
        // 
        // lblLoginError
        // 
        lblLoginError.Font = new Font("Segoe UI", 9F);
        lblLoginError.ForeColor = Color.FromArgb(248, 113, 113);
        lblLoginError.Location = new Point(35, 122);
        lblLoginError.Name = "lblLoginError";
        lblLoginError.Size = new Size(410, 22);
        lblLoginError.TabIndex = 3;
        lblLoginError.Text = "Vui lòng nhập tên tài khoản!";
        lblLoginError.TextAlign = ContentAlignment.MiddleCenter;
        lblLoginError.Visible = false;
        // 
        // txtUsername
        // 
        txtUsername.BackColor = Color.FromArgb(30, 41, 59);
        txtUsername.BorderStyle = BorderStyle.FixedSingle;
        txtUsername.Font = new Font("Segoe UI", 12.5F);
        txtUsername.ForeColor = Color.White;
        txtUsername.Location = new Point(35, 82);
        txtUsername.Name = "txtUsername";
        txtUsername.Size = new Size(410, 35);
        txtUsername.TabIndex = 2;
        // 
        // lblUsername
        // 
        lblUsername.Font = new Font("Segoe UI", 9.5F);
        lblUsername.ForeColor = Color.FromArgb(203, 213, 225);
        lblUsername.Location = new Point(35, 52);
        lblUsername.Name = "lblUsername";
        lblUsername.Size = new Size(410, 24);
        lblUsername.TabIndex = 1;
        lblUsername.Text = "Tên tài khoản / Mã hội viên:";
        // 
        // lblLoginTitle
        // 
        lblLoginTitle.Font = new Font("Segoe UI", 11.5F, FontStyle.Bold);
        lblLoginTitle.ForeColor = Color.FromArgb(56, 189, 248);
        lblLoginTitle.Location = new Point(20, 16);
        lblLoginTitle.Name = "lblLoginTitle";
        lblLoginTitle.Size = new Size(440, 28);
        lblLoginTitle.TabIndex = 0;
        lblLoginTitle.Text = "🔑 ĐĂNG NHẬP MÁY TRẠM";
        lblLoginTitle.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblSubPrompt
        // 
        lblSubPrompt.Font = new Font("Segoe UI", 9.5F);
        lblSubPrompt.ForeColor = Color.FromArgb(148, 163, 184);
        lblSubPrompt.Location = new Point(46, 282);
        lblSubPrompt.Name = "lblSubPrompt";
        lblSubPrompt.Size = new Size(686, 26);
        lblSubPrompt.TabIndex = 0;
        lblSubPrompt.Text = "Nạp tiền tại quầy thu ngân hoặc sử dụng tài khoản hội viên của bạn.";
        lblSubPrompt.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblMainPrompt
        // 
        lblMainPrompt.Font = new Font("Segoe UI", 13F, FontStyle.Bold);
        lblMainPrompt.ForeColor = Color.FromArgb(226, 232, 240);
        lblMainPrompt.Location = new Point(46, 246);
        lblMainPrompt.Name = "lblMainPrompt";
        lblMainPrompt.Size = new Size(686, 36);
        lblMainPrompt.TabIndex = 1;
        lblMainPrompt.Text = "Vui lòng đăng nhập để sử dụng máy";
        lblMainPrompt.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblStatusBadge
        // 
        lblStatusBadge.BackColor = Color.FromArgb(239, 68, 68);
        lblStatusBadge.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
        lblStatusBadge.ForeColor = Color.White;
        lblStatusBadge.Location = new Point(278, 202);
        lblStatusBadge.Name = "lblStatusBadge";
        lblStatusBadge.Size = new Size(220, 36);
        lblStatusBadge.TabIndex = 2;
        lblStatusBadge.Text = "CHƯA ĐĂNG NHẬP";
        lblStatusBadge.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblMachineName
        // 
        lblMachineName.Font = new Font("Segoe UI", 18F, FontStyle.Bold);
        lblMachineName.ForeColor = Color.FromArgb(255, 255, 255);
        lblMachineName.Location = new Point(46, 155);
        lblMachineName.Name = "lblMachineName";
        lblMachineName.Size = new Size(686, 40);
        lblMachineName.TabIndex = 3;
        lblMachineName.Text = "MÁY TRẠM: PC-01";
        lblMachineName.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblDate
        // 
        lblDate.Font = new Font("Segoe UI", 10.5F);
        lblDate.ForeColor = Color.FromArgb(148, 163, 184);
        lblDate.Location = new Point(46, 125);
        lblDate.Name = "lblDate";
        lblDate.Size = new Size(686, 26);
        lblDate.TabIndex = 4;
        lblDate.Text = "Thứ Sáu, 11/09/2026";
        lblDate.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblClock
        // 
        lblClock.Font = new Font("Segoe UI", 32F, FontStyle.Bold);
        lblClock.ForeColor = Color.FromArgb(241, 245, 249);
        lblClock.Location = new Point(46, 55);
        lblClock.Name = "lblClock";
        lblClock.Size = new Size(686, 68);
        lblClock.TabIndex = 5;
        lblClock.Text = "00:00:00";
        lblClock.TextAlign = ContentAlignment.MiddleCenter;
        // 
        // lblLogo
        // 
        lblLogo.Dock = DockStyle.Top;
        lblLogo.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
        lblLogo.ForeColor = Color.FromArgb(56, 189, 248);
        lblLogo.Location = new Point(0, 0);
        lblLogo.Name = "lblLogo";
        lblLogo.Size = new Size(777, 50);
        lblLogo.TabIndex = 6;
        lblLogo.Text = "⚡ CYBER GAMING MANAGEMENT ⚡";
        lblLogo.TextAlign = ContentAlignment.MiddleCenter;
        lblLogo.Click += lblLogo_Click;
        // 
        // pnlNotification
        // 
        pnlNotification.BackColor = Color.FromArgb(220, 38, 38);
        pnlNotification.Controls.Add(lblNotifTitle);
        pnlNotification.Controls.Add(lblNotifMessage);
        pnlNotification.Location = new Point(0, 53);
        pnlNotification.Margin = new Padding(3, 4, 3, 4);
        pnlNotification.Name = "pnlNotification";
        pnlNotification.Size = new Size(686, 120);
        pnlNotification.TabIndex = 0;
        pnlNotification.Visible = false;
        pnlNotification.Paint += pnlNotification_Paint;
        // 
        // lblNotifTitle
        // 
        lblNotifTitle.Location = new Point(0, 0);
        lblNotifTitle.Name = "lblNotifTitle";
        lblNotifTitle.Size = new Size(114, 31);
        lblNotifTitle.TabIndex = 0;
        // 
        // lblNotifMessage
        // 
        lblNotifMessage.Location = new Point(0, 0);
        lblNotifMessage.Name = "lblNotifMessage";
        lblNotifMessage.Size = new Size(114, 31);
        lblNotifMessage.TabIndex = 1;
        // 
        // LockOverlay
        // 
        AutoScaleDimensions = new SizeF(8F, 20F);
        AutoScaleMode = AutoScaleMode.Font;
        BackColor = Color.FromArgb(11, 15, 25);
        ClientSize = new Size(1924, 1055);
        Controls.Add(pnlNotification);
        Controls.Add(pnlCenterCard);
        Margin = new Padding(3, 4, 3, 4);
        Name = "LockOverlay";
        Text = "LockOverlay";
        pnlCenterCard.ResumeLayout(false);
        pnlLogin.ResumeLayout(false);
        pnlLogin.PerformLayout();
        pnlNotification.ResumeLayout(false);
        ResumeLayout(false);
    }

}

