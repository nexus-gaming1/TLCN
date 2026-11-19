using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace NetClient.Service.Services;

public class SunshinePairing
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
}

public class SunshineException : Exception
{
    public HttpStatusCode? StatusCode { get; }
    public string ErrorCode { get; }

    public SunshineException(string message, string errorCode = "UNKNOWN", HttpStatusCode? statusCode = null, Exception? innerException = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
    }
}

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

    private AuthenticationHeaderValue CreateBasicAuthHeader()
    {
        var credentials = _credentialStore.Load();
        if (string.IsNullOrWhiteSpace(credentials.Username) || string.IsNullOrWhiteSpace(credentials.Password))
        {
            throw new SunshineException("Sunshine credentials are empty or not configured.", "UNAUTHORIZED", HttpStatusCode.Unauthorized);
        }

        var auth = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{credentials.Username}:{credentials.Password}")
        );

        return new AuthenticationHeaderValue("Basic", auth);
    }

    /// <summary>
    /// Lấy danh sách pairing requests đang chờ trên Sunshine (GET /api/pin)
    /// </summary>
    public async Task<IReadOnlyList<SunshinePairing>> GetPendingPairingsAsync(CancellationToken cancellationToken = default)
    {
        HttpClient client;
        try
        {
            client = _httpClientFactory.CreateClient("Sunshine");
        }
        catch (Exception ex)
        {
            throw new SunshineException($"Failed to create Sunshine HTTP client: {ex.Message}", "CLIENT_CONFIG_ERROR", innerException: ex);
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "api/pin");
        request.Headers.Authorization = CreateBasicAuthHeader();

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogError(ex, "Timeout connecting to Sunshine GET api/pin");
            throw new SunshineException("Kết nối tới Sunshine bị quá thời gian (Timeout).", "TIMEOUT", innerException: ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Sunshine (Offline or Unreachable)");
            throw new SunshineException("Không thể kết nối đến Sunshine Host. Dịch vụ có thể đang offline.", "OFFLINE", innerException: ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
            {
                throw new SunshineException("Không thể xác thực với Sunshine. Sai username hoặc password.", "UNAUTHORIZED", response.StatusCode);
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                throw new SunshineException($"Sunshine API trả về mã lỗi HTTP {(int)response.StatusCode}: {errorBody}", "SERVER_ERROR", response.StatusCode);
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(json))
            {
                return [];
            }

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var list = new List<SunshinePairing>();

                if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("pairings", out var pairingsElem) && pairingsElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in pairingsElem.EnumerateArray())
                    {
                        list.Add(ParsePairingElement(item));
                    }
                }
                else if (root.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in root.EnumerateArray())
                    {
                        list.Add(ParsePairingElement(item));
                    }
                }

                return list;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Malformed JSON response received from Sunshine GET api/pin: {Json}", json);
                throw new SunshineException("Dữ liệu phản hồi từ Sunshine bị lỗi định dạng (Malformed JSON).", "MALFORMED_RESPONSE", innerException: ex);
            }
        }
    }

    private static SunshinePairing ParsePairingElement(JsonElement elem)
    {
        var pairing = new SunshinePairing();
        if (elem.TryGetProperty("id", out var idProp))
        {
            pairing.Id = idProp.GetString() ?? string.Empty;
        }
        else if (elem.TryGetProperty("pairing_id", out var pidProp))
        {
            pairing.Id = pidProp.GetString() ?? string.Empty;
        }

        if (elem.TryGetProperty("name", out var nameProp))
        {
            pairing.Name = nameProp.GetString() ?? string.Empty;
        }

        if (elem.TryGetProperty("address", out var addrProp))
        {
            pairing.Address = addrProp.GetString() ?? string.Empty;
        }
        else if (elem.TryGetProperty("ip", out var ipProp))
        {
            pairing.Address = ipProp.GetString() ?? string.Empty;
        }

        return pairing;
    }

    /// <summary>
    /// Xác nhận mã PIN ghép nối cho một pairing_id cụ thể (POST /api/pin)
    /// </summary>
    public async Task<bool> ConfirmPairingAsync(
        string pairingId,
        string pin,
        string? clientName = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(pairingId))
        {
            throw new ArgumentException("Pairing ID không được để trống.", nameof(pairingId));
        }

        if (string.IsNullOrWhiteSpace(pin) || pin.Length != 4 || !pin.All(char.IsDigit))
        {
            throw new ArgumentException("Mã PIN phải gồm đúng 4 chữ số.", nameof(pin));
        }

        var client = _httpClientFactory.CreateClient("Sunshine");

        var payload = new PairingRequest
        {
            PairingId = pairingId.Trim(),
            Pin = pin.Trim(),
            Name = string.IsNullOrWhiteSpace(clientName) ? Environment.MachineName : clientName.Trim()
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "api/pin")
        {
            Headers = { Authorization = CreateBasicAuthHeader() },
            Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            )
        };

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogError(ex, "Timeout connecting to Sunshine POST api/pin");
            throw new SunshineException("Hết thời gian chờ phản hồi xác nhận từ Sunshine (Timeout).", "TIMEOUT", innerException: ex);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Sunshine host");
            throw new SunshineException("Không thể kết nối đến Sunshine Host khi xác nhận PIN.", "OFFLINE", innerException: ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
            {
                throw new SunshineException("Không thể xác thực với Sunshine. Kiểm tra username/password.", "UNAUTHORIZED", response.StatusCode);
            }

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                throw new SunshineException("Pairing ID không tồn tại hoặc đã hết hạn trên Sunshine.", "NOT_FOUND", response.StatusCode);
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                throw new SunshineException($"Sunshine từ chối xác nhận PIN (HTTP {(int)response.StatusCode}): {json}", "CONFIRMATION_REJECTED", response.StatusCode);
            }

            try
            {
                var result = JsonSerializer.Deserialize<PairingResult>(json, JsonOptions);
                if (result?.Status == true)
                {
                    _logger.LogInformation("Sunshine pairing successfully confirmed for pairing ID {PairingId}", pairingId);
                    return true;
                }

                _logger.LogWarning("Sunshine pairing returned false status for pairing ID {PairingId}. Body: {Json}", pairingId, json);
                return false;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Malformed JSON from Sunshine POST api/pin: {Json}", json);
                throw new SunshineException("Dữ liệu phản hồi từ Sunshine bị lỗi định dạng.", "MALFORMED_RESPONSE", innerException: ex);
            }
        }
    }

    /// <summary>
    /// Backward-compatible PairAsync implementation
    /// </summary>
    public async Task PairAsync(string pin, CancellationToken cancellationToken = default)
    {
        var pairings = await GetPendingPairingsAsync(cancellationToken);
        if (pairings.Count == 0)
        {
            throw new InvalidOperationException("Không có thiết bị Moonlight nào đang chờ pairing.");
        }

        if (pairings.Count > 1)
        {
            throw new InvalidOperationException("Có nhiều hơn 1 thiết bị Moonlight đang chờ pairing. Cần xác định chính xác pairing_id thay vì ghép tự động.");
        }

        var target = pairings[0];
        bool success = await ConfirmPairingAsync(target.Id, pin, target.Name, cancellationToken);
        if (!success)
        {
            throw new InvalidOperationException("Xác nhận mã PIN thất bại.");
        }
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
