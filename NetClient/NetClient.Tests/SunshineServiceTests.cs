using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using NetClient.Service.Services;
using Xunit;

namespace NetClient.Tests;

public class SunshineServiceTests : IDisposable
{
    private readonly SunshineCredentialStore _credentialStore;

    public SunshineServiceTests()
    {
        _credentialStore = new SunshineCredentialStore();
        try
        {
            _credentialStore.Save("admin", "test_sunshine_pass_123");
        }
        catch
        {
            // Ignore if DPAPI fails in non-elevated sandbox
        }
    }

    public void Dispose()
    {
        try
        {
            _credentialStore.Delete();
        }
        catch { }
    }

    private SunshineService CreateService(Func<HttpRequestMessage, HttpResponseMessage> handlerFunc)
    {
        var mockHandler = new MockHttpMessageHandler(handlerFunc);
        var httpClient = new HttpClient(mockHandler)
        {
            BaseAddress = new Uri("https://127.0.0.1:47990/")
        };
        var factory = new MockHttpClientFactory(httpClient);
        return new SunshineService(factory, _credentialStore, NullLogger<SunshineService>.Instance);
    }

    [Fact]
    public async Task GetPendingPairings_ValidResponse_ParsesCorrectly()
    {
        var json = """
        {
            "pairings": [
                {
                    "id": "pairing-abc-123",
                    "name": "Living Room Moonlight",
                    "address": "192.168.1.55"
                }
            ]
        }
        """;

        var service = CreateService(req =>
        {
            Assert.Equal(HttpMethod.Get, req.Method);
            Assert.Contains("api/pin", req.RequestUri?.ToString() ?? "");
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        });

        var result = await service.GetPendingPairingsAsync();

        Assert.Single(result);
        Assert.Equal("pairing-abc-123", result[0].Id);
        Assert.Equal("Living Room Moonlight", result[0].Name);
        Assert.Equal("192.168.1.55", result[0].Address);
    }

    [Fact]
    public async Task GetPendingPairings_RawArrayResponse_ParsesCorrectly()
    {
        var json = """
        [
            {
                "id": "pairing-raw-999",
                "name": "Raw Array Moonlight",
                "address": "192.168.1.66"
            }
        ]
        """;

        var service = CreateService(req =>
        {
            Assert.Equal(HttpMethod.Get, req.Method);
            Assert.Contains("api/pin", req.RequestUri?.ToString() ?? "");
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        });

        var result = await service.GetPendingPairingsAsync();

        Assert.Single(result);
        Assert.Equal("pairing-raw-999", result[0].Id);
        Assert.Equal("Raw Array Moonlight", result[0].Name);
        Assert.Equal("192.168.1.66", result[0].Address);
    }

    [Fact]
    public async Task GetPendingPairings_EmptyResponse_ReturnsEmptyList()
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("", Encoding.UTF8, "application/json")
        });

        var result = await service.GetPendingPairingsAsync();
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPendingPairings_MalformedJson_ThrowsSunshineException()
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<<not json>>", Encoding.UTF8, "application/json")
        });

        var ex = await Assert.ThrowsAsync<SunshineException>(() => service.GetPendingPairingsAsync());
        Assert.Equal("MALFORMED_RESPONSE", ex.ErrorCode);
    }

    [Fact]
    public async Task GetPendingPairings_SunshineOffline_ThrowsSunshineException()
    {
        var service = CreateService(req => throw new HttpRequestException("Connection refused"));

        var ex = await Assert.ThrowsAsync<SunshineException>(() => service.GetPendingPairingsAsync());
        Assert.Equal("OFFLINE", ex.ErrorCode);
    }

    [Fact]
    public async Task GetPendingPairings_Timeout_ThrowsSunshineException()
    {
        var service = CreateService(req => throw new OperationCanceledException("HttpClient timeout"));

        var ex = await Assert.ThrowsAsync<SunshineException>(() => service.GetPendingPairingsAsync());
        Assert.Equal("TIMEOUT", ex.ErrorCode);
    }

    [Fact]
    public async Task GetPendingPairings_Unauthorized_ThrowsSunshineException()
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.Unauthorized));

        var ex = await Assert.ThrowsAsync<SunshineException>(() => service.GetPendingPairingsAsync());
        Assert.Equal("UNAUTHORIZED", ex.ErrorCode);
    }

    [Fact]
    public async Task GetPendingPairings_ServerError500_ThrowsSunshineException()
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("Internal server error", Encoding.UTF8, "text/plain")
        });

        var ex = await Assert.ThrowsAsync<SunshineException>(() => service.GetPendingPairingsAsync());
        Assert.Equal("SERVER_ERROR", ex.ErrorCode);
    }

    [Fact]
    public async Task ConfirmPairing_InvalidPairingId_ThrowsArgumentException()
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.OK));

        await Assert.ThrowsAsync<ArgumentException>(() => service.ConfirmPairingAsync("", "1234"));
        await Assert.ThrowsAsync<ArgumentException>(() => service.ConfirmPairingAsync("   ", "1234"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("12")]
    [InlineData("123")]
    [InlineData("12345")]
    [InlineData("abcd")]
    [InlineData("12a4")]
    public async Task ConfirmPairing_InvalidPin_ThrowsArgumentException(string invalidPin)
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.OK));

        await Assert.ThrowsAsync<ArgumentException>(() => service.ConfirmPairingAsync("pair-1", invalidPin));
    }

    [Fact]
    public async Task ConfirmPairing_Success_ReturnsTrue()
    {
        var json = """{"status": true}""";

        var service = CreateService(req =>
        {
            Assert.Equal(HttpMethod.Post, req.Method);
            Assert.Contains("api/pin", req.RequestUri?.ToString() ?? "");
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        });

        var success = await service.ConfirmPairingAsync("pair-001", "4567", "My Moonlight");
        Assert.True(success);
    }

    [Fact]
    public async Task ConfirmPairing_Rejected_ReturnsFalse()
    {
        var json = """{"status": false}""";

        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });

        var success = await service.ConfirmPairingAsync("pair-001", "4567");
        Assert.False(success);
    }

    [Fact]
    public async Task ConfirmPairing_NotFoundOrExpired_ThrowsSunshineException()
    {
        var service = CreateService(req => new HttpResponseMessage(HttpStatusCode.NotFound));

        var ex = await Assert.ThrowsAsync<SunshineException>(() => service.ConfirmPairingAsync("pair-expired", "1234"));
        Assert.Equal("NOT_FOUND", ex.ErrorCode);
    }

    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public MockHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }

    private class MockHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;
        public MockHttpClientFactory(HttpClient client) => _client = client;
        public HttpClient CreateClient(string name) => _client;
    }
}

