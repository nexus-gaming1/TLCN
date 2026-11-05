using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using AntdUI;
using NexusControl.Constants;
using NexusControl.Services;
namespace NexusControl.Forms
{
    public partial class LoginScreen : Form
    {
        private readonly AuthService _authService = new AuthService();
        private bool _isLoginSuccessful = false;

        public LoginScreen()
        {
            InitializeComponent();
            Ip_Username.Focus();
            Ip_Username.IconRatio = 1.2f;
            ip_Password.IconRatio = 1.2f;

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
                ip_Password.Suffix = Properties.Resources.eye_off;
            }
            else
            {
                ip_Password.UseSystemPasswordChar = true;
                ip_Password.Suffix = Properties.Resources.eye;
            }
        }

        private async void btn_Login_Click(object sender, EventArgs e)
        {
            var result = await _authService.LoginAsync(Ip_Username.Text, ip_Password.Text);
            if (result.IsSuccess)
            {
                _isLoginSuccessful = true;
                this.Close();
            }
            else
            {
                MessageBox.Show(result.Message, "Lỗi", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LoginScreen_Load(object sender, EventArgs e)
        {

        }

        private void LoginScreen_FormClosing(object sender, FormClosingEventArgs e)
        {
            if(!_isLoginSuccessful)
            {
                Application.Exit();
            }
        }
    }
}
