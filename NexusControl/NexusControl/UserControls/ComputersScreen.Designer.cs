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
            dgv_Computer = new DataGridView();
            computername = new DataGridViewTextBoxColumn();
            btnRefresh = new Button();
            lblResult = new Label();
            ((System.ComponentModel.ISupportInitialize)dgv_Computer).BeginInit();
            SuspendLayout();
            // 
            // dgv_Computer
            // 
            dgv_Computer.AllowUserToAddRows = false;
            dgv_Computer.AllowUserToDeleteRows = false;
            dgv_Computer.AllowUserToResizeRows = false;
            dgv_Computer.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dgv_Computer.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            dgv_Computer.Columns.AddRange(new DataGridViewColumn[] { computername });
            dgv_Computer.Dock = DockStyle.Fill;
            dgv_Computer.Location = new Point(0, 0);
            dgv_Computer.MultiSelect = false;
            dgv_Computer.Name = "dgv_Computer";
            dgv_Computer.ReadOnly = true;
            dgv_Computer.RowHeadersVisible = false;
            dgv_Computer.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dgv_Computer.Size = new Size(663, 438);
            dgv_Computer.TabIndex = 0;
            // 
            // computername
            // 
            computername.DataPropertyName = "ComputerName";
            computername.HeaderText = "Tên máy";
            computername.MinimumWidth = 6;
            computername.Name = "computername";
            computername.ReadOnly = true;
            // 
            // btnRefresh
            // 
            btnRefresh.Dock = DockStyle.Right;
            btnRefresh.Location = new Point(663, 0);
            btnRefresh.Name = "btnRefresh";
            btnRefresh.Size = new Size(114, 438);
            btnRefresh.TabIndex = 2;
            btnRefresh.Text = "Tải lại";
            btnRefresh.UseVisualStyleBackColor = true;
            btnRefresh.Click += btnRefresh_Click;
            // 
            // lblResult
            // 
            lblResult.Dock = DockStyle.Fill;
            lblResult.Location = new Point(0, 0);
            lblResult.Name = "lblResult";
            lblResult.Padding = new Padding(8, 0, 0, 0);
            lblResult.Size = new Size(663, 438);
            lblResult.TabIndex = 1;
            lblResult.Text = "Đang tải...";
            lblResult.TextAlign = ContentAlignment.MiddleLeft;
            // 
            // ComputersScreen
            // 
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            Controls.Add(dgv_Computer);
            Controls.Add(lblResult);
            Controls.Add(btnRefresh);
            Name = "ComputersScreen";
            Size = new Size(777, 438);
            Load += ComputersScreen_Load;
            ((System.ComponentModel.ISupportInitialize)dgv_Computer).EndInit();
            ResumeLayout(false);
        }

        #endregion

        private DataGridView dgv_Computer;
        private DataGridViewTextBoxColumn computername;
        private Button btnRefresh;
        private Label lblResult;
    }
}
