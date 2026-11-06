using NexusControl.Services;
using NexusControl.UserControls;
using NexusControl.Views;
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
            var item = menu1.Items.FirstOrDefault(x => x.ID == "maytram");

            if (item != null)
            {
                item.Select = true;
                HandleMenuSelection(item);
            }

        }

        private void LoadScreen(UserControl screen)
        {
            // Giải phóng an toàn các UserControl cũ bằng cách duyệt ngược từ cuối lên
            for (int i = panel1.Controls.Count - 1; i >= 0; i--)
            {
                Control c = panel1.Controls[i];
                panel1.Controls.RemoveAt(i); // Gỡ khỏi giao diện trước
                c.Dispose();                 // Giải phóng RAM sau
            }

            //panel1.Controls.Clear();
            screen.Dock = DockStyle.Fill;
            panel1.Controls.Add(screen);
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
            }
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void label2_Click(object sender, EventArgs e)
        {

        }

        private void menu1_SelectChanged(object sender, AntdUI.MenuSelectEventArgs e)
        {
            var selectedItem = e.Value;
            HandleMenuSelection(selectedItem);
        }
        private void HandleMenuSelection(AntdUI.MenuItem item)
        {
            switch (item.ID)
            {
                case "maytram":
                    // Load the dashboard content
                    LoadScreen(new ComputersScreen());
                    break;
                case "taikhoan":
                    // Load the settings content

                    break;
                case "translog":
                    // Load the profile content
                    break;
                case "systemlog":
                    // Load the profile content
                    LoadScreen(new SystemLogsScreen());
                    break;
                case "nhommay":
                    // Load the profile content
                    break;
                case "nhomnguoisudung":
                    // Load the profile content
                    break;
                case "fnb_orders":
                    LoadScreen(new OrderManagementView());
                    break;

                default:
                    // Handle unknown selection
                    break;
            }
        }

        private void thayĐổiTàiKhoảnToolStripMenuItem_Click(object sender, EventArgs e)
        {


        }

        private void ChangeAccount_Click(object sender, EventArgs e)
        {
            Form Login = new LoginScreen();
            Login.ShowDialog();
        }

        private void table1_CellClick(object sender, AntdUI.TableClickEventArgs e)
        {

        }
    }
}
