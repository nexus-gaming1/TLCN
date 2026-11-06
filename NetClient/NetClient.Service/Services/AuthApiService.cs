using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace NetClient.Service.Services;

public sealed class AuthApiService
{
    private readonly HttpClient _httpClient = new();
    private readonly Uri _loginUri;

    public AuthApiService(IConfiguration configuration)
    {
        var serverUrl = configuration["Server:Url"];
        if (string.IsNullOrWhiteSpace(serverUrl) || !Uri.TryCreate(serverUrl, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException("Server:Url is missing or invalid.");
        }

        _loginUri = new Uri(baseUri, "api/auth/login");
    }

    public async Task<AuthLoginResult> LoginAsync(
        string username,
        string password,
        CancellationToken cancellationToken = default)
    {
        using var response = await _httpClient.PostAsJsonAsync(
            _loginUri,
            new { username, password },
            cancellationToken);

        var payload = await response.Content.ReadFromJsonAsync<AuthLoginResponse>(
            cancellationToken);

        if (payload?.Status == "success" && payload.Data?.User != null)
        {
            return new AuthLoginResult(
                true,
                null,
                payload.Data.User.Username,
                payload.Data.User.MemberId);
        }

        var message = payload?.Message;
        if (string.IsNullOrWhiteSpace(message))
        {
            message = response.IsSuccessStatusCode
                ? "Đăng nhập thất bại."
                : $"Backend từ chối đăng nhập (HTTP {(int)response.StatusCode}).";
        }

        return new AuthLoginResult(false, message, null, null);
    }

    private sealed class AuthLoginResponse
    {
        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("data")]
        public AuthLoginData? Data { get; set; }
    }

    private sealed class AuthLoginData
    {
        [JsonPropertyName("user")]
        public AuthUser? User { get; set; }
    }

    private sealed class AuthUser
    {
        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("memberProfile")]
        public AuthMemberProfile? MemberProfile { get; set; }

        public int? MemberId => MemberProfile?.MemberId;
    }

    private sealed class AuthMemberProfile
    {
        [JsonPropertyName("member_id")]
        public int MemberId { get; set; }
    }
}

public sealed record AuthLoginResult(bool Success, string? Error, string? Username, int? MemberId);
