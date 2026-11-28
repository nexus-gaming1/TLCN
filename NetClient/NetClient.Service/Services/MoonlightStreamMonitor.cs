using System.Diagnostics;
using System.Net.NetworkInformation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NetClient.Shared.Models;

namespace NetClient.Service.Services;

/// <summary>
/// Giám sát kết nối streaming của Moonlight / Sunshine qua cổng RTSP (mặc định 48010).
/// Tự động phát hiện khi khách mất kết nối hoặc rớt mạng để kích hoạt đăng xuất và khóa máy.
/// </summary>
public class MoonlightStreamMonitor : BackgroundService
{
    private readonly SessionService _sessionService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MoonlightStreamMonitor> _logger;

    private readonly int _rtspPort;
    private readonly int _disconnectGracePeriodSeconds;
    private readonly int _initialConnectTimeoutSeconds;
    private readonly int _checkIntervalMs;

    private bool _hasStreamStarted;
    private DateTimeOffset? _streamDisconnectedAt;
    private DateTimeOffset? _remoteSessionStartedAt;

    public event Func<Task>? StreamDisconnected;

    public MoonlightStreamMonitor(
        SessionService sessionService,
        IConfiguration configuration,
        ILogger<MoonlightStreamMonitor> logger)
    {
        _sessionService = sessionService;
        _configuration = configuration;
        _logger = logger;

        _rtspPort = _configuration.GetValue<int>("Sunshine:RtspPort", 48010);
        _disconnectGracePeriodSeconds = _configuration.GetValue<int>("Sunshine:StreamDisconnectGracePeriodSeconds", 15);
        _initialConnectTimeoutSeconds = _configuration.GetValue<int>("Sunshine:InitialStreamTimeoutSeconds", 120);
        _checkIntervalMs = _configuration.GetValue<int>("Sunshine:StreamCheckIntervalMs", 2000);

        _sessionService.UserLoggedOut += ResetState;
    }

    /// <summary>
    /// Báo hiệu phiên thuê từ xa vừa được kích hoạt, bắt đầu theo dõi kết nối stream ban đầu.
    /// </summary>
    public void NotifyRemoteSessionStarted()
    {
        _hasStreamStarted = false;
        _streamDisconnectedAt = null;
        _remoteSessionStartedAt = DateTimeOffset.UtcNow;
        _logger.LogInformation(
            "Remote session tracking initialized. Waiting for Moonlight stream connection on port {Port}...",
            _rtspPort);
    }

    public void ResetState()
    {
        _hasStreamStarted = false;
        _streamDisconnectedAt = null;
        _remoteSessionStartedAt = null;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "MoonlightStreamMonitor service started. RtspPort={Port}, DisconnectGracePeriod={Grace}s, InitialTimeout={Initial}s, Interval={Interval}ms",
            _rtspPort, _disconnectGracePeriodSeconds, _initialConnectTimeoutSeconds, _checkIntervalMs);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckStreamStatusAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in MoonlightStreamMonitor loop");
            }

            await Task.Delay(_checkIntervalMs, stoppingToken);
        }
    }

    private async Task CheckStreamStatusAsync(CancellationToken cancellationToken)
    {
        // Chỉ giám sát khi máy tính đang có phiên hoạt động (IN_USE)
        if (_sessionService.CurrentStatus != MachineStatus.IN_USE)
        {
            ResetState();
            return;
        }

        bool isStreaming = HasActiveRtspStream();

        if (isStreaming)
        {
            if (!_hasStreamStarted)
            {
                _hasStreamStarted = true;
                _logger.LogInformation(
                    "Moonlight stream connection established on port {Port}. Active streaming started.",
                    _rtspPort);
            }

            if (_streamDisconnectedAt.HasValue)
            {
                _logger.LogInformation("Moonlight stream connection recovered on port {Port}.", _rtspPort);
                _streamDisconnectedAt = null;
            }

            return;
        }

        // Trường hợp 1: Stream đã từng kết nối, nhưng hiện tại không còn active connection
        if (_hasStreamStarted)
        {
            _streamDisconnectedAt ??= DateTimeOffset.UtcNow;
            var elapsed = DateTimeOffset.UtcNow - _streamDisconnectedAt.Value;

            if (elapsed.TotalSeconds >= _disconnectGracePeriodSeconds)
            {
                _logger.LogWarning(
                    "Moonlight stream disconnected for {Elapsed:F1}s (threshold {Grace}s). Triggering automatic logout...",
                    elapsed.TotalSeconds, _disconnectGracePeriodSeconds);

                ResetState();

                if (StreamDisconnected != null)
                {
                    await StreamDisconnected.Invoke();
                }
            }
            return;
        }

        // Trường hợp 2: Khách thuê từ xa nhưng không kết nối stream trong thời gian ban đầu
        if (_sessionService.IsRemoteSession && _remoteSessionStartedAt.HasValue)
        {
            var waitingTime = DateTimeOffset.UtcNow - _remoteSessionStartedAt.Value;
            if (waitingTime.TotalSeconds >= _initialConnectTimeoutSeconds)
            {
                _logger.LogWarning(
                    "Remote session active but no Moonlight stream connected after {Seconds}s. Triggering automatic logout...",
                    _initialConnectTimeoutSeconds);

                ResetState();

                if (StreamDisconnected != null)
                {
                    await StreamDisconnected.Invoke();
                }
            }
        }
    }

    /// <summary>
    /// Kiểm tra xem có kết nối TCP ESTABLISHED nào trên cổng RTSP của Sunshine hay không.
    /// </summary>
    private bool HasActiveRtspStream()
    {
        try
        {
            var connections = IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpConnections();
            return connections.Any(c =>
                c.LocalEndPoint.Port == _rtspPort &&
                c.State == TcpState.Established);
        }
        catch (NetworkInformationException)
        {
            // Trong một số môi trường phân quyền hạn chế, GetActiveTcpConnections có thể bị chặn.
            // Dùng netstat làm giải pháp dự phòng an toàn.
            return CheckRtspStreamViaNetstat();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to inspect TCP connections via IPGlobalProperties, trying netstat fallback");
            return CheckRtspStreamViaNetstat();
        }
    }

    /// <summary>
    /// Kiểm tra kết nối TCP ESTABLISHED cổng RTSP thông qua lệnh netstat hệ thống.
    /// </summary>
    private bool CheckRtspStreamViaNetstat()
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "netstat",
                Arguments = "-ano -p tcp",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return false;

            string portPattern = $":{_rtspPort}";
            string? line;
            while ((line = process.StandardOutput.ReadLine()) != null)
            {
                if (line.Contains(portPattern, StringComparison.OrdinalIgnoreCase) &&
                    line.Contains("ESTABLISHED", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            process.WaitForExit(1000);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to query TCP status via netstat fallback");
            return false;
        }
    }
}
