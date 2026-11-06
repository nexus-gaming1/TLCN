using System;
using System.Collections.Generic;
using System.Windows.Forms;
using NexusControl.Constants;
using NexusControl.Enums;

namespace NexusControl.Forms
{
    public partial class AmountInputForm : Form
    {
        private readonly BalanceAction _action;
        private readonly decimal _realBalance;
        private readonly decimal _bonusBalance;

        public decimal Amount => ip_Money.Value;

        public AmountInputForm()
            : this(BalanceAction.BonusAdd, "Máy mẫu", "Người dùng mẫu", 500000, 50000)
        {
        }

        public AmountInputForm(
            BalanceAction balanceAction,
            string computerName,
            string username,
            decimal realBalance,
            decimal bonusBalance)
        {
            InitializeComponent();
            divider1.Text = null;
            _action = balanceAction;
            _realBalance = realBalance;
            _bonusBalance = bonusBalance;
            lbl_Computer.Text = $"Máy tính: {computerName}";
            lbl_User.Text = $"Người dùng: {username}";
            lbl_balance.Text = $"{realBalance:N0}đ";
            lbl_bonus_balance.Text = $"{bonusBalance:N0}đ";
            ConfigShield();
            lbl_balance.ForeColor = AppColors.Blue;
            lbl_bonus_balance.ForeColor = AppColors.Purple;
            ip_Money.Value = 0;
            UpdatePreview();
        }

        private void ConfigShield()
        {
            if (_action == BalanceAction.TopUp || _action == BalanceAction.BonusAdd)
            {
                sd_Action.LabelColor = AppColors.Green;
                sd_Action.Label = "Thêm";
            }
            else
            {
                sd_Action.LabelColor = AppColors.Red;
                sd_Action.Label = "Trừ";
            }

            if (_action == BalanceAction.BonusAdd || _action == BalanceAction.BonusDeduct)
            {
                sd_Action.Color = AppColors.Purple;
                sd_Action.Text = "Tiền miễn phí";
            }
            else
            {
                sd_Action.Text = "Tiền Tài khoản";
                sd_Action.Color = AppColors.Blue;
            }
        }

        private void divider1_Click(object sender, EventArgs e)
        {
        }

        private void ip_Money_ValueChanged(object sender, AntdUI.DecimalEventArgs e)
        {
            UpdatePreview();
        }

        private string ip_Money_ValueFormatter(object sender, AntdUI.InputNumberEventArgs e)
        {
            return e.Value.ToString() + "đ";
        }

        private void UpdatePreview()
        {
            var amount = Amount;
            var isTopUp = _action == BalanceAction.TopUp || _action == BalanceAction.BonusAdd;
            var isBonus = _action == BalanceAction.BonusAdd || _action == BalanceAction.BonusDeduct;
            var newRealBalance = isBonus || isTopUp
                ? _realBalance
                : _realBalance - amount;
            var newBonusBalance = isBonus
                ? (isTopUp ? _bonusBalance + amount : _bonusBalance - amount)
                : _bonusBalance;

            lbl_ByText.Text = $"Bằng chữ: {ToVietnameseWords(amount)}";
            lbl_balancePpreview.Text = $"{newRealBalance:N0}đ";
            lbl_bonus_Preview.Text = $"{newBonusBalance:N0}đ";
            buttonShadow1.Enabled = IsValidAmount(amount);
        }

        private bool IsValidAmount(decimal amount)
        {
            if (amount <= 0) return false;
            return _action != BalanceAction.BonusDeduct || amount <= _bonusBalance;
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
            var parts = new List<string>();
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
                var oneText = ones == 1 && tens > 1
                    ? "mốt"
                    : ones == 5 && tens > 0
                        ? "lăm"
                        : digits[ones];
                result += $" {oneText}";
            }

            return result.Trim();
        }

        private void buttonShadow1_Click(object sender, EventArgs e)
        {
            if (IsValidAmount(Amount))
            {
                DialogResult = DialogResult.OK;
            }
        }
    }
}
