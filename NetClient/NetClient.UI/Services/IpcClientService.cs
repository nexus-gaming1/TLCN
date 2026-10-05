using System.IO.Pipes;
using System.Text;
using System.Text.Json;
using NetClient.Shared.Ipc;

namespace NetClient.UI.Services;

public class IpcClientService
{
    private readonly SemaphoreSlim _sendLock = new(1, 1);
    private NamedPipeClientStream? _pipeClient;
    private StreamWriter? _writer;
    private CancellationTokenSource? _cts;

    public event Action? OnShowOverlay;
    public event Action? OnHideOverlay;
    public event Action<string>? OnSetUsername;
    public event Action<string, string?>? OnSetStatus;
    public event Action<string, string?>? OnShowNotification;
    public event Action? OnConnected;
    public event Action? OnDisconnected;

    public bool IsConnected => _pipeClient?.IsConnected ?? false;

    public void Start()
    {
        _cts = new CancellationTokenSource();
        Task.Run(() => ConnectionLoopAsync(_cts.Token));
    }

    public void Stop()
    {
        _cts?.Cancel();
        try
        {
            _writer?.Dispose();
            _pipeClient?.Dispose();
        }
        catch { }
    }

    private async Task ConnectionLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                _pipeClient = new NamedPipeClientStream(
                    ".",
                    IpcConstants.PipeName,
                    PipeDirection.InOut,
                    PipeOptions.Asynchronous);

                // Wait up to 3 seconds for the background service pipe to become available
                await _pipeClient.ConnectAsync(3000, ct);

                await _sendLock.WaitAsync(ct);
                try
                {
                    _writer = new StreamWriter(_pipeClient, Encoding.UTF8, leaveOpen: true)
                    {
                        AutoFlush = true
                    };
                }
                finally
                {
                    _sendLock.Release();
                }

                OnConnected?.Invoke();

                // Notify service that UI is ready
                await SendMessageAsync(new IpcMessage { Action = IpcAction.UiReady }, ct);

                // Read incoming commands from Service
                using var reader = new StreamReader(_pipeClient, Encoding.UTF8, leaveOpen: true);
                while (!ct.IsCancellationRequested && _pipeClient.IsConnected)
                {
                    var line = await reader.ReadLineAsync(ct);
                    if (line == null) break;

                    if (!string.IsNullOrWhiteSpace(line))
                    {
                        ProcessMessage(line);
                    }
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch
            {
                // Background service is either not running yet or restarting
            }
            finally
            {
                await _sendLock.WaitAsync(CancellationToken.None);
                try
                {
                    _writer?.Dispose();
                    _writer = null;
                    _pipeClient?.Dispose();
                    _pipeClient = null;
                }
                finally
                {
                    _sendLock.Release();
                }

                OnDisconnected?.Invoke();

                // Backoff before attempting reconnect
                try
                {
                    await Task.Delay(2000, ct);
                }
                catch (OperationCanceledException) { }
            }
        }
    }

    private void ProcessMessage(string json)
    {
        try
        {
            var msg = JsonSerializer.Deserialize<IpcMessage>(json);
            if (msg == null) return;

            switch (msg.Action)
            {
                case IpcAction.ShowOverlay:
                    OnShowOverlay?.Invoke();
                    break;

                case IpcAction.HideOverlay:
                    OnHideOverlay?.Invoke();
                    break;

                case IpcAction.SetUsername:
                    OnSetUsername?.Invoke(msg.Username ?? string.Empty);
                    break;

                case IpcAction.SetStatus:
                    OnSetStatus?.Invoke(msg.Status ?? string.Empty, msg.MachineId);
                    break;

                case IpcAction.ShowNotification:
                    if (!string.IsNullOrWhiteSpace(msg.Message))
                    {
                        OnShowNotification?.Invoke(msg.Message, msg.Title);
                    }
                    break;

                case IpcAction.Ping:
                    _ = SendMessageAsync(new IpcMessage { Action = IpcAction.Pong });
                    break;
            }
        }
        catch { }
    }

    public async Task SendMessageAsync(IpcMessage msg, CancellationToken ct = default)
    {
        await _sendLock.WaitAsync(ct);
        try
        {
            if (_writer != null && _pipeClient != null && _pipeClient.IsConnected)
            {
                var json = JsonSerializer.Serialize(msg);
                await _writer.WriteLineAsync(json.AsMemory(), ct);
            }
        }
        catch { }
        finally
        {
            _sendLock.Release();
        }
    }

    public Task SendLoginAsync(string username, CancellationToken ct = default)
        => SendMessageAsync(new IpcMessage
        {
            Action = IpcAction.ClientLogin,
            Username = username
        }, ct);
}

