namespace NexusControl.Forms
{
    partial class MainScreen
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
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
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            AntdUI.MenuItem menuItem1 = new AntdUI.MenuItem();
            AntdUI.MenuItem menuItem2 = new AntdUI.MenuItem();
            AntdUI.MenuItem menuItem3 = new AntdUI.MenuItem();
            AntdUI.MenuItem menuItem4 = new AntdUI.MenuItem();
            AntdUI.MenuItem menuItem5 = new AntdUI.MenuItem();
            AntdUI.MenuItem menuItem6 = new AntdUI.MenuItem();
            panel1 = new AntdUI.Panel();
            menu1 = new AntdUI.Menu();
            tableLayoutPanel1 = new TableLayoutPanel();
            lbl_Percent = new AntdUI.Label();
            lbl_amount = new AntdUI.Label();
            lbl_inuse = new AntdUI.Label();
            lbl_offline = new AntdUI.Label();
            labelTime1 = new AntdUI.LabelTime();
            lbl_online = new AntdUI.Label();
            báoCáoToolStripMenuItem = new ToolStripMenuItem();
            báoCáoDịchVụToolStripMenuItem = new ToolStripMenuItem();
            báoCáoGiaoDịchToolStripMenuItem = new ToolStripMenuItem();
            xuấtBáoCáoToolStripMenuItem = new ToolStripMenuItem();
            menuStrip1 = new MenuStrip();
            tableLayoutPanel1.SuspendLayout();
            menuStrip1.SuspendLayout();
            SuspendLayout();
            // 
            // panel1
            // 
            panel1.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            panel1.Location = new Point(0, 84);
            panel1.Name = "panel1";
            panel1.Size = new Size(800, 342);
            panel1.TabIndex = 2;
            panel1.Text = "panel1";
            // 
            // menu1
            // 
            menu1.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            menu1.AutoCollapse = true;
            menu1.BackActive = Color.AliceBlue;
            menu1.BackColor = SystemColors.ActiveCaption;
            menuItem1.ID = "maytram";
            menuItem1.Name = "maytram";
            menuItem1.Text = "MÁY TRẠM";
            menuItem2.ID = "taikhoan";
            menuItem2.LocalizationText = "";
            menuItem2.Name = "taikhoan";
            menuItem2.Text = "TÀI KHOẢN";
            menuItem3.ID = "systemlog";
            menuItem3.Name = "systemlog";
            menuItem3.Text = "NHẬT KÍ HỆ THỐNG";
            menuItem4.ID = "translog";
            menuItem4.Name = "translog";
            menuItem4.Text = "NHẬT KÍ GIAO DỊCH";
            menuItem5.ID = "nhommay";
            menuItem5.Name = "nhommay";
            menuItem5.Text = "NHÓM MÁY";
            menuItem6.ID = "nhomnguoisudung";
            menuItem6.Name = "nhomnguoisudung";
            menuItem6.Text = "NHÓM NGƯỜI SỬ DỤNG";
            menu1.Items.Add(menuItem1);
            menu1.Items.Add(menuItem2);
            menu1.Items.Add(menuItem3);
            menu1.Items.Add(menuItem4);
            menu1.Items.Add(menuItem5);
            menu1.Items.Add(menuItem6);
            menu1.Location = new Point(0, 28);
            menu1.Mode = AntdUI.TMenuMode.Horizontal_Arrow;
            menu1.Name = "menu1";
            menu1.RightToLeft = RightToLeft.No;
            menu1.Size = new Size(800, 50);
            menu1.TabIndex = 3;
            menu1.Text = "menu1";
            menu1.SelectChanged += menu1_SelectChanged;
            // 
            // tableLayoutPanel1
            // 
            tableLayoutPanel1.ColumnCount = 6;
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle());
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle());
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle());
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle());
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle());
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 20F));
            tableLayoutPanel1.Controls.Add(lbl_Percent, 5, 0);
            tableLayoutPanel1.Controls.Add(lbl_amount, 4, 0);
            tableLayoutPanel1.Controls.Add(lbl_inuse, 3, 0);
            tableLayoutPanel1.Controls.Add(lbl_offline, 2, 0);
            tableLayoutPanel1.Controls.Add(labelTime1, 0, 0);
            tableLayoutPanel1.Controls.Add(lbl_online, 1, 0);
            tableLayoutPanel1.Dock = DockStyle.Bottom;
            tableLayoutPanel1.Font = new Font("Segoe UI", 7.8F, FontStyle.Regular, GraphicsUnit.Point, 0);
            tableLayoutPanel1.Location = new Point(0, 432);
            tableLayoutPanel1.Name = "tableLayoutPanel1";
            tableLayoutPanel1.RowCount = 1;
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel1.Size = new Size(800, 42);
            tableLayoutPanel1.TabIndex = 5;
            // 
            // lbl_Percent
            // 
            lbl_Percent.Location = new Point(624, 3);
            lbl_Percent.Name = "lbl_Percent";
            lbl_Percent.Size = new Size(90, 29);
            lbl_Percent.TabIndex = 5;
            lbl_Percent.Text = "Tỷ lệ";
            // 
            // lbl_amount
            // 
            lbl_amount.Location = new Point(522, 3);
            lbl_amount.Name = "lbl_amount";
            lbl_amount.Size = new Size(96, 29);
            lbl_amount.TabIndex = 4;
            lbl_amount.Text = "Tổng số:";
            // 
            // lbl_inuse
            // 
            lbl_inuse.Location = new Point(367, 3);
            lbl_inuse.Name = "lbl_inuse";
            lbl_inuse.Size = new Size(149, 29);
            lbl_inuse.TabIndex = 3;
            lbl_inuse.Text = "Đang sử dụng:";
            // 
            // lbl_offline
            // 
            lbl_offline.Location = new Point(250, 3);
            lbl_offline.Name = "lbl_offline";
            lbl_offline.Size = new Size(111, 29);
            lbl_offline.TabIndex = 2;
            lbl_offline.Text = "Mất kết nối:";
            // 
            // labelTime1
            // 
            labelTime1.Location = new Point(3, 3);
            labelTime1.Name = "labelTime1";
            labelTime1.Size = new Size(124, 29);
            labelTime1.TabIndex = 0;
            labelTime1.Text = "labelTime1";
            // 
            // lbl_online
            // 
            lbl_online.Location = new Point(133, 3);
            lbl_online.Name = "lbl_online";
            lbl_online.Size = new Size(111, 29);
            lbl_online.TabIndex = 1;
            lbl_online.Text = "Trực tuyến:";
            lbl_online.Click += label2_Click;
            // 
            // báoCáoToolStripMenuItem
            // 
            báoCáoToolStripMenuItem.DropDownItems.AddRange(new ToolStripItem[] { báoCáoDịchVụToolStripMenuItem, báoCáoGiaoDịchToolStripMenuItem, xuấtBáoCáoToolStripMenuItem });
            báoCáoToolStripMenuItem.Name = "báoCáoToolStripMenuItem";
            báoCáoToolStripMenuItem.Size = new Size(77, 24);
            báoCáoToolStripMenuItem.Text = "Báo cáo";
            // 
            // báoCáoDịchVụToolStripMenuItem
            // 
            báoCáoDịchVụToolStripMenuItem.Name = "báoCáoDịchVụToolStripMenuItem";
            báoCáoDịchVụToolStripMenuItem.Size = new Size(212, 26);
            báoCáoDịchVụToolStripMenuItem.Text = "Báo cáo dịch vụ";
            // 
            // báoCáoGiaoDịchToolStripMenuItem
            // 
            báoCáoGiaoDịchToolStripMenuItem.Name = "báoCáoGiaoDịchToolStripMenuItem";
            báoCáoGiaoDịchToolStripMenuItem.Size = new Size(212, 26);
            báoCáoGiaoDịchToolStripMenuItem.Text = "Báo cáo giao dịch";
            // 
            // xuấtBáoCáoToolStripMenuItem
            // 
            xuấtBáoCáoToolStripMenuItem.Name = "xuấtBáoCáoToolStripMenuItem";
            xuấtBáoCáoToolStripMenuItem.Size = new Size(212, 26);
            xuấtBáoCáoToolStripMenuItem.Text = "Xuất báo cáo";
            // 
            // menuStrip1
            // 
            menuStrip1.ImageScalingSize = new Size(20, 20);
            menuStrip1.Items.AddRange(new ToolStripItem[] { báoCáoToolStripMenuItem });
            menuStrip1.Location = new Point(0, 0);
            menuStrip1.Name = "menuStrip1";
            menuStrip1.Size = new Size(800, 28);
            menuStrip1.TabIndex = 4;
            menuStrip1.Text = "menuStrip1";
            // 
            // MainScreen
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 474);
            Controls.Add(tableLayoutPanel1);
            Controls.Add(menu1);
            Controls.Add(panel1);
            Controls.Add(menuStrip1);
            MainMenuStrip = menuStrip1;
            Name = "MainScreen";
            Text = "Form1";
            Load += MainScreen_Load;
            Shown += MainScreen_Shown;
            tableLayoutPanel1.ResumeLayout(false);
            menuStrip1.ResumeLayout(false);
            menuStrip1.PerformLayout();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion
        private AntdUI.Panel panel1;
        private AntdUI.Menu menu1;
        private TableLayoutPanel tableLayoutPanel1;
        private ToolStripMenuItem báoCáoToolStripMenuItem;
        private MenuStrip menuStrip1;
        private AntdUI.LabelTime labelTime1;
        private AntdUI.Label lbl_online;
        private AntdUI.Label lbl_inuse;
        private AntdUI.Label lbl_offline;
        private AntdUI.Label lbl_Percent;
        private AntdUI.Label lbl_amount;
        private ToolStripMenuItem báoCáoDịchVụToolStripMenuItem;
        private ToolStripMenuItem báoCáoGiaoDịchToolStripMenuItem;
        private ToolStripMenuItem xuấtBáoCáoToolStripMenuItem;
    }
}
