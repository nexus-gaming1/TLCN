namespace NetClient.Shared.Models;

public class MachineInfo
{
    public string MachineId { get; set; } = string.Empty;
    public string Hostname { get; set; } = string.Empty;
    public string LocalIp { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
    public string WindowsUser { get; set; } = string.Empty;
    public string Status { get; set; } = MachineStatus.ONLINE.ToString();
}

