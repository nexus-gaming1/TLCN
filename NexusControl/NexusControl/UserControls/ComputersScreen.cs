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

        public ComputersScreen()
        {
            InitializeComponent();
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

        private async void btnRefresh_Click(object sender, EventArgs e)
        {
            await ReloadAsync();
        }

        private sealed class ComputerGridRow
        {
            public string ComputerName { get; init; } = "--";
            public string Status { get; init; } = "--";
            public string CurrentUsername { get; init; } = "--";
            public string SessionStartedAt { get; init; } = "--";
            public string ZoneName { get; init; } = "--";
            public string HourlyRate { get; init; } = "--";
            public string HasActiveCombo { get; init; } = "Không";

            public static ComputerGridRow FromDto(ComputerOverviewDto dto)
            {
                return new ComputerGridRow
                {
                    ComputerName = ValueOrPlaceholder(dto.ComputerName),
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

            private static string ValueOrPlaceholder(string? value)
            {
                return string.IsNullOrWhiteSpace(value) ? "--" : value;
            }

            private static string ToFriendlyStatus(string? status)
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
