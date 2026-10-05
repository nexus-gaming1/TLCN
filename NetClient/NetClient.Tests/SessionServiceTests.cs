using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NetClient.Service.Services;
using NetClient.Shared.Models;
using Xunit;

namespace NetClient.Tests;

public class SessionServiceTests
{
    private readonly SessionService _sessionService;

    public SessionServiceTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Client:MachineId", "PC-TEST-01" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _sessionService = new SessionService(NullLogger<SessionService>.Instance, configuration);
    }

    [Fact]
    public void InitialStatus_ShouldBeOnline()
    {
        Assert.Equal(MachineStatus.ONLINE, _sessionService.CurrentStatus);
        Assert.Null(_sessionService.CurrentUser);
        Assert.Equal("PC-TEST-01", _sessionService.MachineId);
    }

    [Fact]
    public void Login_WithValidUser_ShouldSetInUseAndTriggerEvents()
    {
        bool eventFired = false;
        _sessionService.UserLoggedIn += u => eventFired = (u == "vinh");

        bool result = _sessionService.Login("vinh");

        Assert.True(result);
        Assert.Equal(MachineStatus.IN_USE, _sessionService.CurrentStatus);
        Assert.Equal("vinh", _sessionService.CurrentUser);
        Assert.True(eventFired);
    }

    [Fact]
    public void Logout_ShouldReturnToOnline()
    {
        _sessionService.Login("vinh");
        Assert.Equal(MachineStatus.IN_USE, _sessionService.CurrentStatus);

        bool loggedOutFired = false;
        _sessionService.UserLoggedOut += () => loggedOutFired = true;

        _sessionService.Logout();

        Assert.Equal(MachineStatus.ONLINE, _sessionService.CurrentStatus);
        Assert.Null(_sessionService.CurrentUser);
        Assert.True(loggedOutFired);
    }

    [Fact]
    public void SetStatus_ShouldUpdateStatusProperly()
    {
        _sessionService.SetStatus(MachineStatus.LOCKED);
        Assert.Equal(MachineStatus.LOCKED, _sessionService.CurrentStatus);
    }

    [Fact]
    public void GetMachineInfo_ShouldReturnCompleteData()
    {
        var info = _sessionService.GetMachineInfo();

        Assert.Equal("PC-TEST-01", info.MachineId);
        Assert.False(string.IsNullOrWhiteSpace(info.Hostname));
        Assert.False(string.IsNullOrWhiteSpace(info.LocalIp));
        Assert.Equal("ONLINE", info.Status);
    }
}

