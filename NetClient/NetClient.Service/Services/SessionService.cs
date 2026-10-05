using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NetClient.Shared.Models;

namespace NetClient.Service.Services;

public class SessionService
{
    private readonly ILogger<SessionService> _logger;
    private readonly IConfiguration _configuration;
    private readonly object _lock = new();

    public MachineStatus CurrentStatus { get; private set; } = MachineStatus.ONLINE;
    public string? CurrentUser { get; private set; }
    public string MachineId { get; }
    public string Hostname { get; }

    public event Action<MachineStatus, MachineStatus>? StatusChanged;
    public event Action<string>? UserLoggedIn;
    public event Action? UserLoggedOut;

    public SessionService(ILogger<SessionService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;

        Hostname = Environment.MachineName;

        string? configuredId = _configuration["Client:MachineId"];
        if (!string.IsNullOrWhiteSpace(configuredId))
        {
            MachineId = configuredId.Trim();
        }
        else
        {
            MachineId = Hostname;
        }

        _logger.LogInformation("SessionService initialized. MachineId: {MachineId}, Hostname: {Hostname}", MachineId, Hostname);
    }

    public MachineInfo GetMachineInfo()
    {
        lock (_lock)
        {
            return new MachineInfo
            {
                MachineId = MachineId,
                Hostname = Hostname,
                LocalIp = GetLocalIpAddress(),
                MacAddress = GetMacAddress(),
                WindowsUser = Environment.UserName,
                Status = CurrentStatus.ToString()
            };
        }
    }

    public bool Login(string username)
    {
        lock (_lock)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                _logger.LogWarning("Attempted login with empty username");
                return false;
            }

            var oldStatus = CurrentStatus;
            CurrentUser = username.Trim();
            CurrentStatus = MachineStatus.IN_USE;

            _logger.LogInformation("User logged in: {User}. Status changed from {Old} to {New}", CurrentUser, oldStatus, CurrentStatus);

            UserLoggedIn?.Invoke(CurrentUser);
            StatusChanged?.Invoke(CurrentStatus, oldStatus);
            return true;
        }
    }

    public void Logout()
    {
        lock (_lock)
        {
            var oldStatus = CurrentStatus;
            var prevUser = CurrentUser;
            CurrentUser = null;
            CurrentStatus = MachineStatus.ONLINE;

            _logger.LogInformation("User logged out (was {User}). Status changed from {Old} to {New}", prevUser, oldStatus, CurrentStatus);

            UserLoggedOut?.Invoke();
            StatusChanged?.Invoke(CurrentStatus, oldStatus);
        }
    }

    public void SetStatus(MachineStatus newStatus)
    {
        lock (_lock)
        {
            if (CurrentStatus == newStatus) return;

            var oldStatus = CurrentStatus;
            CurrentStatus = newStatus;
            _logger.LogInformation("Machine status changed from {Old} to {New}", oldStatus, newStatus);
            StatusChanged?.Invoke(CurrentStatus, oldStatus);
        }
    }

    private static string GetLocalIpAddress()
    {
        try
        {
            using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
            socket.Connect("8.8.8.8", 65530);
            if (socket.LocalEndPoint is IPEndPoint endPoint)
            {
                return endPoint.Address.ToString();
            }
        }
        catch
        {
            // Fallback via Dns
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                    {
                        return ip.ToString();
                    }
                }
            }
            catch { }
        }

        return "127.0.0.1";
    }

    private static string? GetMacAddress()
    {
        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus == OperationalStatus.Up &&
                    nic.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                {
                    var mac = nic.GetPhysicalAddress().ToString();
                    if (!string.IsNullOrEmpty(mac))
                    {
                        return string.Join(":", Enumerable.Range(0, mac.Length / 2)
                            .Select(i => mac.Substring(i * 2, 2)));
                    }
                }
            }
        }
        catch { }

        return null;
    }
}

