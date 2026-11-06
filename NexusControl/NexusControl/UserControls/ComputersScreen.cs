using AntdUI;
using NexusControl.Forms;
using NexusControl.Models;
using NexusControl.Services;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
namespace NexusControl.UserControls
{
    public partial class ComputersScreen : UserControl
    {
        private readonly ComputerApiService _computerApiService = new();
        private readonly CancellationTokenSource _cancellationTokenSource = new();
        private readonly UserSessionService _userSessionService = UserSessionService.Current;
        private MachineSocketService? _machineSocketService;
        private ComputerGridRow? _selectedComputer;
        public ComputersScreen()
        {
            InitializeComponent();
            _userSessionService.UserChanged += UserSessionService_UserChanged;
            Disposed += ComputersScreen_Disposed;

        }

        private async void UserSessionService_UserChanged(object? sender, UserDto? user)
        {
            if (user == null || IsDisposed)
            {
                return;
            }

            if (InvokeRequired)
            {
                if (IsHandleCreated)
                {
                    BeginInvoke(new Action(() => _ = ReloadAsync()));
                }

                return;
            }

            await ReloadAsync();
        }

        private async void ComputersScreen_Load(object sender, EventArgs e)
        {
            ConfigureComputerGrid();

            await ReloadAsync();
        }

        public async Task ReloadAsync()
        {
            ConfigureComputerGrid();

            lblResult.Text = "Đang tải...";
            Cursor = Cursors.WaitCursor;

            try
            {
                var response = await _computerApiService.GetOverviewAsync(
                    _cancellationTokenSource.Token);

                if (!response.IsSuccess)
                {
                    MessageBox.Show(
                        response.Message ?? "Không thể tải danh sách máy trạm.",
                        "Lỗi tải dữ liệu",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }

                tb_Computer.DataSource = (response.Data ?? new List<ComputerOverviewDto>())
                    .ConvertAll(ComputerGridRow.FromDto);
                await ConnectMachineSocketAsync();
                lblResult.Text = response.Data?.Count > 0
                    ? $"Đã tải {response.Data.Count} máy trạm"
                    : "Không có máy trạm";
            }
            catch (OperationCanceledException)
            {
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }

        private async Task ConnectMachineSocketAsync()
        {
            if (_machineSocketService != null)
            {
                return;
            }


            _machineSocketService = new MachineSocketService(ApiClient.Instance.BaseUrl);
            _machineSocketService.MachinesUpdated += OnMachinesUpdated;
            _machineSocketService.MachineUpdated += OnMachineUpdated;

            try
            {
                await _machineSocketService.ConnectAsync();
            }
            catch (Exception ex)
            {
                _machineSocketService.MachinesUpdated -= OnMachinesUpdated;
                _machineSocketService.MachineUpdated -= OnMachineUpdated;
                await _machineSocketService.DisposeAsync();
                _machineSocketService = null;
                System.Diagnostics.Debug.WriteLine($"Không thể kết nối socket máy trạm: {ex.Message}");
            }
        }

        private void OnMachinesUpdated(IReadOnlyDictionary<string, MachineSocketDto> machines)
        {
            if (IsDisposed)
            {
                return;
            }

            if (InvokeRequired)
            {
                BeginInvoke(() => OnMachinesUpdated(machines));
                return;
            }

            if (tb_Computer.DataSource is not List<ComputerGridRow> rows)
            {
                return;
            }

            foreach (var machine in machines.Values)
            {
                UpdateRow(rows, machine);
            }

            tb_Computer.Refresh();
        }

        private void OnMachineUpdated(MachineSocketDto machine)
        {
            if (IsDisposed)
            {
                return;
            }

            if (InvokeRequired)
            {
                BeginInvoke(() => OnMachineUpdated(machine));
                return;
            }

            if (tb_Computer.DataSource is List<ComputerGridRow> rows &&
                UpdateRow(rows, machine))
            {
                tb_Computer.Refresh();
            }
        }

        private static bool UpdateRow(
            List<ComputerGridRow> rows,
            MachineSocketDto machine)
        {
            var row = rows.Find(item =>
                IsSameNetworkAddress(item.IpAddress, machine.LocalIp) ||
                IsSameMacAddress(item.MacAddress, machine.MacAddress));

            if (row == null)
            {
                return false;
            }

            row.Status = ComputerGridRow.ToFriendlyStatus(machine.Status);
            row.CurrentUsername = ComputerGridRow.ValueOrPlaceholder(machine.CurrentUser);
            row.MemberId = machine.MemberId;
            row.SessionStartedAt = machine.SessionStartedAt?.ToLocalTime()
                .ToString("dd/MM/yyyy HH:mm:ss") ?? "--";
            return true;
        }

        private static bool IsSameNetworkAddress(string? left, string? right)
        {
            return !string.IsNullOrWhiteSpace(left) &&
                !string.IsNullOrWhiteSpace(right) &&
                string.Equals(left.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsSameMacAddress(string? left, string? right)
        {
            if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right))
            {
                return false;
            }

            static string NormalizeMac(string value)
            {
                return value.Replace(":", string.Empty)
                    .Replace("-", string.Empty)
                    .Replace(".", string.Empty)
                    .Trim()
                    .ToUpperInvariant();
            }

            return NormalizeMac(left) == NormalizeMac(right);
        }

        private async void ComputersScreen_Disposed(object? sender, EventArgs e)
        {
            _userSessionService.UserChanged -= UserSessionService_UserChanged;
            _cancellationTokenSource.Cancel();
            if (_machineSocketService != null)
            {
                _machineSocketService.MachinesUpdated -= OnMachinesUpdated;
                _machineSocketService.MachineUpdated -= OnMachineUpdated;
                await _machineSocketService.DisposeAsync();
                _machineSocketService = null;
            }

            _cancellationTokenSource.Dispose();
        }


        private void ConfigureComputerGrid()
        {
            tb_Computer.Columns = new AntdUI.ColumnCollection
            {
                new AntdUI.Column("ComputerName", "Tên máy"),
                new AntdUI.Column("Status", "Trạng thái"),
                new AntdUI.Column("IpAddress", "IP"),
                new AntdUI.Column("MacAddress", "MAC"),
                new AntdUI.Column("CurrentUsername", "Người sử dụng"),
                new AntdUI.Column("SessionStartedAt", "Thời gian bắt đầu"),
                new AntdUI.Column("RemainingTime", "Thời gian còn lại"),
                new AntdUI.Column("ZoneName", "Khu vực"),
                new AntdUI.Column("HourlyRate", "Đơn giá/giờ"),
                new AntdUI.Column("HasActiveCombo", "Đang sử dụng Combo")
            };
            if (UserSessionService.CurrentRole == "ADMIN")
            {
                tb_Computer.Columns["IpAddress"]?.Visible = true;
                tb_Computer.Columns["MacAddress"]?.Visible = true;
            }
            else
            {
                tb_Computer.Columns["IpAddress"]?.Visible = false;
                tb_Computer.Columns["MacAddress"]?.Visible = false;
            }
            tb_Computer.Refresh();
        }

        private sealed class ComputerGridRow
        {
            public int? MemberId { get; set; }
            public string ComputerName { get; init; } = "--";
            public string? IpAddress { get; init; }
            public string? MacAddress { get; init; }
            public string Status { get; set; } = "--";
            public string CurrentUsername { get; set; } = "--";
            public string SessionStartedAt { get; set; } = "--";
            public string RemainingTime { get; init; } = "--";
            public string ZoneName { get; init; } = "--";
            public string HourlyRate { get; init; } = "--";
            public string HasActiveCombo { get; init; } = "Không";

            public static ComputerGridRow FromDto(ComputerOverviewDto dto)
            {
                return new ComputerGridRow
                {
                    ComputerName = ValueOrPlaceholder(dto.ComputerName),
                    MemberId = dto.MemberId,
                    IpAddress = dto.IpAddress,
                    MacAddress = dto.MacAddress,
                    Status = ToFriendlyStatus(dto.Status),
                    CurrentUsername = ValueOrPlaceholder(dto.CurrentUsername),
                    SessionStartedAt = dto.SessionStartedAt?.ToLocalTime()
                        .ToString("dd/MM/yyyy HH:mm:ss") ?? "--",
                    RemainingTime = FormatRemainingTime(dto.RemainingMinutes),
                    ZoneName = ValueOrPlaceholder(dto.ZoneName),
                    HourlyRate = dto.HourlyRate.HasValue
                        ? $"{dto.HourlyRate.Value:N0} VNĐ"
                        : "--",
                    HasActiveCombo = dto.HasActiveCombo ? "Có" : "Không"
                };
            }

            public static string ValueOrPlaceholder(string? value)
            {
                return string.IsNullOrWhiteSpace(value) ? "--" : value;
            }

            private static string FormatRemainingTime(int? minutes)
            {
                if (!minutes.HasValue) return "--";
                if (minutes.Value <= 0) return "Hết thời gian";

                var hours = minutes.Value / 60;
                var remainingMinutes = minutes.Value % 60;
                return hours > 0
                    ? $"{hours} giờ {remainingMinutes} phút"
                    : $"{remainingMinutes} phút";
            }

            public static string ToFriendlyStatus(string? status)
            {
                return status?.ToUpperInvariant() switch
                {
                    "ONLINE" => "Đang online",
                    "OFFLINE" => "Ngoại tuyến",
                    "IN_USE" => "Đang sử dụng",
                    "LOCKED" => "Đã khóa",
                    "MAINTENANCE" => "Bảo trì",
                    "PAUSE" => "Tạm dừng",
                    "REMOTE" => "Điều khiển từ xa",
                    _ => ValueOrPlaceholder(status)
                };
            }

        }
        private void ShowComputerContextMenu()
        {
            var items = new AntdUI.IContextMenuStripItem[]
            {
                    new AntdUI.ContextMenuStripItem("Thông tin máy")
                    {
                        ID = "detail"
                    },
                    new AntdUI.ContextMenuStripItem("Đăng xuất máy")
                    {
                        ID = "logout"
                    },
                    new AntdUI.ContextMenuStripItem("Khởi động lại")
                    {
                        ID = "restart"
                    },
                    new AntdUI.ContextMenuStripItem("Tắt máy")
                    {
                        ID = "shutdown"
                    },
                    new AntdUI.ContextMenuStripItem("Gửi tin nhắn")
                    {
                        ID = "send_message"
                    },
                    new AntdUI.ContextMenuStripItem("Nạp tiền")
                    {
                        ID = "recharge"
                    },
                    new AntdUI.ContextMenuStripItem("Rút tiền")
                    {
                        ID = "withdraw"
                    },
                    new AntdUI.ContextMenuStripItem("Tặng tiền miễn phí")
                    {
                        ID = "free_topup"
                    },
                    new AntdUI.ContextMenuStripItem("Trừ tiền miễn phí")
                    {
                        ID = "free_withdraw"
                    },
                    new AntdUI.ContextMenuStripItem("combo")
                    {
                        ID = "combo"
                    }
            };

            AntdUI.ContextMenuStrip.open(this, item =>
            {
                switch (item.ID)
                {
                    case "detail":
                        ShowComputerDetail();
                        break;
                    case "logout":
                        _ = LogoutComputerAsync();
                        break;
                    case "restart":
                        _ = SendCommandAsync("RESTART");
                        break;
                    case "shutdown":
                        _ = SendCommandAsync("SHUTDOWN");
                        break;
                    case "send_message":
                        SendMessageToComputer();
                        break;
                    case "recharge":
                        _ = RechargeComputerAsync();
                        break;
                    case "withdraw":
                        _ = WithdrawFromComputerAsync();
                        break;
                    case "free_topup":
                        _ = ExecuteFreeBalanceActionAsync(true);
                        break;
                    case "free_withdraw":
                        _ = ExecuteFreeBalanceActionAsync(false);
                        break;
                    case "combo":
                        ShowCombo();
                        break;
                }
            }, items);
        }
        private void ShowComputerDetail()
        {
            // Implement the logic to show computer details
        }
        private async Task LogoutComputerAsync()
        {
            if (!TryGetSelectedAddress(out var ipAddress, out var macAddress)) return;
            await ExecuteActionAsync(() => _computerApiService.LogoutAsync(ipAddress, macAddress), "Đăng xuất máy");
        }

        private async Task SendCommandAsync(string command)
        {
            if (!TryGetSelectedAddress(out var ipAddress, out var macAddress)) return;
            await ExecuteActionAsync(() => _computerApiService.SendCommandAsync(ipAddress, macAddress, command), command);
        }

        private async Task RechargeComputerAsync()
        {
            await ExecuteBalanceActionAsync(true);
        }
        private void SendMessageToComputer()
        {
            // Implement the logic to send a message to the computer
        }
        private async Task WithdrawFromComputerAsync()
        {
            await ExecuteBalanceActionAsync(false);
        }

        private async Task ExecuteBalanceActionAsync(bool topUp)
        {
            if (_selectedComputer?.MemberId is not int memberId)
            {
                MessageBox.Show("Máy hiện chưa có hội viên đang đăng nhập.", "Không thể thực hiện", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            if (!TryGetAmount(out var amount)) return;
            var response = topUp
                ? await _computerApiService.TopUpAsync(memberId, amount)
                : await _computerApiService.WithdrawAsync(memberId, amount);
            ShowActionResult(response, topUp ? "Nạp tiền" : "Rút tiền");
        }

        private async Task ExecuteFreeBalanceActionAsync(bool topUp)
        {
            if (_selectedComputer?.MemberId is not int memberId)
            {
                MessageBox.Show("Máy hiện chưa có hội viên đang đăng nhập.", "Không thể thực hiện", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            var balanceResponse = await _computerApiService.GetMemberBalanceAsync(memberId);
            if (!balanceResponse.IsSuccess || balanceResponse.Data == null)
            {
                MessageBox.Show(balanceResponse.Message ?? "Không thể tải số dư hội viên.", "Lỗi", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (!AmountInputForm.TryShowFreeBalance(
                this,
                topUp ? "Tặng tiền miễn phí" : "Trừ tiền miễn phí",
                balanceResponse.Data.RealBalance,
                balanceResponse.Data.BonusBalance,
                topUp,
                out var amount))
            {
                return;
            }

            var response = topUp
                ? await _computerApiService.AddFreeBalanceAsync(
                    memberId,
                    amount,
                    $"Máy {_selectedComputer?.ComputerName ?? "--"} - nhân viên {_userSessionService.FullName ?? _userSessionService.Username ?? "--"}")
                : await _computerApiService.DeductFreeBalanceAsync(
                    memberId,
                    amount,
                    $"Máy {_selectedComputer?.ComputerName ?? "--"} - nhân viên {_userSessionService.FullName ?? _userSessionService.Username ?? "--"}");
            ShowActionResult(response, topUp ? "Tặng tiền miễn phí" : "Trừ tiền miễn phí");
            if (response.IsSuccess)
            {
                await ReloadAsync();
            }
        }
        private void ShowCombo()
        {
            // Implement the logic to show combo 
        }

        private void tb_Computer_CellClick(object sender, TableClickEventArgs e)
        {
            if (e.Button == MouseButtons.Right && e.RowIndex >= 0)
            {
                tb_Computer.SelectedIndex = e.RowIndex;

                _selectedComputer = e.Record as ComputerGridRow;
                ShowComputerContextMenu();

            }
        }

            private bool TryGetSelectedAddress(out string ipAddress, out string? macAddress)
            {
                ipAddress = NormalizeAddress(_selectedComputer?.IpAddress) ?? string.Empty;
                macAddress = NormalizeAddress(_selectedComputer?.MacAddress);
                if (!string.IsNullOrWhiteSpace(ipAddress) || !string.IsNullOrWhiteSpace(macAddress)) return true;
                MessageBox.Show("Không tìm thấy địa chỉ IP hoặc MAC của máy.", "Không thể thực hiện", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return false;
            }

            private static string? NormalizeAddress(string? value)
            {
                var normalized = value?.Trim();
                return string.IsNullOrWhiteSpace(normalized) || normalized == "--"
                    ? null
                    : normalized;
            }

        private async Task ExecuteActionAsync(
                Func<Task<ApiResponse<object>>> action,
                string actionName)
            {
                ShowActionResult(await action(), actionName);
        }

        private void ShowActionResult(ApiResponse<object> response, string actionName)
            {
                if (!response.IsSuccess)
                {
                    MessageBox.Show(response.Message ?? $"{actionName} thất bại.", "Lỗi", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
        }

        private bool TryGetAmount(out decimal amount)
        {
            return AmountInputForm.TryShow(this, "Nhập số tiền", out amount);
        }
    }

}