
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace NetClient.Service.Services;

public class SunshineService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SunshineCredentialStore _credentialStore;
    private readonly ILogger<SunshineService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public SunshineService(
        IHttpClientFactory httpClientFactory,
        SunshineCredentialStore credentialStore,
        ILogger<SunshineService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _credentialStore = credentialStore;
        _logger = logger;
    }

    public async Task PairAsync(
        string pin,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(pin) ||
            pin.Length != 4 ||
            !pin.All(char.IsDigit))
        {
            throw new ArgumentException("PIN phải gồm 4 chữ số.");
        }

        // Lấy credentials Sunshine
        var credentials = _credentialStore.Load();

        var client = _httpClientFactory.CreateClient("Sunshine");

        // Tạo Basic Authentication
        var auth = Convert.ToBase64String(
            Encoding.UTF8.GetBytes(
                $"{credentials.Username}:{credentials.Password}"
            )
        );

        // 1. Lấy danh sách pairing đang chờ
        using var getRequest = new HttpRequestMessage(
            HttpMethod.Get,
            "api/pin"
        );

        getRequest.Headers.Authorization =
            new AuthenticationHeaderValue("Basic", auth);

        using var getResponse = await client.SendAsync(
            getRequest,
            cancellationToken
        );

        getResponse.EnsureSuccessStatusCode();

        var json = await getResponse.Content.ReadAsStringAsync(
            cancellationToken
        );

        var pending = JsonSerializer.Deserialize<PendingPairingsResponse>(
            json,
            JsonOptions
        );

        var pairings = pending?.Pairings ?? [];

        if (pairings.Count == 0)
        {
            throw new InvalidOperationException(
                "Không có thiết bị Moonlight nào đang chờ pairing."
            );
        }

        _logger.LogInformation(
            "Found {Count} pending Sunshine pairing requests",
            pairings.Count
        );

        // 2. Gửi PIN đến tất cả pairing request đang chờ
        var tasks = pairings.Select(pairing =>
            TryPairAsync(
                client,
                auth,
                pairing,
                pin,
                cancellationToken
            )
        );

        var results = await Task.WhenAll(tasks);

        if (!results.Any(success => success))
        {
            throw new InvalidOperationException(
                "Pairing thất bại. Không có thiết bị Moonlight nào xác thực PIN thành công."
            );
        }

        _logger.LogInformation(
            "Sunshine pairing completed successfully"
        );
    }

    private async Task<bool> TryPairAsync(
        HttpClient client,
        string auth,
        PendingPairing pairing,
        string pin,
        CancellationToken cancellationToken)
    {
        try
        {
            var body = new PairingRequest
            {
                PairingId = pairing.Id,
                Pin = pin,
                Name = string.IsNullOrWhiteSpace(pairing.Name)
                    ? Environment.MachineName
                    : pairing.Name
            };

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "api/pin"
            );

            request.Headers.Authorization =
                new AuthenticationHeaderValue("Basic", auth);

            request.Content = new StringContent(
                JsonSerializer.Serialize(body),
                Encoding.UTF8,
                "application/json"
            );

            using var response = await client.SendAsync(
                request,
                cancellationToken
            );

            var json = await response.Content.ReadAsStringAsync(
                cancellationToken
            );

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Pairing request {PairingId} returned HTTP {StatusCode}",
                    pairing.Id,
                    response.StatusCode
                );

                return false;
            }

            var result = JsonSerializer.Deserialize<PairingResult>(
                json,
                JsonOptions
            );

            if (result?.Status == true)
            {
                _logger.LogInformation(
                    "Moonlight pairing succeeded: {Name} ({Address})",
                    pairing.Name,
                    pairing.Address
                );

                return true;
            }

            _logger.LogDebug(
                "Pairing failed for {Name} ({Address})",
                pairing.Name,
                pairing.Address
            );

            return false;
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to pair Moonlight device {Name}",
                pairing.Name
            );

            return false;
        }
    }

    private class PendingPairingsResponse
    {
        [JsonPropertyName("pairings")]
        public List<PendingPairing> Pairings { get; set; } = [];
    }

    private class PendingPairing
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;
    }

    private class PairingRequest
    {
        [JsonPropertyName("pairing_id")]
        public string PairingId { get; set; } = string.Empty;

        [JsonPropertyName("pin")]
        public string Pin { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    private class PairingResult
    {
        [JsonPropertyName("status")]
        public bool Status { get; set; }
    }
}
