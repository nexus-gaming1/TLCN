using System.Net;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NetClient.Service.Services;
using Xunit;

namespace NetClient.Tests;

/// <summary>
/// Unit tests for SunshinePairingManager — polling engine, dedup, and concurrent safety.
/// Uses mock SunshineService to avoid real network calls.
/// </summary>
public class SunshinePairingManagerTests : IDisposable
{
    private readonly SunshineCredentialStore _credentialStore;
    private readonly IConfiguration _config;

    public SunshinePairingManagerTests()
    {
        _credentialStore = new SunshineCredentialStore();
        try { _credentialStore.Save("admin", "test_pass"); } catch { }

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Sunshine:PollingIntervalMs"] = "50"   // Fast polling for unit tests
            })
            .Build();
    }

    public void Dispose()
    {
        try { _credentialStore.Delete(); } catch { }
    }

    // ─────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────

    private SunshineService CreateServiceWith(Func<HttpRequestMessage, HttpResponseMessage> handler)
    {
        var mock = new MockHttpMessageHandler(handler);
        var client = new HttpClient(mock)
        {
            BaseAddress = new Uri("https://127.0.0.1:47990/")
        };
        return new SunshineService(new MockHttpClientFactory(client), _credentialStore, NullLogger<SunshineService>.Instance);
    }

    private static SunshineService CreateEmptyService()
    {
        var mock = new MockHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"pairings\":[]}", Encoding.UTF8, "application/json")
        });
        var client = new HttpClient(mock) { BaseAddress = new Uri("https://127.0.0.1:47990/") };
        var store = new SunshineCredentialStore();
        return new SunshineService(new MockHttpClientFactory(client), store, NullLogger<SunshineService>.Instance);
    }

    private static SunshinePairing MakePairing(string id = "p1", string name = "Device", string addr = "1.2.3.4")
        => new() { Id = id, Name = name, Address = addr };

    private SunshinePairingManager CreateManager(SunshineService svc)
        => new(svc, _config, NullLogger<SunshinePairingManager>.Instance);

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-01: StartDetection fires callback when single pairing appears
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StartDetection_SinglePendingPairing_CallsCallbackOnce()
    {
        var json = """{"pairings":[{"id":"p-01","name":"Moonlight TV","address":"192.168.1.10"}]}""";
        var svc = CreateServiceWith(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        using var manager = CreateManager(svc);
        var detected = new List<SunshinePairing>();
        var tcs = new TaskCompletionSource<bool>();

        manager.StartDetection("intent-01", 1, 30, pairing =>
        {
            detected.Add(pairing);
            tcs.TrySetResult(true);
            return Task.CompletedTask;
        });

        var completed = await Task.WhenAny(tcs.Task, Task.Delay(3000));
        Assert.Same(tcs.Task, completed);    // callback fired before timeout

        manager.StopDetection("intent-01");

        Assert.Single(detected);
        Assert.Equal("p-01", detected[0].Id);
        Assert.Equal("Moonlight TV", detected[0].Name);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-02: Same pairing ID is NOT reported twice
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StartDetection_SamePairingId_ReportsOnlyOnce()
    {
        var json = """{"pairings":[{"id":"dup-01","name":"Dupe","address":"1.1.1.1"}]}""";
        var callCount = 0;
        var svc = CreateServiceWith(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        using var manager = CreateManager(svc);

        manager.StartDetection("intent-dup", 1, 30, pairing =>
        {
            Interlocked.Increment(ref callCount);
            return Task.CompletedTask;
        });

        // Let the loop run for a few cycles
        await Task.Delay(300);
        manager.StopDetection("intent-dup");

        Assert.Equal(1, callCount);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-03: Multiple pending pairings → callback NOT called (ambiguous)
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StartDetection_MultiplePendingPairings_DoesNotCallCallback()
    {
        var json = """
        {"pairings":[
            {"id":"p-A","name":"DeviceA","address":"10.0.0.1"},
            {"id":"p-B","name":"DeviceB","address":"10.0.0.2"}
        ]}
        """;
        var callCount = 0;
        var svc = CreateServiceWith(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        using var manager = CreateManager(svc);

        manager.StartDetection("intent-multi", 1, 30, _ =>
        {
            Interlocked.Increment(ref callCount);
            return Task.CompletedTask;
        });

        await Task.Delay(300);
        manager.StopDetection("intent-multi");

        Assert.Equal(0, callCount);  // Must NOT be called when ambiguous
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-04: StopDetection cancels the loop
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StopDetection_CancelsPollingLoop()
    {
        var json = """{"pairings":[{"id":"p-stop","name":"Stop","address":"5.5.5.5"}]}""";
        var callCount = 0;
        var svc = CreateServiceWith(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        using var manager = CreateManager(svc);

        manager.StartDetection("intent-stop", 1, 30, _ =>
        {
            Interlocked.Increment(ref callCount);
            return Task.CompletedTask;
        });

        // Stop immediately after first callback
        await Task.Delay(200);
        manager.StopDetection("intent-stop");
        var countAfterStop = callCount;

        // Wait a bit more and ensure count doesn't increase
        await Task.Delay(200);
        Assert.Equal(countAfterStop, callCount);
        Assert.False(manager.IsDetecting);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-05: StopDetection with wrong intentId is ignored (no-op)
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StopDetection_WrongIntentId_IsIgnored()
    {
        var svc = CreateEmptyService();
        using var manager = CreateManager(svc);

        manager.StartDetection("intent-current", 1, 30, _ => Task.CompletedTask);
        Assert.True(manager.IsDetecting);

        // Try to stop a different intent
        manager.StopDetection("intent-other");

        // The loop should still be running
        Assert.True(manager.IsDetecting);

        manager.StopDetection("intent-current");
        await Task.Delay(100);
        Assert.False(manager.IsDetecting);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-06: Second StartDetection replaces first loop (single loop guarantee)
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StartDetection_CalledTwice_OldLoopIsReplaced()
    {
        var svc = CreateEmptyService();
        using var manager = CreateManager(svc);

        manager.StartDetection("intent-first", 1, 30, _ => Task.CompletedTask);
        Assert.True(manager.IsDetecting);

        // Starting a second detection should stop the first
        manager.StartDetection("intent-second", 2, 30, _ => Task.CompletedTask);
        Assert.True(manager.IsDetecting);

        // Only one loop is active — stopping by current intent works
        manager.StopDetection("intent-second");
        await Task.Delay(100);
        Assert.False(manager.IsDetecting);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-07: ConfirmPairing delegates to SunshineService correctly
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ConfirmPairing_Success_ReturnsTrue()
    {
        var requestCount = 0;
        string? capturedPairingId = null;

        var svc = CreateServiceWith(req =>
        {
            Interlocked.Increment(ref requestCount);
            if (req.Method == HttpMethod.Post)
            {
                // Read request body to capture pairingId
                var body = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult() ?? "";
                capturedPairingId = body;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"status\":true}", Encoding.UTF8, "application/json")
                };
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"pairings\":[]}", Encoding.UTF8, "application/json")
            };
        });

        using var manager = CreateManager(svc);

        var result = await manager.ConfirmPairingAsync("intent-confirm", "pair-xyz", "4321", "Moonlight PC");

        Assert.True(result);
        Assert.NotNull(capturedPairingId);
        Assert.Contains("pair-xyz", capturedPairingId);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-08: Duplicate confirmation of same pairingId is rejected
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ConfirmPairing_DuplicateId_ThrowsInvalidOperationException()
    {
        var svc = CreateServiceWith(req =>
        {
            if (req.Method == HttpMethod.Post)
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("{\"status\":true}", Encoding.UTF8, "application/json")
                };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"pairings\":[]}", Encoding.UTF8, "application/json")
            };
        });

        using var manager = CreateManager(svc);

        // First confirmation succeeds
        await manager.ConfirmPairingAsync("intent-dup-confirm", "pair-dedup-01", "1234");

        // Second confirmation of same pairing ID must throw
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => manager.ConfirmPairingAsync("intent-dup-confirm", "pair-dedup-01", "1234"));
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-09: Failed confirmation allows retry (pairingId removed from dedup set)
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ConfirmPairing_Failed_AllowsRetry()
    {
        var callCount = 0;
        var svc = CreateServiceWith(req =>
        {
            if (req.Method == HttpMethod.Post)
            {
                var n = Interlocked.Increment(ref callCount);
                // First call: rejected; Second call: accepted
                var status = n >= 2 ? "true" : "false";
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent($"{{\"status\":{status}}}", Encoding.UTF8, "application/json")
                };
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"pairings\":[]}", Encoding.UTF8, "application/json")
            };
        });

        using var manager = CreateManager(svc);

        // First attempt: returns false (wrong PIN)
        var result1 = await manager.ConfirmPairingAsync("intent-retry", "pair-retry-01", "0000");
        Assert.False(result1);

        // Second attempt: same pairingId, but now returns true — must be allowed (retry)
        var result2 = await manager.ConfirmPairingAsync("intent-retry", "pair-retry-01", "1234");
        Assert.True(result2);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-10: Dispose stops the detection loop
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Dispose_StopsDetectionLoop()
    {
        var svc = CreateEmptyService();
        SunshinePairingManager manager;

        using (manager = CreateManager(svc))
        {
            manager.StartDetection("intent-dispose", 1, 30, _ => Task.CompletedTask);
            Assert.True(manager.IsDetecting);
        }   // Dispose called here

        await Task.Delay(100);
        Assert.False(manager.IsDetecting);
    }

    // ─────────────────────────────────────────────────────────
    //  TC-SPM-11: Empty pairings list → callback never called
    // ─────────────────────────────────────────────────────────

    [Fact]
    public async Task StartDetection_EmptyPairings_CallbackNeverFired()
    {
        var svc = CreateEmptyService();
        var callCount = 0;

        using var manager = CreateManager(svc);

        manager.StartDetection("intent-empty", 1, 30, _ =>
        {
            Interlocked.Increment(ref callCount);
            return Task.CompletedTask;
        });

        await Task.Delay(300);
        manager.StopDetection("intent-empty");

        Assert.Equal(0, callCount);
    }

    // ─────────────────────────────────────────────────────────
    //  Shared mock infrastructure
    // ─────────────────────────────────────────────────────────

    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;
        public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler) => _handler = handler;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(_handler(request));
    }

    private class MockHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;
        public MockHttpClientFactory(HttpClient client) => _client = client;
        public HttpClient CreateClient(string name) => _client;
    }
}

