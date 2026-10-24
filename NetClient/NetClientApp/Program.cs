using NetClient.App.Services;
using NetClient.App.Forms;
namespace NetClientApp
{
    internal static class Program
    {
        /// <summary>
        ///  The main entry point for the application.
        /// </summary>
        private static Mutex? _singleInstanceMutex;

        [STAThread]
        static void Main()
        {
            var ipcClient = new IpcClientService();
            const string mutexName = "Global\\NetClient_App_SingleInstance_Mutex";
            _singleInstanceMutex = new Mutex(true, mutexName, out bool createdNew);

            if (!createdNew)
            {
                // Already running
                return;
            }

            // To customize application configuration such as set high DPI settings or default font,
            // see https://aka.ms/applicationconfiguration.
            ApplicationConfiguration.Initialize();
            var mainScreen = new MainScreen(ipcClient);
            
            ipcClient.Start();
            Application.Run(mainScreen);

            ipcClient.Stop();
            _singleInstanceMutex.ReleaseMutex();
            _singleInstanceMutex.Dispose();
        }
    }
}