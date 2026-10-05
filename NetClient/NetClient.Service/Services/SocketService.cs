using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NetClient.Shared.Models;
using SocketIOClient;

namespace NetClient.Service.Services;

public class SocketService : BackgroundService
{
    private readonly ILogger<SocketService> _logger;
    private readonly IConfiguration _configuration;
    private readonly SessionService _sessionService;
    private readonly CommandService _commandService;
    private readonly PerformanceMonitor _performanceMonitor;
    private readonly IpcServerService _ipcServerService;

    private SocketIO? _client;
    private System.Threading.Timer? _heartbeatTimer;
    private bool _isRegistered;
    private readonly string _serverUrl;
    private readonly int _heartbeatIntervalSeconds;

    public SocketService(
        ILogger<SocketService> logger,
        IConfiguration configuration,
        SessionService sessionService,
        CommandService commandService,
        PerformanceMonitor performanceMonitor,
        IpcServerService ipcServerService)
    {
        _logger = logger;
        _configuration = configuration;
        _sessionService = sessionService;
        _commandService = commandService;
        _performanceMonitor = performanceMonitor;
        _ipcServerService = ipcServerService;

        _serverUrl = _configuration["Server:Url"] ?? "http://127.0.0.1:3000";
        if (!int.TryParse(_configuration["Client:HeartbeatIntervalSeconds"], out _heartbeatIntervalSeconds) || _heartbeatIntervalSeconds <= 0)
        {
            _heartbeatIntervalSeconds = 5;
        }

        // Subscribe to local session state changes
        _sessionService.StatusChanged += OnLocalStatusChanged;
        _sessionService.UserLoggedIn += OnLocalUserLoggedIn;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SocketService starting. Target server: {Url}", _serverUrl);

        try
        {
            var uri = new Uri(_serverUrl);
            var options = new SocketIOOptions();
            _client = new SocketIO(uri, options);


            RegisterSocketEvents();

            _logger.LogInformation("Connecting to Socket.IO backend at {Url}...", _serverUrl);
            await _client.ConnectAsync();

            // Start periodic heartbeat
            _heartbeatTimer = new System.Threading.Timer(
                async _ => await SendHeartbeatAsync(),
                null,
                TimeSpan.FromSeconds(2),
                TimeSpan.FromSeconds(_heartbeatIntervalSeconds));

            // Keep service alive until cancellation
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("SocketService is stopping gracefully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in SocketService execution");
        }
        finally
        {
            if (_client != null)
            {
                try
                {
                    await _client.DisconnectAsync();
                    _client.Dispose();
                }
                catch { }
            }

            _heartbeatTimer?.Dispose();
        }
    }

    private void RegisterSocketEvents()
    {
        if (_client == null) return;

        _client.OnConnected += async (sender, e) =>
        {
            _logger.LogInformation("Connected to Socket.IO backend successfully.");
            await SendRegisterAsync();
        };

        _client.OnDisconnected += (sender, reason) =>
        {
            _logger.LogWarning("Disconnected from Socket.IO backend. Reason: {Reason}", reason);
            _isRegistered = false;
        };

        _client.OnError += (sender, error) =>
        {
            _logger.LogError("Socket.IO error encountered: {Error}", error);
        };

        // 1. Listen for generic command event
        _client.On("command", async ctx =>
        {
            try
            {
                var payload = ctx.GetValue<CommandPayload>(0);
                if (payload == null)
                {
                    _logger.LogWarning("Received empty or unparsable 'command' event payload");
                    return;
                }

                _logger.LogInformation("Received 'command' event: {Command}", payload.Command);
                var ack = await _commandService.ExecuteCommandAsync(payload);
                await _client.EmitAsync("command:ack", [ack]);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling 'command' event");
            }
        });

        // 2. Listen for session:login event
        _client.On("session:login", async ctx =>
        {
            try
            {
                var loginData = ctx.GetValue<LoginPayload>(0);
                var username = loginData?.Username;

                _logger.LogInformation("Received 'session:login' event for user: {User}", username);

                if (!string.IsNullOrWhiteSpace(username))
                {
                    bool ok = _sessionService.Login(username);
                    if (ok)
                    {
                        await _ipcServerService.SetUsernameAsync(username);
                        await _ipcServerService.HideOverlayAsync();

                        await _client.EmitAsync("login:ack", [new LoginAck
                        {
                            MachineId = _sessionService.MachineId,
                            Username = username,
                            Success = true
                        }]);
                    }
                    else
                    {
                        await _client.EmitAsync("login:ack", [new LoginAck
                        {
                            MachineId = _sessionService.MachineId,
                            Username = username,
                            Success = false,
                            Error = "Failed to activate session"
                        }]);
                    }
                }
                else
                {
                    await _client.EmitAsync("login:ack", [new LoginAck
                    {
                        MachineId = _sessionService.MachineId,
                        Username = username,
                        Success = false,
                        Error = "Username is missing"
                    }]);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling 'session:login' event");
            }
        });

        // 3. Listen for session:logout event
        _client.On("session:logout", async ctx =>
        {
            try
            {
                _logger.LogInformation("Received 'session:logout' event");
                _sessionService.Logout();

                await _ipcServerService.SetUsernameAsync(string.Empty);
                await _ipcServerService.SetStatusAsync(MachineStatus.ONLINE.ToString());
                await _ipcServerService.ShowOverlayAsync();

                await _client.EmitAsync("logout:ack", [new LogoutAck
                {
                    MachineId = _sessionService.MachineId,
                    Success = true
                }]);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling 'session:logout' event");
            }
        });

        // 4. Listen for notification event
        _client.On("notification", async ctx =>
        {
            try
            {
                var notif = ctx.GetValue<NotificationPayload>(0);
                if (notif != null && !string.IsNullOrWhiteSpace(notif.Message))
                {
                    _logger.LogInformation("Received notification from server: {Message}", notif.Message);
                    await _ipcServerService.ShowNotificationAsync(notif.Message, notif.Title ?? "Thông báo phòng net");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling 'notification' event");
            }
        });

    }

    private async Task SendRegisterAsync()
    {
        if (_client == null || !_client.Connected) return;

        try
        {
            var info = _sessionService.GetMachineInfo();
            var payload = new RegisterPayload
            {
                MachineId = info.MachineId,
                Hostname = info.Hostname,
                LocalIp = info.LocalIp,
                MacAddress = info.MacAddress,
                WindowsUser = info.WindowsUser,
                Status = info.Status
            };

            _logger.LogInformation("Registering machine with server: MachineId={Id}, IP={Ip}, Status={Status}",
                payload.MachineId, payload.LocalIp, payload.Status);

            await _client.EmitAsync("register", [payload]);
            _isRegistered = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send 'register' event to backend");
        }
    }

    private async Task SendHeartbeatAsync()
    {
        if (_client == null || !_client.Connected || !_isRegistered) return;

        try
        {
            var perf = _performanceMonitor.Collect();
            var payload = new HeartbeatPayload
            {
                MachineId = _sessionService.MachineId,
                Status = _sessionService.CurrentStatus.ToString(),
                Username = _sessionService.CurrentUser,
                Timestamp = DateTime.UtcNow.ToString("o"),
                Performance = perf
            };

            await _client.EmitAsync("heartbeat", [payload]);
            _logger.LogDebug("Heartbeat emitted: CPU={Cpu}%, RAM={Ram}%", perf.CpuUsage, perf.RamUsage);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to emit heartbeat to server");
        }
    }

    private void OnLocalStatusChanged(MachineStatus newStatus, MachineStatus oldStatus)
    {
        if (_client == null || !_client.Connected) return;

        _ = Task.Run(async () =>
        {
            try
            {
                var payload = new StatusUpdatePayload
                {
                    MachineId = _sessionService.MachineId,
                    Status = newStatus.ToString(),
                    PreviousStatus = oldStatus.ToString(),
                    Timestamp = DateTime.UtcNow.ToString("o")
                };

                await _client.EmitAsync("status:update", [payload]);
                _logger.LogInformation("Status update emitted: {Old} -> {New}", oldStatus, newStatus);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to emit status:update");
            }
        });
    }

    private void OnLocalUserLoggedIn(string username)
    {
        if (_client == null || !_client.Connected) return;

        _ = Task.Run(async () =>
        {
            try
            {
                await _client.EmitAsync("login:ack", [new LoginAck
                {
                    MachineId = _sessionService.MachineId,
                    Username = username,
                    Success = true
                }]);
                _logger.LogInformation("Emitted login:ack for local user login: {User}", username);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to emit login:ack for local user login");
            }
        });
    }
}

