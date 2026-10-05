using NetClient.UI.Forms;
using NetClient.UI.Services;

namespace NetClient.UI;

internal static class Program
{
    private static Mutex? _singleInstanceMutex;

    [STAThread]
    static void Main()
    {
        const string mutexName = "Global\\NetClient_UI_SingleInstance_Mutex";
        _singleInstanceMutex = new Mutex(true, mutexName, out bool createdNew);

        if (!createdNew)
        {
            // Already running
            return;
        }

        ApplicationConfiguration.Initialize();

        var overlay = new LockOverlay();
        var ipcClient = new IpcClientService();

        // Wire IPC callbacks directly to LockOverlay API
        ipcClient.OnShowOverlay += () => overlay.ShowOverlay();
        ipcClient.OnHideOverlay += () => overlay.HideOverlay();
        ipcClient.OnSetUsername += user => overlay.SetUsername(user);
        ipcClient.OnSetStatus += (status, machineId) => overlay.SetStatus(status, machineId);
        ipcClient.OnShowNotification += (msg, title) => overlay.ShowNotification(msg, title);

        // Wire fake login from LockOverlay to IPC Service
        overlay.OnLoginRequested += async username =>
        {
            try
            {
                await ipcClient.SendLoginAsync(username);
            }
            catch { }
        };

        // Start background IPC client loop
        ipcClient.Start();

        // Show lock screen initially
        overlay.ShowOverlay();

        Application.Run(overlay);

        ipcClient.Stop();
        _singleInstanceMutex?.ReleaseMutex();
        _singleInstanceMutex?.Dispose();
    }
}