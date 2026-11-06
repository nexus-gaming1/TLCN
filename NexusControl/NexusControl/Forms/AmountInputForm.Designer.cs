#nullable disable

namespace NexusControl.Forms
{
    partial class AmountInputForm
    {
        private System.ComponentModel.IContainer components = null!;
        private NumericUpDown _amountInput = null!;
        private Label _transactionLabel = null!;
        private Label _amountInWordsLabel = null!;
        private Label _balanceSummaryLabel = null!;
        private Label _validationLabel = null!;
        private Button _cancelButton = null!;
        private Button _confirmButton = null!;

        protected override void Dispose(bool disposing)
        {
            if (disposing && components != null)
            {
                components.Dispose();
            }

            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            components = new System.ComponentModel.Container();
            _amountInput = new NumericUpDown();
            _transactionLabel = new Label();
            _amountInWordsLabel = new Label();
            _balanceSummaryLabel = new Label();
            _validationLabel = new Label();
            _cancelButton = new Button();
            _confirmButton = new Button();
            ((System.ComponentModel.ISupportInitialize)_amountInput).BeginInit();
            SuspendLayout();
            //
            // _amountInput
            //
            _amountInput.DecimalPlaces = 0;
            _amountInput.Increment = 10000;
            _amountInput.Location = new Point(20, 40);
            _amountInput.Maximum = 1000000000;
            _amountInput.Name = "_amountInput";
            _amountInput.Size = new Size(410, 27);
            _amountInput.TabIndex = 0;
            _amountInput.ThousandsSeparator = true;
            _amountInput.ValueChanged += AmountInput_ValueChanged;
            //
            // _transactionLabel
            //
            _transactionLabel.AutoSize = true;
            _transactionLabel.Font = new Font(Font, FontStyle.Bold);
            _transactionLabel.Location = new Point(20, 15);
            _transactionLabel.Name = "_transactionLabel";
            _transactionLabel.Size = new Size(120, 20);
            _transactionLabel.TabIndex = 1;
            _transactionLabel.Text = "Tặng miễn phí";
            //
            // _amountInWordsLabel
            //
            _amountInWordsLabel.AutoSize = true;
            _amountInWordsLabel.Location = new Point(20, 78);
            _amountInWordsLabel.Name = "_amountInWordsLabel";
            _amountInWordsLabel.Size = new Size(100, 20);
            _amountInWordsLabel.TabIndex = 2;
            //
            // _balanceSummaryLabel
            //
            _balanceSummaryLabel.AutoSize = true;
            _balanceSummaryLabel.Location = new Point(20, 108);
            _balanceSummaryLabel.Name = "_balanceSummaryLabel";
            _balanceSummaryLabel.Size = new Size(250, 40);
            _balanceSummaryLabel.TabIndex = 3;
            //
            // _validationLabel
            //
            _validationLabel.AutoSize = true;
            _validationLabel.ForeColor = Color.Firebrick;
            _validationLabel.Location = new Point(20, 150);
            _validationLabel.Name = "_validationLabel";
            _validationLabel.Size = new Size(1, 20);
            _validationLabel.TabIndex = 4;
            //
            // _cancelButton
            //
            _cancelButton.DialogResult = DialogResult.Cancel;
            _cancelButton.Location = new Point(245, 185);
            _cancelButton.Name = "_cancelButton";
            _cancelButton.Size = new Size(80, 29);
            _cancelButton.TabIndex = 5;
            _cancelButton.Text = "Hủy";
            _cancelButton.UseVisualStyleBackColor = true;
            //
            // _confirmButton
            //
            _confirmButton.Location = new Point(335, 185);
            _confirmButton.Name = "_confirmButton";
            _confirmButton.Size = new Size(80, 29);
            _confirmButton.TabIndex = 6;
            _confirmButton.Text = "Xác nhận";
            _confirmButton.UseVisualStyleBackColor = true;
            _confirmButton.Click += ConfirmButton_Click;
            //
            // AmountInputForm
            //
            AcceptButton = _confirmButton;
            AutoScaleDimensions = new SizeF(8F, 20F);
            AutoScaleMode = AutoScaleMode.Font;
            CancelButton = _cancelButton;
            ClientSize = new Size(460, 280);
            Controls.Add(_confirmButton);
            Controls.Add(_cancelButton);
            Controls.Add(_validationLabel);
            Controls.Add(_balanceSummaryLabel);
            Controls.Add(_amountInWordsLabel);
            Controls.Add(_amountInput);
            Controls.Add(_transactionLabel);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            Name = "AmountInputForm";
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.CenterParent;
            Text = "Tặng miễn phí";
            ((System.ComponentModel.ISupportInitialize)_amountInput).EndInit();
            ResumeLayout(false);
            PerformLayout();
        }

        private void AmountInput_ValueChanged(object sender, System.EventArgs e)
        {
            UpdatePreview();
        }
    }
}
