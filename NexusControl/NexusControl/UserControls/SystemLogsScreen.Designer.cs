namespace NexusControl.UserControls
{
    partial class SystemLogsScreen
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
            label1 = new AntdUI.Label();
            SuspendLayout();
            // 
            // label1
            // 
            label1.Location = new Point(444, 168);
            label1.Name = "label1";
            label1.Size = new Size(94, 29);
            label1.TabIndex = 0;
            label1.Text = "Log hệ thống";
            // 
            // SystemLogsScreen
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            Controls.Add(label1);
            Name = "SystemLogsScreen";
            Size = new Size(730, 345);
            ResumeLayout(false);
        }

        #endregion

        private AntdUI.Label label1;
    }
}
