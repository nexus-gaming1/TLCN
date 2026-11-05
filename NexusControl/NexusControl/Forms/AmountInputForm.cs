using System.Drawing;
using System.Windows.Forms;

namespace NexusControl.Forms
{
    public sealed class AmountInputForm : Form
    {
        private readonly NumericUpDown _amountInput;

        public decimal Amount => _amountInput.Value;

        public AmountInputForm(string title)
        {
            Text = title;
            StartPosition = FormStartPosition.CenterParent;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            ClientSize = new Size(280, 120);
            MinimizeBox = false;
            MaximizeBox = false;
            ShowInTaskbar = false;

            _amountInput = new NumericUpDown
            {
                DecimalPlaces = 0,
                Minimum = 1000,
                Maximum = 1000000000,
                Increment = 10000,
                ThousandsSeparator = true,
                Location = new Point(20, 20),
                Width = 240
            };

            var confirmButton = new Button
            {
                Text = "Xác nhận",
                DialogResult = DialogResult.OK,
                Location = new Point(155, 65)
            };
            var cancelButton = new Button
            {
                Text = "Hủy",
                DialogResult = DialogResult.Cancel,
                Location = new Point(65, 65)
            };

            Controls.AddRange(new Control[] { _amountInput, cancelButton, confirmButton });
            AcceptButton = confirmButton;
            CancelButton = cancelButton;
        }

        public static bool TryShow(IWin32Window owner, string title, out decimal amount)
        {
            using var dialog = new AmountInputForm(title);
            var result = dialog.ShowDialog(owner);
            amount = dialog.Amount;
            return result == DialogResult.OK;
        }
    }
}
