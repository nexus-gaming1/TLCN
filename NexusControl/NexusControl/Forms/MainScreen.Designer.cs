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
            lbl_Username = new AntdUI.Label();
            SuspendLayout();
            // 
            // lbl_Username
            // 
            lbl_Username.Location = new Point(322, 12);
            lbl_Username.Name = "lbl_Username";
            lbl_Username.Size = new Size(94, 29);
            lbl_Username.TabIndex = 0;
            lbl_Username.Text = "Chào mừng";
            // 
            // MainScreen
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(lbl_Username);
            Name = "MainScreen";
            Text = "Form1";
            Load += MainScreen_Load;
            Shown += MainScreen_Shown;
            ResumeLayout(false);
        }

        #endregion

        private AntdUI.Label lbl_Username;
    }
}
