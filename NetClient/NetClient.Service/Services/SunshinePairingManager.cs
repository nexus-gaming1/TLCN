using System.Collections.Concurrent;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace NetClient.Service.Services;

public class SunshinePairingManager : IDisposable
{
    private readonly SunshineService _sunshineService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SunshinePairingManager> _logger;

    private readonly object _lock = new();
    private CancellationTokenSource? _detectionCts;
    private Task? _detectionTask;
    private string? _activeIntentId;
    private int _activeComputerId;

    private readonly ConcurrentDictionary<string, byte> _confirmedPairingIds = new();
    private readonly ConcurrentDictionary<string, byte> _reportedPairingIds = new();

    public SunshinePairingManager(
        SunshineService sunshineService,
        IConfiguration configuration,
        ILogger<SunshinePairingManager> logger)
    {
        _sunshineService = sunshineService;
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsDetecting
    {
        get
        {
            lock (_lock)
            {
                return _detectionCts != null && !_detectionCts.IsCancellationRequested;
            }
        }
    }

    /// <summary>
    /// Bắt đầu polling tìm kiếm pending pairing từ Sunshine cho một intent cụ thể.
    /// Đảm bảo chỉ có DUY NHẤT một vòng lặp polling chạy tại một thời điểm trên máy.
    /// </summary>
    public void StartDetection(
        string intentId,
        int computerId,
        int timeoutSeconds,
        Func<SunshinePairing, Task> onPairingDetected)
    {
        lock (_lock)
        {
            // Stop any existing loop first
            StopDetectionInternal();

            _activeIntentId = intentId;
            _activeComputerId = computerId;
            _reportedPairingIds.Clear();

            _detectionCts = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(30, timeoutSeconds)));
            var token = _detectionCts.Token;

            var intervalMs = _configuration.GetValue<int>("Sunshine:PollingIntervalMs", 1500);

            _logger.LogInformation(
                "Starting Sunshine pairing detection loop for Intent {IntentId}, Computer {ComputerId}, Timeout {Timeout}s, Interval {Interval}ms",
                intentId, computerId, timeoutSeconds, intervalMs);

            _detectionTask = Task.Run(async () =>
            {
                try
                {
                    while (!token.IsCancellationRequested)
                    {
                        try
                        {
                            var pairings = await _sunshineService.GetPendingPairingsAsync(token);

                            if (pairings.Count > 0)
                            {
                                if (pairings.Count == 1)
                                {
                                    var single = pairings[0];
                                    if (!_reportedPairingIds.ContainsKey(single.Id))
                                    {
                                        _reportedPairingIds.TryAdd(single.Id, 0);
                                        _logger.LogInformation(
                                            "Detected single pending Moonlight pairing on Sunshine: Id={PairingId}, Device={Name}, Address={Address}",
                                            single.Id, single.Name, single.Address);

                                        await onPairingDetected(single);
                                    }
                                }
                                else
                                {
                                    _logger.LogWarning(
                                        "Multiple pending Sunshine pairings found ({Count}). Cannot disambiguate safely without correlation. Waiting for conflict resolution.",
                                        pairings.Count);
                                }
                            }
                        }
                        catch (OperationCanceledException) when (token.IsCancellationRequested)
                        {
                            break;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Transient error polling Sunshine GET api/pin in detection loop");
                        }

                        await Task.Delay(intervalMs, token);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Sunshine pairing detection loop ended for Intent {IntentId}", intentId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in Sunshine pairing detection loop for Intent {IntentId}", intentId);
                }
            }, token);
        }
    }

    /// <summary>
    /// Dừng vòng lặp polling
    /// </summary>
    public void StopDetection(string? intentId = null)
    {
        lock (_lock)
        {
            if (intentId != null && _activeIntentId != null && _activeIntentId != intentId)
            {
                _logger.LogDebug("StopDetection ignored: active intent is {Active}, requested was {Requested}", _activeIntentId, intentId);
                return;
            }

            StopDetectionInternal();
        }
    }

    private void StopDetectionInternal()
    {
        if (_detectionCts != null)
        {
            try
            {
                _detectionCts.Cancel();
                _detectionCts.Dispose();
            }
            catch { }
            _detectionCts = null;
        }

        _activeIntentId = null;
        _activeComputerId = 0;
    }

    /// <summary>
    /// Xác nhận mã PIN cho một pairing request. Chống double confirmation.
    /// </summary>
    public async Task<bool> ConfirmPairingAsync(
        string intentId,
        string pairingId,
        string pin,
        string? clientName = null,
        CancellationToken cancellationToken = default)
    {
        if (!_confirmedPairingIds.TryAdd(pairingId, 0))
        {
            _logger.LogWarning("Pairing ID {PairingId} has already been confirmed or is in progress. Rejecting duplicate attempt.", pairingId);
            throw new InvalidOperationException($"Pairing ID {pairingId} đã được xác nhận trước đó.");
        }

        try
        {
            _logger.LogInformation("Executing Sunshine confirmation for Intent {IntentId}, PairingId {PairingId}", intentId, pairingId);

            var success = await _sunshineService.ConfirmPairingAsync(
                pairingId,
                pin,
                clientName,
                cancellationToken);

            if (success)
            {
                StopDetection(intentId);
            }
            else
            {
                // If failed, allow retry by removing from confirmed dictionary
                _confirmedPairingIds.TryRemove(pairingId, out _);
            }

            return success;
        }
        catch
        {
            _confirmedPairingIds.TryRemove(pairingId, out _);
            throw;
        }
    }

    public void Dispose()
    {
        StopDetectionInternal();
        GC.SuppressFinalize(this);
    }
}

