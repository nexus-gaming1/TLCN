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
    private NamedPipeServerStream? _currentPipe;
    private StreamWriter? _currentWriter;

    public event Action? ClientConnected;
    public event Action? ClientDisconnected;

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

                await _sendLock.WaitAsync(stoppingToken);
                try
                {
                    _currentPipe = pipeStream;
                    _currentWriter = new StreamWriter(pipeStream, Encoding.UTF8, leaveOpen: true)
                    {
                        AutoFlush = true
                    };
                }
                finally
                {
                    _sendLock.Release();
                }

                ClientConnected?.Invoke();

                // Synchronize current state to UI immediately
                await SyncCurrentStateAsync(stoppingToken);

                // Read incoming messages loop
                using var reader = new StreamReader(pipeStream, Encoding.UTF8, leaveOpen: true);
                while (!stoppingToken.IsCancellationRequested && pipeStream.IsConnected)
                {
                    var line = await reader.ReadLineAsync(stoppingToken);
                    if (line == null) break;

                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        HandleIncomingMessage(line);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IPC Pipe connection encountered an error");
            }
            finally
            {
                await _sendLock.WaitAsync(CancellationToken.None);
                try
                {
                    _currentWriter?.Dispose();
                    _currentWriter = null;
                    _currentPipe?.Dispose();
                    _currentPipe = null;
                }
                finally
                {
                    _sendLock.Release();
                }

                _logger.LogInformation("UI client disconnected from IPC.");
                ClientDisconnected?.Invoke();

                // Brief pause before creating next server instance
                try
                {
                    await Task.Delay(1000, stoppingToken);
                }
                catch (OperationCanceledException) { }
            }
        }

        _logger.LogInformation("IPC Server stopped.");
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

    private void HandleIncomingMessage(string json)
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
                _logger.LogInformation("IPC received ClientLogin from UI for user: {User}", msg.Username);
                _sessionService.Login(msg.Username);
                _ = SetUsernameAsync(msg.Username, CancellationToken.None);
                _ = HideOverlayAsync(CancellationToken.None);
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
            if (_currentWriter == null || _currentPipe == null || !_currentPipe.IsConnected)
            {
                _logger.LogDebug("IPC client not connected; skipped message: {Action}", message.Action);
                return;
            }

            var json = JsonSerializer.Serialize(message);
            await _currentWriter.WriteLineAsync(json.AsMemory(), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send IPC message to UI");
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
}

