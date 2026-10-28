using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using NexusControl.Services;
namespace NexusControl.Forms
{
    public partial class LoginScreen : Form
    {
        private readonly AuthService _authService = new AuthService();

        public LoginScreen()
        {
            InitializeComponent();
            Ip_Username.Focus();

            Ip_Username.PrefixText = null;
            Ip_Username.PrefixSvg = IconService.GetSvg("user");
            Ip_Username.IconRatio = 1f;


            ip_Password.IconRatio = 1f;
            ip_Password.PrefixText = null;
            ip_Password.PrefixSvg = IconService.GetSvg("lock");

            ip_Password.SuffixText = null;
            ip_Password.SuffixSvg = IconService.GetSvg("eye");
        }

        private void LoginScreen_Shown(object sender, EventArgs e)
        {
            Ip_Username.Focus();
        }

        private void ip_Password_SuffixClick(object sender, MouseEventArgs e)
        {
            if (ip_Password.UseSystemPasswordChar)
            {
                ip_Password.UseSystemPasswordChar = false;
                ip_Password.SuffixSvg = IconService.GetSvg("eye-off");
            }
            else
            {
                ip_Password.UseSystemPasswordChar = true;
                ip_Password.SuffixSvg = IconService.GetSvg("eye");
            }
        }

        private async void btn_Login_Click(object sender, EventArgs e)
        {
            var result = await _authService.LoginAsync(Ip_Username.Text, ip_Password.Text);
            if (result.IsSuccess)
            {
                this.Close();
            }
            else
            {
                MessageBox.Show(result.Message, "Lỗi", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
