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
    private readonly AuthApiService _authApiService;

    private SocketIO? _client;
    private System.Threading.Timer? _heartbeatTimer;
    private readonly SemaphoreSlim _statusUpdateLock = new(1, 1);
    private bool _isRegistered;
    private DateTimeOffset? _disconnectedAt;
    private bool _sessionClearedForDisconnect;
    private readonly string _serverUrl;
    private readonly int _heartbeatIntervalSeconds;
    private readonly int _connectTimeoutSeconds;

    public SocketService(
        ILogger<SocketService> logger,
        IConfiguration configuration,
        SessionService sessionService,
        CommandService commandService,
        PerformanceMonitor performanceMonitor,
        IpcServerService ipcServerService,
        AuthApiService authApiService)
    {
        _logger = logger;
        _configuration = configuration;
        _sessionService = sessionService;
        _commandService = commandService;
        _performanceMonitor = performanceMonitor;
        _ipcServerService = ipcServerService;
        _authApiService = authApiService;

        _serverUrl = _configuration["Server:Url"] ?? "http://127.0.0.1:3000";
        if (!int.TryParse(_configuration["Client:HeartbeatIntervalSeconds"], out _heartbeatIntervalSeconds) || _heartbeatIntervalSeconds <= 0)
        {
            _heartbeatIntervalSeconds = 5;
        }
        if (!int.TryParse(_configuration["Client:ConnectTimeoutSeconds"], out _connectTimeoutSeconds) || _connectTimeoutSeconds <= 0)
        {
            _connectTimeoutSeconds = 10;
        }

        // Subscribe to local session state changes
        _sessionService.StatusChanged += OnLocalStatusChanged;
        _ipcServerService.LoginRequested += AuthenticateLocalLoginAsync;
        _ipcServerService.LogoutRequested += HandleLocalLogoutAsync;
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

            // Start periodic heartbeat
            _heartbeatTimer = new System.Threading.Timer(
                async _ => await SendHeartbeatAsync(),
                null,
                TimeSpan.FromSeconds(2),
                TimeSpan.FromSeconds(_heartbeatIntervalSeconds));

            var retryDelay = TimeSpan.FromSeconds(5);
            var nextRegistrationAttempt = DateTimeOffset.MinValue;

            while (!stoppingToken.IsCancellationRequested)
            {
                if (!_client.Connected)
                {
                    _isRegistered = false;
                    _disconnectedAt ??= DateTimeOffset.UtcNow;
                    if (_disconnectedAt.HasValue &&
                        !_sessionClearedForDisconnect &&
                        DateTimeOffset.UtcNow - _disconnectedAt.Value >= TimeSpan.FromSeconds(15))
                    {
                        await ClearSessionAfterConnectionLossAsync();
                    }
                    try
                    {
                        _logger.LogInformation(
                            "Connecting to Socket.IO backend at {Url} (timeout: {TimeoutSeconds}s)...",
                            _serverUrl,
                            _connectTimeoutSeconds);
                        await ConnectWithTimeoutAsync(stoppingToken);
                        nextRegistrationAttempt = DateTimeOffset.UtcNow;
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "Unable to connect to Socket.IO backend. Retrying in {RetrySeconds} seconds.",
                            retryDelay.TotalSeconds);

                        await DisconnectAfterFailedConnectAsync();
                        await Task.Delay(retryDelay, stoppingToken);
                        continue;
                    }
                }

                if (_client.Connected &&
                    !_isRegistered &&
                    DateTimeOffset.UtcNow >= nextRegistrationAttempt)
                {
                    await SendRegisterAsync();
                    nextRegistrationAttempt = DateTimeOffset.UtcNow.Add(retryDelay);
                }

                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
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

    private async Task ConnectWithTimeoutAsync(CancellationToken stoppingToken)
    {
        if (_client == null)
        {
            throw new InvalidOperationException("Socket.IO client has not been initialized.");
        }

        using var connectTimeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        connectTimeout.CancelAfter(TimeSpan.FromSeconds(_connectTimeoutSeconds));

        try
        {
            await _client.ConnectAsync(connectTimeout.Token);
        }
        catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)
        {
            throw new TimeoutException(
                $"Socket.IO connection to {_serverUrl} timed out after {_connectTimeoutSeconds} seconds.");
        }
    }

    private async Task DisconnectAfterFailedConnectAsync()
    {
        if (_client == null || !_client.Connected)
        {
            return;
        }

        try
        {
            await _client.DisconnectAsync();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to reset Socket.IO client after a connection attempt.");
        }
    }

    private void RegisterSocketEvents()
    {
        if (_client == null) return;

        _client.OnConnected += (sender, e) =>
        {
            _disconnectedAt = null;
            _sessionClearedForDisconnect = false;
            _logger.LogInformation("Connected to Socket.IO backend successfully.");
        };

        _client.OnDisconnected += (sender, reason) =>
        {
            _logger.LogWarning("Disconnected from Socket.IO backend. Reason: {Reason}", reason);
            _isRegistered = false;
            _disconnectedAt ??= DateTimeOffset.UtcNow;
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

        _client.On("session:reject", async ctx =>
        {
            try
            {
                var rejection = ctx.GetValue<SessionRejectPayload>(0);
                _sessionService.Logout();
                await _ipcServerService.SetUsernameAsync(string.Empty);
                await _ipcServerService.SetStatusAsync(MachineStatus.ONLINE.ToString());
                await _ipcServerService.ShowOverlayAsync();
                await _ipcServerService.SendLoginResultAsync(
                    false,
                    rejection?.Message ?? "Không thể bắt đầu phiên sử dụng máy.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling session rejection");
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
                Status = info.Status,
                Username = _sessionService.CurrentUser,
                MemberId = _sessionService.CurrentMemberId,
                SessionStartedAt = _sessionService.CurrentSessionStartedAt
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

    private async Task ClearSessionAfterConnectionLossAsync()
    {
        _sessionClearedForDisconnect = true;
        _logger.LogWarning(
            "Backend unavailable for 15 seconds. Clearing local session and showing lock overlay.");
        if (_sessionService.CurrentUser != null)
        {
            _sessionService.Logout();
        }
        await _ipcServerService.SetUsernameAsync(string.Empty);
        await _ipcServerService.SetStatusAsync(MachineStatus.ONLINE.ToString());
        await _ipcServerService.ShowOverlayAsync();
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
                MemberId = _sessionService.CurrentMemberId,
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
            await _statusUpdateLock.WaitAsync();
            try
            {
                // A delayed event from before a newer login/logout must not
                // overwrite the current session state on the backend.
                if (_sessionService.CurrentStatus != newStatus)
                {
                    _logger.LogDebug(
                        "Skipping stale status update {Old} -> {New}; current status is {Current}.",
                        oldStatus,
                        newStatus,
                        _sessionService.CurrentStatus);
                    return;
                }

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
            finally
            {
                _statusUpdateLock.Release();
            }
        });
    }

    private async Task AuthenticateLocalLoginAsync(string username, string password)
    {
        try
        {
            var result = await _authApiService.LoginAsync(username, password);
            if (!result.Success || string.IsNullOrWhiteSpace(result.Username))
            {
                await _ipcServerService.SendLoginResultAsync(false, result.Error);
                return;
            }

            if (!_sessionService.Login(result.Username, result.MemberId))
            {
                await _ipcServerService.SendLoginResultAsync(false, "Không thể khởi tạo phiên làm việc.");
                return;
            }

            await _ipcServerService.SetUsernameAsync(result.Username);
            await _ipcServerService.HideOverlayAsync();
            await _ipcServerService.SendLoginResultAsync(true, null);

            if (_client != null && _client.Connected)
            {
                await _client.EmitAsync("login:ack", [new LoginAck
                {
                    MachineId = _sessionService.MachineId,
                    Username = result.Username,
                    Success = true
                }]);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Backend authentication request failed");
            await _ipcServerService.SendLoginResultAsync(false, "Không thể kết nối đến máy chủ.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while authenticating local login");
            await _ipcServerService.SendLoginResultAsync(false, "Đăng nhập thất bại.");
        }
    }

    private async Task HandleLocalLogoutAsync()
    {
        try
        {
            var currentUser = _sessionService.CurrentUser;
            var machineId = _sessionService.MachineId;

            _logger.LogInformation("Processing local logout for user {User} on machine {MachineId}", currentUser, machineId);

            // 1. Session service logout (triggers StatusChanged -> status:update event)
            _sessionService.Logout();

            // 2. Notify IPC UI clients to lock and clear state
            await _ipcServerService.SetUsernameAsync(string.Empty);
            await _ipcServerService.SetStatusAsync(MachineStatus.ONLINE.ToString());
            await _ipcServerService.ShowOverlayAsync();

            // 3. Emit logout events to backend Socket.IO
            if (_client != null && _client.Connected)
            {
                await _client.EmitAsync("logout:ack", [new LogoutAck
                {
                    MachineId = machineId,
                    Success = true
                }]);

                await _client.EmitAsync("client:logout", [new
                {
                    MachineId = machineId,
                    Username = currentUser,
                    Success = true
                }]);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during local logout processing");
        }
    }
}
