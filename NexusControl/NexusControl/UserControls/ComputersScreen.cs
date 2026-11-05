using System;
using System.Collections.Generic;
using System.Drawing;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using NexusControl.Models;
using NexusControl.Services;

namespace NexusControl.UserControls
{
    public partial class ComputersScreen : UserControl
    {
        private readonly ComputerApiService _computerApiService = new();
        private readonly CancellationTokenSource _cancellationTokenSource = new();
        private MachineSocketService? _machineSocketService;

        public ComputersScreen()
        {
            InitializeComponent();
            Disposed += ComputersScreen_Disposed;
        }

        private async void ComputersScreen_Load(object sender, EventArgs e)
        {
            await ReloadAsync();
        }

        public async Task ReloadAsync()
        {
            btnRefresh.Enabled = false;
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

                dgv_Computer.DataSource = (response.Data ?? new List<ComputerOverviewDto>())
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
                btnRefresh.Enabled = true;
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

            if (dgv_Computer.DataSource is not List<ComputerGridRow> rows)
            {
                return;
            }

            foreach (var machine in machines.Values)
            {
                UpdateRow(rows, machine);
            }

            dgv_Computer.Refresh();
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

            if (dgv_Computer.DataSource is List<ComputerGridRow> rows &&
                UpdateRow(rows, machine))
            {
                dgv_Computer.Refresh();
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

        private async void btnRefresh_Click(object sender, EventArgs e)
        {
            await ReloadAsync();
        }

        private sealed class ComputerGridRow
        {
            public string ComputerName { get; init; } = "--";
            public string? IpAddress { get; init; }
            public string? MacAddress { get; init; }
            public string Status { get; set; } = "--";
            public string CurrentUsername { get; set; } = "--";
            public string SessionStartedAt { get; init; } = "--";
            public string ZoneName { get; init; } = "--";
            public string HourlyRate { get; init; } = "--";
            public string HasActiveCombo { get; init; } = "Không";

            public static ComputerGridRow FromDto(ComputerOverviewDto dto)
            {
                return new ComputerGridRow
                {
                    ComputerName = ValueOrPlaceholder(dto.ComputerName),
                    IpAddress = dto.IpAddress,
                    MacAddress = dto.MacAddress,
                    Status = ToFriendlyStatus(dto.Status),
                    CurrentUsername = ValueOrPlaceholder(dto.CurrentUsername),
                    SessionStartedAt = dto.SessionStartedAt?.ToLocalTime()
                        .ToString("dd/MM/yyyy HH:mm:ss") ?? "--",
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
    }
}
