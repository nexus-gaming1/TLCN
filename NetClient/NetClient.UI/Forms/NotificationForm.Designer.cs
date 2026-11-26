namespace NetClient.UI
{
    partial class NotificationForm
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
            collapse1 = new AntdUI.Collapse();
            SuspendLayout();
            // 
            // collapse1
            // 
            collapse1.Dock = DockStyle.Fill;
            collapse1.Location = new Point(0, 0);
            collapse1.Name = "collapse1";
            collapse1.ResizingLineThickness = 2F;
            collapse1.Size = new Size(800, 450);
            collapse1.TabIndex = 0;
            collapse1.Text = "collapse1";
            // 
            // NotificationForm
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(800, 450);
            Controls.Add(collapse1);
            Name = "NotificationForm";
            Text = "NotificationForm";
            Activated += NotificationForm_Activated;
            Deactivate += NotificationForm_Deactivate;
            FormClosing += NotificationForm_FormClosing;
            ResumeLayout(false);
        }

        #endregion

        private AntdUI.Collapse collapse1;
    }
}