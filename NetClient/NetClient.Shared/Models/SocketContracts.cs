using System.Text.Json.Serialization;

namespace NetClient.Shared.Models;

public class RegisterPayload
{
    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    [JsonPropertyName("hostname")]
    public string Hostname { get; set; } = string.Empty;

    [JsonPropertyName("localIp")]
    public string LocalIp { get; set; } = string.Empty;

    [JsonPropertyName("macAddress")]
    public string? MacAddress { get; set; }

    [JsonPropertyName("windowsUser")]
    public string WindowsUser { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = MachineStatus.ONLINE.ToString();
}

public class HeartbeatPayload
{
    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("performance")]
    public PerformanceData? Performance { get; set; }
}

public class StatusUpdatePayload
{
    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("previousStatus")]
    public string? PreviousStatus { get; set; }

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;
}

public class CommandPayload
{
    [JsonPropertyName("command")]
    public string Command { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }
}

public class CommandAck
{
    [JsonPropertyName("command")]
    public string Command { get; set; } = string.Empty;

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class LoginPayload
{
    [JsonPropertyName("command")]
    public string? Command { get; set; }

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;
}

public class LoginAck
{
    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class LogoutPayload
{
    [JsonPropertyName("command")]
    public string? Command { get; set; }
}

public class LogoutAck
{
    [JsonPropertyName("machineId")]
    public string MachineId { get; set; } = string.Empty;

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public class NotificationPayload
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("durationSeconds")]
    public int DurationSeconds { get; set; } = 5;
}

