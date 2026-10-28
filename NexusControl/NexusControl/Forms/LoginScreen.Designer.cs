namespace NexusControl.Forms
{
    partial class LoginScreen
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            Ip_Username = new AntdUI.Input();
            ip_Password = new AntdUI.Input();
            flowPanel1 = new AntdUI.FlowPanel();
            btn_Login = new AntdUI.ButtonShadow();
            labelLed1 = new AntdUI.LabelLed();
            labelTime1 = new AntdUI.LabelTime();
            flowPanel1.SuspendLayout();
            SuspendLayout();
            // 
            // Ip_Username
            // 
            Ip_Username.Location = new Point(53, 3);
            Ip_Username.Name = "Ip_Username";
            Ip_Username.PlaceholderColor = SystemColors.ActiveBorder;
            Ip_Username.PlaceholderText = "Tên đăng nhập";
            Ip_Username.Prefix = Properties.Resources.user;
            Ip_Username.PrefixFormat = AntdUI.FormatFlags.Left;
            Ip_Username.PrefixSvg = "";
            Ip_Username.PrefixText = "";
            Ip_Username.Size = new Size(252, 67);
            Ip_Username.TabIndex = 0;
            // 
            // ip_Password
            // 
            ip_Password.Location = new Point(53, 76);
            ip_Password.Name = "ip_Password";
            ip_Password.PlaceholderColor = SystemColors.ActiveCaption;
            ip_Password.PlaceholderText = "Mật khẩu";
            ip_Password.Size = new Size(252, 67);
            ip_Password.TabIndex = 0;
            ip_Password.UseSystemPasswordChar = true;
            ip_Password.SuffixClick += ip_Password_SuffixClick;
            // 
            // flowPanel1
            // 
            flowPanel1.Align = AntdUI.TAlignFlow.Center;
            flowPanel1.Badge = "";
            flowPanel1.Controls.Add(btn_Login);
            flowPanel1.Controls.Add(ip_Password);
            flowPanel1.Controls.Add(Ip_Username);
            flowPanel1.Location = new Point(160, 86);
            flowPanel1.Name = "flowPanel1";
            flowPanel1.Size = new Size(359, 211);
            flowPanel1.TabIndex = 1;
            flowPanel1.Text = "flowPanel1";
            // 
            // btn_Login
            // 
            btn_Login.Location = new Point(85, 149);
            btn_Login.Name = "btn_Login";
            btn_Login.Size = new Size(189, 50);
            btn_Login.TabIndex = 3;
            btn_Login.Text = "Đăng nhập";
            btn_Login.Click += btn_Login_Click;
            // 
            // labelLed1
            // 
            labelLed1.Location = new Point(160, 2);
            labelLed1.Name = "labelLed1";
            labelLed1.Size = new Size(359, 81);
            labelLed1.TabIndex = 2;
            labelLed1.Text = "Nexus ";
            // 
            // labelTime1
            // 
            labelTime1.Location = new Point(12, 334);
            labelTime1.Name = "labelTime1";
            labelTime1.Size = new Size(94, 29);
            labelTime1.TabIndex = 3;
            labelTime1.Text = "labelTime1";
            // 
            // LoginScreen
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(689, 375);
            Controls.Add(labelTime1);
            Controls.Add(labelLed1);
            Controls.Add(flowPanel1);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            Name = "LoginScreen";
            StartPosition = FormStartPosition.CenterParent;
            Text = "Đăng nhập nhân viên";
            Shown += LoginScreen_Shown;
            flowPanel1.ResumeLayout(false);
            ResumeLayout(false);
        }

        #endregion

        private AntdUI.Input Ip_Username;
        private AntdUI.Input ip_Password;
        private AntdUI.FlowPanel flowPanel1;
        private AntdUI.ButtonShadow btn_Login;
        private AntdUI.LabelLed labelLed1;
        private AntdUI.LabelTime labelTime1;
    }
}