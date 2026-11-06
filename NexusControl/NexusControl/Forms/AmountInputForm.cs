using System;
using System.Drawing;
using System.Windows.Forms;

namespace NexusControl.Forms
{
    public sealed partial class AmountInputForm : Form
    {
        private readonly decimal _currentRealBalance;
        private readonly decimal _currentBonusBalance;
        private readonly bool _isFreeBalanceTransaction;
        private readonly bool _isTopUp;

        public decimal Amount => _amountInput.Value;

        public AmountInputForm()
            : this("Tặng miễn phí", 500000, 50000, true, true)
        {
        }

        public AmountInputForm(
            string title,
            decimal currentRealBalance = 0,
            decimal currentBonusBalance = 0,
            bool isFreeBalanceTransaction = false,
            bool isTopUp = true)
        {
            _currentRealBalance = currentRealBalance;
            _currentBonusBalance = currentBonusBalance;
            _isFreeBalanceTransaction = isFreeBalanceTransaction;
            _isTopUp = isTopUp;

            InitializeComponent();
            Text = title;
            ConfigureForm();
            UpdatePreview();
        }

        private void ConfigureForm()
        {
            if (!_isFreeBalanceTransaction)
            {
                ClientSize = new Size(280, 120);
                _amountInput.Minimum = 1000;
                _amountInput.Location = new Point(20, 20);
                _amountInput.Width = 240;
                _transactionLabel.Visible = false;
                _amountInWordsLabel.Visible = false;
                _balanceSummaryLabel.Visible = false;
                _validationLabel.Visible = false;
                _cancelButton.Location = new Point(65, 65);
                _confirmButton.Location = new Point(155, 65);
                _confirmButton.DialogResult = DialogResult.OK;
                return;
            }

            _transactionLabel.Text = _isTopUp ? "Tặng miễn phí" : "Trừ miễn phí";
            _transactionLabel.ForeColor = _isTopUp ? Color.SeaGreen : Color.Firebrick;
            _amountInput.Minimum = 0;
            _amountInput.Location = new Point(20, 40);
            _amountInput.Width = 410;
            _cancelButton.Location = new Point(245, 185);
            _confirmButton.Location = new Point(335, 185);
            _confirmButton.DialogResult = DialogResult.None;
        }

        private void ConfirmButton_Click(object? sender, EventArgs e)
        {
            if (!IsValidAmount())
            {
                DialogResult = DialogResult.None;
                return;
            }

            DialogResult = DialogResult.OK;
        }

        private void UpdatePreview()
        {
            if (!_isFreeBalanceTransaction) return;

            var amount = _amountInput.Value;
            var valid = IsValidAmount();
            var newBonus = _isTopUp ? _currentBonusBalance + amount : _currentBonusBalance - amount;
            _balanceSummaryLabel.Text =
                $"Thực tế: {_currentRealBalance:N0} → {_currentRealBalance:N0} VNĐ\r\n" +
                $"Miễn phí: {_currentBonusBalance:N0} → {newBonus:N0} VNĐ";
            _amountInWordsLabel.Text = $"Bằng chữ: {ToVietnameseWords(amount)}";
            _validationLabel.Text = valid
                ? string.Empty
                : amount <= 0 ? "Số tiền phải lớn hơn 0." : "Không được trừ vượt quá số dư miễn phí.";
            _confirmButton.Enabled = valid;
        }

        private bool IsValidAmount()
        {
            return _amountInput.Value > 0 &&
                (_isTopUp || _amountInput.Value <= _currentBonusBalance);
        }

        private static string ToVietnameseWords(decimal value)
        {
            if (value == 0) return "Không đồng";
            return $"{ReadVietnameseNumber((long)decimal.Truncate(value))} đồng";
        }

        private static string ReadVietnameseNumber(long number)
        {
            if (number == 0) return "Không";
            if (number < 0) return $"Âm {ReadVietnameseNumber(-number)}";

            var units = new[] { "", "nghìn", "triệu", "tỷ" };
            var parts = new System.Collections.Generic.List<string>();
            var unitIndex = 0;
            while (number > 0)
            {
                var group = (int)(number % 1000);
                if (group > 0)
                {
                    var groupText = ReadVietnameseGroup(group);
                    if (unitIndex > 0) groupText += $" {units[unitIndex % units.Length]}";
                    parts.Insert(0, groupText);
                }
                number /= 1000;
                unitIndex++;
            }

            return string.Join(" ", parts);
        }

        private static string ReadVietnameseGroup(int number)
        {
            var digits = new[] { "không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín" };
            var hundreds = number / 100;
            var tens = number / 10 % 10;
            var ones = number % 10;
            var result = hundreds > 0 ? $"{digits[hundreds]} trăm" : string.Empty;
            if (tens > 1) result += $" {digits[tens]} mươi";
            else if (tens == 1) result += " mười";
            else if (hundreds > 0 && ones > 0) result += " lẻ";
            if (ones > 0)
            {
                var oneText = ones == 1 && tens > 1 ? "mốt" : ones == 5 && tens > 0 ? "lăm" : digits[ones];
                result += $" {oneText}";
            }
            return result.Trim();
        }

        public static bool TryShow(IWin32Window owner, string title, out decimal amount)
        {
            using var dialog = new AmountInputForm(title);
            var result = dialog.ShowDialog(owner);
            amount = dialog.Amount;
            return result == DialogResult.OK;
        }

        public static bool TryShowFreeBalance(
            IWin32Window owner,
            string title,
            decimal currentRealBalance,
            decimal currentBonusBalance,
            bool isTopUp,
            out decimal amount)
        {
            using var dialog = new AmountInputForm(
                title, currentRealBalance, currentBonusBalance, true, isTopUp);
            var result = dialog.ShowDialog(owner);
            amount = dialog.Amount;
            return result == DialogResult.OK;
        }
    }
}
