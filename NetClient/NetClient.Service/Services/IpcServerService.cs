using System.Collections.Concurrent;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NetClient.Shared.Ipc;
using NetClient.Shared.Models;

namespace NetClient.Service.Services;

public class IpcServerService : BackgroundService
{
    private readonly ILogger<IpcServerService> _logger;
    private readonly SessionService _sessionService;
    private readonly SemaphoreSlim _sendLock = new(1, 1);
    private readonly ConcurrentDictionary<NamedPipeServerStream, StreamWriter> _connectedClients = new();

    public event Action? ClientConnected;
    public event Action? ClientDisconnected;
    public event Func<string, string, Task>? LoginRequested;
    public event Func<Task>? LogoutRequested;

    public IpcServerService(ILogger<IpcServerService> logger, SessionService sessionService)
    {
        _logger = logger;
        _sessionService = sessionService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IPC Named Pipe Server starting on pipe: {PipeName}", IpcConstants.PipeName);

        while (!stoppingToken.IsCancellationRequested)
        {
            NamedPipeServerStream? pipeStream = null;
            try
            {
                // Create pipe with permissions permitting all authenticated users on Windows
                // so an unprivileged UI process running in a user session can connect even if Service runs as SYSTEM.
                var pipeSecurity = new PipeSecurity();
                pipeSecurity.AddAccessRule(new PipeAccessRule(
                    new SecurityIdentifier(WellKnownSidType.AuthenticatedUserSid, null),
                    PipeAccessRights.ReadWrite | PipeAccessRights.CreateNewInstance,
                    AccessControlType.Allow));
                pipeSecurity.AddAccessRule(new PipeAccessRule(
                    new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null),
                    PipeAccessRights.FullControl,
                    AccessControlType.Allow));

                pipeStream = NamedPipeServerStreamAcl.Create(
                    IpcConstants.PipeName,
                    PipeDirection.InOut,
                    NamedPipeServerStream.MaxAllowedServerInstances,
                    PipeTransmissionMode.Byte,
                    PipeOptions.Asynchronous,
                    inBufferSize: 4096,
                    outBufferSize: 4096,
                    pipeSecurity: pipeSecurity);

                _logger.LogDebug("Waiting for UI client to connect via IPC...");
                await pipeStream.WaitForConnectionAsync(stoppingToken);

                _logger.LogInformation("UI client connected via IPC.");

                var writer = new StreamWriter(pipeStream, Encoding.UTF8, leaveOpen: true)
                {
                    AutoFlush = true
                };

                await _sendLock.WaitAsync(stoppingToken);
                try
                {
                    _connectedClients.TryAdd(pipeStream, writer);
                    await SyncCurrentStateToClientAsync(writer, stoppingToken);
                }
                finally
                {
                    _sendLock.Release();
                }

                ClientConnected?.Invoke();

                // Start reader loop for this client in background task
                _ = Task.Run(() => ReadClientLoopAsync(pipeStream, writer, stoppingToken), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IPC Pipe connection encountered an error");
                try
                {
                    await Task.Delay(1000, stoppingToken);
                }
                catch (OperationCanceledException) { }
            }
        }

        _logger.LogInformation("IPC Server stopped.");
    }

    private async Task ReadClientLoopAsync(NamedPipeServerStream pipeStream, StreamWriter writer, CancellationToken ct)
    {
        try
        {
            using var reader = new StreamReader(pipeStream, Encoding.UTF8, leaveOpen: true);
            while (!ct.IsCancellationRequested && pipeStream.IsConnected)
            {
                var line = await reader.ReadLineAsync(ct);
                if (line == null) break;

                if (!string.IsNullOrWhiteSpace(line))
                {
                    await HandleIncomingMessageAsync(line);
                }
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "IPC client connection closed or error");
        }
        finally
        {
            _connectedClients.TryRemove(pipeStream, out _);
            try
            {
                writer.Dispose();
                pipeStream.Dispose();
            }
            catch { }

            _logger.LogInformation("UI client disconnected from IPC.");
            ClientDisconnected?.Invoke();
        }
    }

    private async Task SyncCurrentStateToClientAsync(StreamWriter writer, CancellationToken ct)
    {
        try
        {
            if (_sessionService.CurrentStatus == MachineStatus.IN_USE)
            {
                var msgUser = JsonSerializer.Serialize(new IpcMessage
                {
                    Action = IpcAction.SetUsername,
                    Username = _sessionService.CurrentUser
                });
                await writer.WriteLineAsync(msgUser.AsMemory(), ct);

                var msgHide = JsonSerializer.Serialize(new IpcMessage
                {
                    Action = IpcAction.HideOverlay
                });
                await writer.WriteLineAsync(msgHide.AsMemory(), ct);
            }
            else
            {
                var msgStatus = JsonSerializer.Serialize(new IpcMessage
                {
                    Action = IpcAction.SetStatus,
                    Status = _sessionService.CurrentStatus.ToString(),
                    MachineId = _sessionService.MachineId
                });
                await writer.WriteLineAsync(msgStatus.AsMemory(), ct);

                var msgShow = JsonSerializer.Serialize(new IpcMessage
                {
                    Action = IpcAction.ShowOverlay
                });
                await writer.WriteLineAsync(msgShow.AsMemory(), ct);
            }
        }
        catch { }
    }

    private async Task SyncCurrentStateAsync(CancellationToken ct)
    {
        if (_sessionService.CurrentStatus == MachineStatus.IN_USE)
        {
            await SendMessageAsync(new IpcMessage
            {
                Action = IpcAction.SetUsername,
                Username = _sessionService.CurrentUser
            }, ct);

            await SendMessageAsync(new IpcMessage
            {
                Action = IpcAction.HideOverlay
            }, ct);
        }
        else
        {
            await SendMessageAsync(new IpcMessage
            {
                Action = IpcAction.SetStatus,
                Status = _sessionService.CurrentStatus.ToString(),
                MachineId = _sessionService.MachineId
            }, ct);

            await SendMessageAsync(new IpcMessage
            {
                Action = IpcAction.ShowOverlay
            }, ct);
        }
    }

    private async Task HandleIncomingMessageAsync(string json)
    {
        try
        {
            var msg = JsonSerializer.Deserialize<IpcMessage>(json);
            if (msg == null) return;

            if (msg.Action == IpcAction.UiReady)
            {
                _logger.LogInformation("IPC received UI_READY notification from client.");
                _ = SyncCurrentStateAsync(CancellationToken.None);
            }
            else if (msg.Action == IpcAction.Ping)
            {
                _ = SendMessageAsync(new IpcMessage { Action = IpcAction.Pong }, CancellationToken.None);
            }
            else if (msg.Action == IpcAction.ClientLogin && !string.IsNullOrWhiteSpace(msg.Username))
            {
                if (string.IsNullOrWhiteSpace(msg.Password))
                {
                    await SendLoginResultAsync(false, "Vui lòng nhập mật khẩu.");
                    return;
                }

                if (LoginRequested == null)
                {
                    await SendLoginResultAsync(false, "Dịch vụ xác thực chưa sẵn sàng.");
                    return;
                }

                await LoginRequested.Invoke(msg.Username, msg.Password);
            }
            else if (msg.Action == IpcAction.LegacyClientLogin && !string.IsNullOrWhiteSpace(msg.Username))
            {
                _logger.LogInformation("IPC received legacy local login for user: {User}", msg.Username);
                _sessionService.Login(msg.Username);
                await SetUsernameAsync(msg.Username);
            }
            else if (msg.Action == IpcAction.ClientLogout)
            {
                _logger.LogInformation("IPC received ClientLogout request from UI client.");
                if (LogoutRequested != null)
                {
                    await LogoutRequested.Invoke();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse IPC message from UI");
        }
    }

    public async Task SendMessageAsync(IpcMessage message, CancellationToken ct = default)
    {
        await _sendLock.WaitAsync(ct);
        try
        {
            if (_connectedClients.IsEmpty)
            {
                _logger.LogDebug("No IPC clients connected; skipped message: {Action}", message.Action);
                return;
            }

            var json = JsonSerializer.Serialize(message);
            foreach (var kvp in _connectedClients)
            {
                var pipe = kvp.Key;
                var writer = kvp.Value;
                if (pipe.IsConnected)
                {
                    try
                    {
                        await writer.WriteLineAsync(json.AsMemory(), ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send IPC message to a UI client");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send IPC message to UI clients");
        }
        finally
        {
            _sendLock.Release();
        }
    }

    public Task ShowOverlayAsync(CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage { Action = IpcAction.ShowOverlay }, ct);

    public Task HideOverlayAsync(CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage { Action = IpcAction.HideOverlay }, ct);

    public Task SetUsernameAsync(string username, CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage { Action = IpcAction.SetUsername, Username = username }, ct);

    public Task SetStatusAsync(string status, CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage { Action = IpcAction.SetStatus, Status = status, MachineId = _sessionService.MachineId }, ct);

    public Task ShowNotificationAsync(string message, string? title = null, CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage { Action = IpcAction.ShowNotification, Message = message, Title = title }, ct);

    public Task SendLoginResultAsync(bool success, string? message, CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage
        {
            Action = IpcAction.LoginResult,
            Success = success,
            Message = message
        }, ct);
}
