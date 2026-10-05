using System.Diagnostics;
using Microsoft.Extensions.Logging;
using NetClient.Shared.Models;

namespace NetClient.Service.Services;

public class CommandService
{
    private readonly ILogger<CommandService> _logger;
    private readonly SessionService _sessionService;
    private readonly IpcServerService _ipcServerService;

    // Strict whitelist of supported commands
    private static readonly HashSet<string> Whitelist = new(StringComparer.OrdinalIgnoreCase)
    {
        "SHUTDOWN",
        "RESTART",
        "SHOW_NOTIFICATION",
        "GET_STATUS",
        "LOGIN",
        "LOGOUT"
    };

    public CommandService(
        ILogger<CommandService> logger,
        SessionService sessionService,
        IpcServerService ipcServerService)
    {
        _logger = logger;
        _sessionService = sessionService;
        _ipcServerService = ipcServerService;
    }

    public async Task<CommandAck> ExecuteCommandAsync(CommandPayload payload)
    {
        var cmd = payload.Command?.Trim() ?? string.Empty;
        var machineId = _sessionService.MachineId;

        _logger.LogInformation("Received command: {Command}", cmd);

        if (string.IsNullOrWhiteSpace(cmd) || !Whitelist.Contains(cmd))
        {
            _logger.LogWarning("Command rejected: '{Command}' is not in the whitelist", cmd);
            return new CommandAck
            {
                Command = cmd,
                Success = false,
                MachineId = machineId,
                Error = $"Command '{cmd}' is not recognized or not allowed."
            };
        }

        try
        {
            switch (cmd.ToUpperInvariant())
            {
                case "SHUTDOWN":
                    return HandleShutdown(machineId);

                case "RESTART":
                    return HandleRestart(machineId);

                case "SHOW_NOTIFICATION":
                    await HandleShowNotification(payload.Message);
                    return new CommandAck { Command = cmd, Success = true, MachineId = machineId };

                case "GET_STATUS":
                    return new CommandAck
                    {
                        Command = cmd,
                        Success = true,
                        MachineId = machineId,
                        Error = $"Status: {_sessionService.CurrentStatus}, User: {_sessionService.CurrentUser ?? "None"}"
                    };

                case "LOGIN":
                    if (!string.IsNullOrWhiteSpace(payload.Username))
                    {
                        _sessionService.Login(payload.Username);
                        await _ipcServerService.SetUsernameAsync(payload.Username);
                        await _ipcServerService.HideOverlayAsync();
                        return new CommandAck { Command = cmd, Success = true, MachineId = machineId };
                    }
                    return new CommandAck { Command = cmd, Success = false, MachineId = machineId, Error = "Username is required for LOGIN" };

                case "LOGOUT":
                    _sessionService.Logout();
                    await _ipcServerService.SetUsernameAsync(string.Empty);
                    await _ipcServerService.SetStatusAsync(MachineStatus.ONLINE.ToString());
                    await _ipcServerService.ShowOverlayAsync();
                    return new CommandAck { Command = cmd, Success = true, MachineId = machineId };

                default:
                    return new CommandAck
                    {
                        Command = cmd,
                        Success = false,
                        MachineId = machineId,
                        Error = "Unhandled command."
                    };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while executing command '{Command}'", cmd);
            return new CommandAck
            {
                Command = cmd,
                Success = false,
                MachineId = machineId,
                Error = ex.Message
            };
        }
    }

    private CommandAck HandleShutdown(string machineId)
    {
        _logger.LogWarning("Executing system SHUTDOWN...");
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "shutdown.exe",
                Arguments = "/s /t 0 /f",
                CreateNoWindow = true,
                UseShellExecute = false
            };
            Process.Start(psi);
            return new CommandAck { Command = "SHUTDOWN", Success = true, MachineId = machineId };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invoke shutdown command");
            return new CommandAck { Command = "SHUTDOWN", Success = false, MachineId = machineId, Error = ex.Message };
        }
    }

    private CommandAck HandleRestart(string machineId)
    {
        _logger.LogWarning("Executing system RESTART...");
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "shutdown.exe",
                Arguments = "/r /t 0 /f",
                CreateNoWindow = true,
                UseShellExecute = false
            };
            Process.Start(psi);
            return new CommandAck { Command = "RESTART", Success = true, MachineId = machineId };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invoke restart command");
            return new CommandAck { Command = "RESTART", Success = false, MachineId = machineId, Error = ex.Message };
        }
    }

    private async Task HandleShowNotification(string? message)
    {
        var msg = string.IsNullOrWhiteSpace(message) ? "Thông báo từ quản trị viên" : message;
        _logger.LogInformation("Showing notification to user: {Message}", msg);
        await _ipcServerService.ShowNotificationAsync(msg, "Thông báo phòng máy");
    }
}

