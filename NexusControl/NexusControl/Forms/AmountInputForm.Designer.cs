namespace NexusControl.Forms
{
    partial class AmountInputForm
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
            divider1 = new AntdUI.Divider();
            lbl_Computer = new AntdUI.Label();
            lbl_User = new AntdUI.Label();
            sd_Action = new AntdUI.Shield();
            label1 = new AntdUI.Label();
            label2 = new AntdUI.Label();
            label3 = new AntdUI.Label();
            lbl_balance = new AntdUI.Label();
            lbl_bonus_balance = new AntdUI.Label();
            divider2 = new AntdUI.Divider();
            label4 = new AntdUI.Label();
            divider3 = new AntdUI.Divider();
            label5 = new AntdUI.Label();
            ip_Money = new AntdUI.InputNumber();
            lbl_ByText = new AntdUI.Label();
            label6 = new AntdUI.Label();
            label7 = new AntdUI.Label();
            lbl_balancePpreview = new AntdUI.Label();
            lbl_bonus_Preview = new AntdUI.Label();
            buttonShadow1 = new AntdUI.ButtonShadow();
            SuspendLayout();
            // 
            // divider1
            // 
            divider1.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            divider1.Location = new Point(12, 122);
            divider1.Name = "divider1";
            divider1.Size = new Size(589, 29);
            divider1.TabIndex = 1;
            divider1.Text = "divider1";
            divider1.Thickness = 3F;
            divider1.Click += divider1_Click;
            // 
            // lbl_Computer
            // 
            lbl_Computer.Font = new Font("Segoe UI", 10.8F);
            lbl_Computer.Location = new Point(12, 16);
            lbl_Computer.Name = "lbl_Computer";
            lbl_Computer.Size = new Size(379, 29);
            lbl_Computer.TabIndex = 2;
            lbl_Computer.Text = "Máy tính:";
            // 
            // lbl_User
            // 
            lbl_User.Font = new Font("Segoe UI", 10.8F);
            lbl_User.Location = new Point(12, 82);
            lbl_User.Name = "lbl_User";
            lbl_User.Size = new Size(379, 29);
            lbl_User.TabIndex = 2;
            lbl_User.Text = "Người dùng:";
            // 
            // sd_Action
            // 
            sd_Action.AutoSizeMode = AntdUI.TAutoSize.Auto;
            sd_Action.Fore = Color.Black;
            sd_Action.ForeColor = Color.Lime;
            sd_Action.Label = "Thêm";
            sd_Action.LabelColor = Color.LimeGreen;
            sd_Action.Location = new Point(441, 12);
            sd_Action.Name = "sd_Action";
            sd_Action.Size = new Size(160, 33);
            sd_Action.TabIndex = 4;
            sd_Action.Text = "Tiền tài khoản";
            // 
            // label1
            // 
            label1.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            label1.Location = new Point(12, 157);
            label1.Name = "label1";
            label1.Size = new Size(142, 29);
            label1.TabIndex = 5;
            label1.Text = "Số dư hiện tại";
            // 
            // label2
            // 
            label2.Font = new Font("Microsoft Sans Serif", 8.25F);
            label2.Location = new Point(12, 192);
            label2.Name = "label2";
            label2.Size = new Size(94, 29);
            label2.TabIndex = 6;
            label2.Text = "Tiền tài khoản";
            // 
            // label3
            // 
            label3.Font = new Font("Microsoft Sans Serif", 8.25F);
            label3.Location = new Point(351, 192);
            label3.Name = "label3";
            label3.Size = new Size(94, 29);
            label3.TabIndex = 6;
            label3.Text = "Tiền miễn phí";
            // 
            // lbl_balance
            // 
            lbl_balance.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            lbl_balance.Location = new Point(12, 227);
            lbl_balance.Name = "lbl_balance";
            lbl_balance.Size = new Size(250, 29);
            lbl_balance.TabIndex = 7;
            lbl_balance.Text = "50.000đ";
            // 
            // lbl_bonus_balance
            // 
            lbl_bonus_balance.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            lbl_bonus_balance.Location = new Point(351, 227);
            lbl_bonus_balance.Name = "lbl_bonus_balance";
            lbl_bonus_balance.Size = new Size(250, 29);
            lbl_bonus_balance.TabIndex = 7;
            lbl_bonus_balance.Text = "50.000đ";
            // 
            // divider2
            // 
            divider2.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            divider2.Location = new Point(12, 262);
            divider2.Name = "divider2";
            divider2.Size = new Size(589, 29);
            divider2.TabIndex = 8;
            divider2.Text = "divider2";
            divider2.Thickness = 3F;
            // 
            // label4
            // 
            label4.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            label4.Location = new Point(12, 297);
            label4.Name = "label4";
            label4.Size = new Size(192, 29);
            label4.TabIndex = 5;
            label4.Text = "Số tiền điều chỉnh";
            // 
            // divider3
            // 
            divider3.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            divider3.Location = new Point(12, 459);
            divider3.Name = "divider3";
            divider3.Size = new Size(589, 29);
            divider3.TabIndex = 10;
            divider3.Text = "divider3";
            divider3.Thickness = 3F;
            // 
            // label5
            // 
            label5.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            label5.Location = new Point(12, 494);
            label5.Name = "label5";
            label5.Size = new Size(192, 29);
            label5.TabIndex = 9;
            label5.Text = "Số dư sau giao dịch";
            // 
            // ip_Money
            // 
            ip_Money.Increment = new decimal(new int[] { 1000, 0, 0, 0 });
            ip_Money.Location = new Point(12, 332);
            ip_Money.Maximum = new decimal(new int[] { 100000000, 0, 0, 0 });
            ip_Money.Minimum = new decimal(new int[] { 0, 0, 0, 0 });
            ip_Money.Name = "ip_Money";
            ip_Money.Size = new Size(589, 70);
            ip_Money.TabIndex = 11;
            ip_Money.Text = "0";
            ip_Money.ThousandsSeparator = true;
            ip_Money.Enter += ip_Money_Enter;
            ip_Money.KeyUp += ip_Money_KeyUp;
            ip_Money.TextChanged += ip_Money_TextChanged;
            ip_Money.ValueChanged += ip_Money_ValueChanged;
            // 
            // lbl_ByText
            // 
            lbl_ByText.Location = new Point(12, 408);
            lbl_ByText.Name = "lbl_ByText";
            lbl_ByText.Size = new Size(589, 29);
            lbl_ByText.TabIndex = 12;
            lbl_ByText.Text = "Bằng chữ:";
            // 
            // label6
            // 
            label6.Font = new Font("Microsoft Sans Serif", 8.25F);
            label6.Location = new Point(12, 529);
            label6.Name = "label6";
            label6.Size = new Size(94, 29);
            label6.TabIndex = 6;
            label6.Text = "Tiền tài khoản";
            // 
            // label7
            // 
            label7.Font = new Font("Microsoft Sans Serif", 8.25F);
            label7.Location = new Point(351, 529);
            label7.Name = "label7";
            label7.Size = new Size(94, 29);
            label7.TabIndex = 6;
            label7.Text = "Tiền miễn phí";
            // 
            // lbl_balancePpreview
            // 
            lbl_balancePpreview.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            lbl_balancePpreview.Location = new Point(12, 564);
            lbl_balancePpreview.Name = "lbl_balancePpreview";
            lbl_balancePpreview.Size = new Size(250, 29);
            lbl_balancePpreview.TabIndex = 7;
            lbl_balancePpreview.Text = "50.000đ";
            // 
            // lbl_bonus_Preview
            // 
            lbl_bonus_Preview.Font = new Font("Segoe UI", 10.8F, FontStyle.Bold, GraphicsUnit.Point, 0);
            lbl_bonus_Preview.Location = new Point(351, 564);
            lbl_bonus_Preview.Name = "lbl_bonus_Preview";
            lbl_bonus_Preview.Size = new Size(250, 29);
            lbl_bonus_Preview.TabIndex = 7;
            lbl_bonus_Preview.Text = "50.000đ";
            // 
            // buttonShadow1
            // 
            buttonShadow1.BackColor = Color.Aqua;
            buttonShadow1.DefaultBack = Color.Aqua;
            buttonShadow1.Dock = DockStyle.Bottom;
            buttonShadow1.Font = new Font("Segoe UI", 10.8F, FontStyle.Regular, GraphicsUnit.Point, 0);
            buttonShadow1.ForeActive = Color.Yellow;
            buttonShadow1.ForeColor = Color.Black;
            buttonShadow1.Location = new Point(0, 621);
            buttonShadow1.Name = "buttonShadow1";
            buttonShadow1.Size = new Size(613, 48);
            buttonShadow1.TabIndex = 13;
            buttonShadow1.Text = "Xác nhận";
            buttonShadow1.Click += buttonShadow1_Click;
            // 
            // AmountInputForm
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(613, 669);
            Controls.Add(buttonShadow1);
            Controls.Add(lbl_ByText);
            Controls.Add(ip_Money);
            Controls.Add(divider3);
            Controls.Add(label5);
            Controls.Add(divider2);
            Controls.Add(lbl_bonus_Preview);
            Controls.Add(lbl_bonus_balance);
            Controls.Add(lbl_balancePpreview);
            Controls.Add(lbl_balance);
            Controls.Add(label7);
            Controls.Add(label6);
            Controls.Add(label3);
            Controls.Add(label2);
            Controls.Add(label4);
            Controls.Add(label1);
            Controls.Add(sd_Action);
            Controls.Add(lbl_User);
            Controls.Add(lbl_Computer);
            Controls.Add(divider1);
            Name = "AmountInputForm";
            Text = "Điều chỉnh số dư";
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion
        private AntdUI.Divider divider1;
        private AntdUI.Label lbl_Computer;
        private AntdUI.Label lbl_User;
        private AntdUI.Shield sd_Action;
        private AntdUI.Label label1;
        private AntdUI.Label label2;
        private AntdUI.Label label3;
        private AntdUI.Label lbl_balance;
        private AntdUI.Label lbl_bonus_balance;
        private AntdUI.Divider divider2;
        private AntdUI.Label label4;
        private AntdUI.Divider divider3;
        private AntdUI.Label label5;
        private AntdUI.InputNumber ip_Money;
        private AntdUI.Label lbl_ByText;
        private AntdUI.Label label6;
        private AntdUI.Label label7;
        private AntdUI.Label lbl_balancePpreview;
        private AntdUI.Label lbl_bonus_Preview;
        private AntdUI.ButtonShadow buttonShadow1;
    }
}