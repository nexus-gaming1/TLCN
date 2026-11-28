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
    public int? CurrentMemberId { get; private set; }
    public DateTime? CurrentSessionStartedAt { get; private set; }
    public string? Password { get; private set; }
    public bool IsRemoteSession { get; set; }

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
                Ipv6 = GetLocalIpv6(),
                MacAddress = GetMacAddress(),
                WindowsUser = Environment.UserName,
                Status = CurrentStatus.ToString()
            };
        }
    }

    public string? GetLocalIpv6() => GetLocalIpv6Address();

    public bool Login(string username, int? memberId = null, bool isRemote = false)
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
            CurrentMemberId = memberId;
            CurrentSessionStartedAt ??= DateTime.UtcNow;
            CurrentStatus = MachineStatus.IN_USE;
            IsRemoteSession = isRemote;

            _logger.LogInformation("User logged in: {User} (IsRemote: {IsRemote}). Status changed from {Old} to {New}", CurrentUser, IsRemoteSession, oldStatus, CurrentStatus);

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
            CurrentMemberId = null;
            CurrentSessionStartedAt = null;
            CurrentStatus = MachineStatus.ONLINE;
            IsRemoteSession = false;

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
private static bool IsUsableGlobalIpv6(IPAddress ip)
{
    if (ip.AddressFamily != AddressFamily.InterNetworkV6)
        return false;

    if (IPAddress.IsLoopback(ip) ||
        ip.IsIPv6LinkLocal ||
        ip.IsIPv6SiteLocal ||
        ip.Equals(IPAddress.IPv6Any) ||
        ip.IsIPv6Multicast ||
        ip.IsIPv4MappedToIPv6)
    {
        return false;
    }

    // Loại bỏ Unique Local Address: fc00::/7
    byte[] bytes = ip.GetAddressBytes();

    if ((bytes[0] & 0xFE) == 0xFC)
        return false;

    return true;
}
    private static string? GetLocalIpv6Address()
    {
        try
        {
            // Thử kết nối socket UDP tới địa chỉ IPv6 DNS công cộng để xác định interface ưu tiên
            using var socket = new Socket(AddressFamily.InterNetworkV6, SocketType.Dgram, 0);
            socket.Connect("2001:4860:4860::8888", 65530);
            if (socket.LocalEndPoint is IPEndPoint endPoint)
            {
                var addr = endPoint.Address;
                if (addr.AddressFamily == AddressFamily.InterNetworkV6 &&
                    !IPAddress.IsLoopback(addr) &&
                    !addr.IsIPv6LinkLocal &&
                    !addr.IsIPv6SiteLocal)
                {
                    return addr.ToString();
                }
            }
        }
        catch
        {
            // Mạng có thể chưa có global IPv6 route hoặc socket connect lỗi, fallback qua NetworkInterface
        }

        try
        {
            // Ưu tiên Global IPv6 unicast
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up ||
                    nic.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                {
                    continue;
                }

                var ipProps = nic.GetIPProperties();
                foreach (var unicast in ipProps.UnicastAddresses)
                {
                    var ip = unicast.Address;
                    if (ip.AddressFamily == AddressFamily.InterNetworkV6 &&
                        !IPAddress.IsLoopback(ip) &&
                        !ip.IsIPv6LinkLocal &&
                        !ip.IsIPv6SiteLocal)
                    {
                        return ip.ToString();
                    }
                }
            }

            // Nếu không có Global IPv6, lấy Link-Local IPv6 (fe80::)
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up ||
                    nic.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                {
                    continue;
                }

                var ipProps = nic.GetIPProperties();
                foreach (var unicast in ipProps.UnicastAddresses)
                {
                    var ip = unicast.Address;
                    if (ip.AddressFamily == AddressFamily.InterNetworkV6 && !IPAddress.IsLoopback(ip))
                    {
                        return ip.ToString();
                    }
                }
            }
        }
        catch { }

        return null;
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
