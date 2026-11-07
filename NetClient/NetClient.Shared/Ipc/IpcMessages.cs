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
    ClientLogin,
    LoginResult,
    LegacyClientLogin,
    ClientLogout
}

public class IpcMessage
{
    [JsonPropertyName("action")]
    public IpcAction Action { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("password")]
    public string? Password { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("machineId")]
    public string? MachineId { get; set; }

    [JsonPropertyName("success")]
    public bool? Success { get; set; }

    [JsonPropertyName("accessToken")]
    public string? AccessToken { get; set; } ///Chuỗi JWT AccessToken được Backend cấp khi đăng nhập thành công --> giao từ Service xuống NetClientApp gọi REST API.
}

public static class IpcConstants
{
    public const string PipeName = "NetClient_Ipc_Pipe";
}
