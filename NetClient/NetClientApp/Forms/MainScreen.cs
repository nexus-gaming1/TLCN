using NetClient.App.Services;

namespace NetClient.App.Forms
{
    public partial class MainScreen : Form
    {
        private readonly IpcClientService? _ipcClient;

        public MainScreen()
        {
            InitializeComponent();
        }

        public MainScreen(IpcClientService ipcClient) : this()
        {
            _ipcClient = ipcClient;
            WireUpIpcEvents();
        }

        private void WireUpIpcEvents()
        {
            if (_ipcClient == null) return;

            _ipcClient.OnSetUsername += user =>
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action(() => UpdateUser(user)));
                    return;
                }
                UpdateUser(user);
            };

            _ipcClient.OnShowOverlay += () =>
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action(Hide));
                    return;
                }
                Hide();
            };

            _ipcClient.OnHideOverlay += () =>
            {
                if (InvokeRequired)
                {
                    BeginInvoke(new Action(() =>
                    {
                        Show();
                        btn_Logout.Enabled = true;
                    }));
                    return;
                }
                Show();
                btn_Logout.Enabled = true;
            };
        }

        private void UpdateUser(string username)
        {
            Text = string.IsNullOrWhiteSpace(username) ? "NetClient App" : $"NetClient App - {username}";
        }

        private async void btn_Logout_Click(object sender, EventArgs e)
        {
            var confirm = MessageBox.Show(
                "Bạn có chắc chắn muốn đăng xuất không?",
                "Xác nhận đăng xuất",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (confirm != DialogResult.Yes) return;

            btn_Logout.Enabled = false;

            try
            {
                if (_ipcClient != null)
                {
                    await _ipcClient.SendLogoutAsync();
                }
                Hide();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Lỗi khi gửi yêu cầu đăng xuất: {ex.Message}",
                    "Lỗi",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                btn_Logout.Enabled = true;
            }
        }
    }
}
