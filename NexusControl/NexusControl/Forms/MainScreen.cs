using NexusControl.Services;
namespace NexusControl.Forms
{
    public partial class MainScreen : Form
    {
        public MainScreen()
        {
            InitializeComponent();
        }

        private void MainScreen_Load(object sender, EventArgs e)
        {

        }

        private void MainScreen_Shown(object sender, EventArgs e)
        {
            if (!UserSessionService.IsLoggedIn)
            {
                LoginScreen loginScreen = new LoginScreen();
                loginScreen.ShowDialog();
            }
            else
            {
                lbl_Username.Text = $"Chào mừng {UserSessionService.CurrentUser?.Username}";
            }
        }
    }
}
