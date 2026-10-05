using System.Text.Json.Serialization;

namespace NetClient.Shared.Ipc;

public enum IpcAction
{
    ShowOverlay,
    HideOverlay,
    SetStatus,
    SetUsername,
    ShowNotification,
    Ping,
    Pong,
    UiReady,
    ClientLogin
}

public class IpcMessage
{
    [JsonPropertyName("action")]
    public IpcAction Action { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("machineId")]
    public string? MachineId { get; set; }
}

public static class IpcConstants
{
    public const string PipeName = "NetClient_Ipc_Pipe";
}

