using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NetClient.Service.Services;
using NetClient.Shared.Models;
using Xunit;

namespace NetClient.Tests;

public class CommandServiceTests
{
    private readonly CommandService _commandService;
    private readonly SessionService _sessionService;

    public CommandServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Client:MachineId", "PC-TEST-02" }
            })
            .Build();

        _sessionService = new SessionService(NullLogger<SessionService>.Instance, config);
        var ipcServer = new IpcServerService(NullLogger<IpcServerService>.Instance, _sessionService);
        _commandService = new CommandService(NullLogger<CommandService>.Instance, _sessionService, ipcServer);
    }

    [Fact]
    public async Task UnknownCommand_ShouldBeRejected()
    {
        var result = await _commandService.ExecuteCommandAsync(new CommandPayload
        {
            Command = "FORMAT_C_DRIVE"
        });

        Assert.False(result.Success);
        Assert.Contains("not recognized or not allowed", result.Error ?? "", StringComparison.OrdinalIgnoreCase);
    }


    [Fact]
    public async Task LoginCommand_ShouldSucceedAndActivateSession()
    {
        var result = await _commandService.ExecuteCommandAsync(new CommandPayload
        {
            Command = "LOGIN",
            Username = "gamer123"
        });

        Assert.True(result.Success);
        Assert.Equal("PC-TEST-02", result.MachineId);
        Assert.Equal(MachineStatus.IN_USE, _sessionService.CurrentStatus);
        Assert.Equal("gamer123", _sessionService.CurrentUser);
    }

    [Fact]
    public async Task LoginCommand_WithEmptyUser_ShouldFail()
    {
        var result = await _commandService.ExecuteCommandAsync(new CommandPayload
        {
            Command = "LOGIN",
            Username = ""
        });

        Assert.False(result.Success);
    }

    [Fact]
    public async Task LogoutCommand_ShouldResetToOnline()
    {
        await _commandService.ExecuteCommandAsync(new CommandPayload
        {
            Command = "LOGIN",
            Username = "gamer123"
        });

        var result = await _commandService.ExecuteCommandAsync(new CommandPayload
        {
            Command = "LOGOUT"
        });

        Assert.True(result.Success);
        Assert.Equal(MachineStatus.ONLINE, _sessionService.CurrentStatus);
        Assert.Null(_sessionService.CurrentUser);
    }

    [Fact]
    public async Task GetStatus_ShouldReturnStatus()
    {
        var result = await _commandService.ExecuteCommandAsync(new CommandPayload
        {
            Command = "GET_STATUS"
        });

        Assert.True(result.Success);
        Assert.Contains("Status: ONLINE", result.Error ?? "");
    }
}
