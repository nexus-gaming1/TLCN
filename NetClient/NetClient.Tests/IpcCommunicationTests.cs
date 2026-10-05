using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NetClient.Service.Services;
using NetClient.UI.Services;
using Xunit;

namespace NetClient.Tests;

public class IpcCommunicationTests
{
    [Fact]
    public async Task ServiceAndUi_ShouldCommunicateViaIpc()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Client:MachineId", "PC-IPC-TEST" }
            })
            .Build();

        var sessionService = new SessionService(NullLogger<SessionService>.Instance, config);
        var ipcServer = new IpcServerService(NullLogger<IpcServerService>.Instance, sessionService);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        // Start server in background
        var serverTask = Task.Run(() => ipcServer.StartAsync(cts.Token));

        var ipcClient = new IpcClientService();

        var connectedTcs = new TaskCompletionSource<bool>();
        var userSetTcs = new TaskCompletionSource<string>();
        var hideOverlayTcs = new TaskCompletionSource<bool>();
        var notificationTcs = new TaskCompletionSource<string>();

        ipcClient.OnConnected += () => connectedTcs.TrySetResult(true);
        ipcClient.OnSetUsername += u => userSetTcs.TrySetResult(u);
        ipcClient.OnHideOverlay += () => hideOverlayTcs.TrySetResult(true);
        ipcClient.OnShowNotification += (msg, _) => notificationTcs.TrySetResult(msg);

        ipcClient.Start();

        // 1. Wait for IPC connection
        var connected = await Task.WhenAny(connectedTcs.Task, Task.Delay(4000, cts.Token)) == connectedTcs.Task;
        Assert.True(connected, "IPC client should connect to IPC server");

        // 2. Test SetUsername
        await ipcServer.SetUsernameAsync("gamer_pro", cts.Token);
        var user = await Task.WhenAny(userSetTcs.Task, Task.Delay(2000, cts.Token)) == userSetTcs.Task
            ? await userSetTcs.Task
            : null;
        Assert.Equal("gamer_pro", user);

        // 3. Test HideOverlay
        await ipcServer.HideOverlayAsync(cts.Token);
        var hideOverlay = await Task.WhenAny(hideOverlayTcs.Task, Task.Delay(2000, cts.Token)) == hideOverlayTcs.Task;
        Assert.True(hideOverlay, "HideOverlay event should be received by UI client");

        // 4. Test ShowNotification
        await ipcServer.ShowNotificationAsync("Test Notification", "Title", cts.Token);
        var notifMsg = await Task.WhenAny(notificationTcs.Task, Task.Delay(2000, cts.Token)) == notificationTcs.Task
            ? await notificationTcs.Task
            : null;
        Assert.Equal("Test Notification", notifMsg);

        // 5. Test ClientLogin from UI to Server
        await ipcClient.SendLoginAsync("player999", cts.Token);
        await Task.Delay(500, cts.Token);
        Assert.Equal("player999", sessionService.CurrentUser);
        Assert.Equal(NetClient.Shared.Models.MachineStatus.IN_USE, sessionService.CurrentStatus);

        // Cleanup
        ipcClient.Stop();
        cts.Cancel();
        try { await serverTask; } catch { }
    }
}

