using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using NetClient.Shared.Models;

namespace NetClient.UI.Forms;

public partial class LockOverlay : Form
{
    private string _machineId = Environment.MachineName;
    private string _status = MachineStatus.ONLINE.ToString();
    private string? _username;
    private readonly System.Windows.Forms.Timer _clockTimer;
    private readonly System.Windows.Forms.Timer _notifTimer;

    public event Action<string>? OnLoginRequested;

    // Win32 API to ensure topmost window positioning
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_SHOWWINDOW = 0x0040;

    public LockOverlay()
    {
        InitializeComponent();

        // Configure Full-screen borderless window
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Normal;
        StartPosition = FormStartPosition.Manual;
        Bounds = Screen.PrimaryScreen?.Bounds ?? new Rectangle(0, 0, 1920, 1080);
        TopMost = true;
        ShowInTaskbar = false;

        // Double buffering for smooth rendering
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
        UpdateStyles();

        // Clock timer for real-time display
        _clockTimer = new System.Windows.Forms.Timer { Interval = 1000 };
        _clockTimer.Tick += (s, e) => UpdateClock();
        _clockTimer.Start();
        UpdateClock();

        // Notification auto-dismiss timer
        _notifTimer = new System.Windows.Forms.Timer { Interval = 6000 };
        _notifTimer.Tick += (s, e) =>
        {
            _notifTimer.Stop();
            pnlNotification.Visible = false;
        };

        // Wire Fake Login UI events
        btnLogin.Click += btnLogin_Click;
        txtUsername.KeyDown += txtUsername_KeyDown;

        Load += (_, _) =>
        {
            CenterCard();
            txtUsername.Focus();
        };
        Resize += (_, _) => CenterCard();
        UpdateUI();
    }

    #region Public API

    public void ShowOverlay()
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action(ShowOverlay));
            return;
        }

        Bounds = Screen.PrimaryScreen?.Bounds ?? new Rectangle(0, 0, 1920, 1080);
        Show();
        BringToFront();
        Activate();
        TopMost = true;

        try
        {
            SetWindowPos(Handle, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
        }
        catch { }

        txtUsername.Clear();
        lblLoginError.Visible = false;
        txtUsername.Focus();
    }

    public void HideOverlay()
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action(HideOverlay));
            return;
        }

        Hide();
    }

    public void SetUsername(string username)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string>(SetUsername), username);
            return;
        }

        _username = string.IsNullOrWhiteSpace(username) ? null : username.Trim();
        UpdateUI();
    }

    public void SetStatus(string status, string? machineId = null)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string, string?>(SetStatus), status, machineId);
            return;
        }

        _status = string.IsNullOrWhiteSpace(status) ? MachineStatus.ONLINE.ToString() : status.Trim();
        if (!string.IsNullOrWhiteSpace(machineId))
        {
            _machineId = machineId;
        }

        UpdateUI();
    }

    public void ShowNotification(string message, string? title = null)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string, string?>(ShowNotification), message, title);
            return;
        }

        lblNotifTitle.Text = title ?? "THÔNG BÁO";
        lblNotifMessage.Text = message;
        pnlNotification.Visible = true;
        pnlNotification.BringToFront();

        _notifTimer.Stop();
        _notifTimer.Start();
    }

    #endregion
    private void CenterCard()
    {
        pnlCenterCard.Left = (ClientSize.Width - pnlCenterCard.Width) / 2;
        pnlCenterCard.Top = (ClientSize.Height - pnlCenterCard.Height) / 2;
        pnlNotification.Left = (ClientSize.Width - pnlNotification.Width) / 2;
        pnlNotification.Top = 40;
    }
    private void UpdateClock()
    {
        lblClock.Text = DateTime.Now.ToString("HH:mm:ss");
        lblDate.Text = DateTime.Now.ToString("dddd, dd/MM/yyyy", new System.Globalization.CultureInfo("vi-VN"));
    }

    private void UpdateUI()
    {
        lblMachineName.Text = $"MÁY TRẠM: {_machineId.ToUpperInvariant()}";

        if (!string.IsNullOrEmpty(_username))
        {
            lblStatusBadge.Text = "ĐANG HOẠT ĐỘNG";
            lblStatusBadge.BackColor = Color.FromArgb(16, 185, 129); // Green
            lblMainPrompt.Text = $"Xin chào, {_username}!";
            lblSubPrompt.Text = "Chúc bạn có những giờ phút giải trí vui vẻ.";
            pnlLogin.Visible = false;
        }
        else
        {
            lblStatusBadge.Text = "CHƯA ĐĂNG NHẬP";
            lblStatusBadge.BackColor = Color.FromArgb(239, 68, 68); // Red
            lblMainPrompt.Text = "Vui lòng đăng nhập để sử dụng máy";
            lblSubPrompt.Text = "Nạp tiền tại quầy thu ngân hoặc sử dụng tài khoản hội viên của bạn.";
            pnlLogin.Visible = true;
        }
    }

    private void btnLogin_Click(object? sender, EventArgs e)
    {
        var username = txtUsername.Text?.Trim();
        if (string.IsNullOrWhiteSpace(username))
        {
            lblLoginError.Text = "Vui lòng nhập tên tài khoản!";
            lblLoginError.Visible = true;
            txtUsername.Focus();
            return;
        }

        lblLoginError.Visible = false;

        // Cập nhật trạng thái hiển thị
        SetUsername(username);
        SetStatus(MachineStatus.IN_USE.ToString());

        // Ẩn lớp phủ overlay mở máy
        HideOverlay();

        // Xóa text cho lần sau
        txtUsername.Clear();

        // Gửi sự kiện yêu cầu đăng nhập qua IPC
        OnLoginRequested?.Invoke(username);
    }

    private void txtUsername_KeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.Enter)
        {
            e.SuppressKeyPress = true;
            btnLogin.PerformClick();
        }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        // Prevent user from closing overlay with Alt+F4
        if (e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            return;
        }

        base.OnFormClosing(e);
    }

    private void pnlNotification_Paint(object sender, PaintEventArgs e)
    {

    }

    private void lblLogo_Click(object sender, EventArgs e)
    {

    }

    protected override CreateParams CreateParams
    {
        get
        {
            // WS_EX_TOOLWINDOW (0x80) hides from Alt+Tab
            // WS_EX_TOPMOST (0x00000008)
            var cp = base.CreateParams;
            cp.ExStyle |= 0x80;
            return cp;
        }
    }
}

