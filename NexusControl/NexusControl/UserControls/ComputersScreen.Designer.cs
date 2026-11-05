namespace NexusControl.UserControls
{
    partial class ComputersScreen
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

        #region Component Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            lblResult = new Label();
            tb_Computer = new AntdUI.Table();
            SuspendLayout();
            // 
            // lblResult
            // 
            lblResult.Dock = DockStyle.Fill;
            lblResult.Location = new Point(0, 0);
            lblResult.Name = "lblResult";
            lblResult.Padding = new Padding(8, 0, 0, 0);
            lblResult.Size = new Size(777, 438);
            lblResult.TabIndex = 1;
            lblResult.Text = "Đang tải...";
            lblResult.TextAlign = ContentAlignment.MiddleLeft;
            // 
            // tb_Computer
            // 
            tb_Computer.Dock = DockStyle.Fill;
            tb_Computer.Gap = 12;
            tb_Computer.Location = new Point(0, 0);
            tb_Computer.Name = "tb_Computer";
            tb_Computer.Size = new Size(777, 438);
            tb_Computer.TabIndex = 2;
            tb_Computer.Text = "tb_Computer";
            tb_Computer.CellClick += tb_Computer_CellClick;
            // 
            // ComputersScreen
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            Controls.Add(tb_Computer);
            Controls.Add(lblResult);
            Name = "ComputersScreen";
            Size = new Size(777, 438);
            Load += ComputersScreen_Load;
            ResumeLayout(false);
        }

        #endregion
        private Label lblResult;
        private AntdUI.Table tb_Computer;
    }
}
