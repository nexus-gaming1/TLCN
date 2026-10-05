using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NetClient.Service.Services;

namespace NetClient.Service;

public class Program
{
    public static async Task Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.WriteLine("==================================================");
        Console.WriteLine("          NETCLIENT BACKGROUND SERVICE           ");
        Console.WriteLine("==================================================");

        var host = Host.CreateDefaultBuilder(args)
            .UseWindowsService(options =>
            {
                options.ServiceName = "NetClientService";
            })
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                var env = hostingContext.HostingEnvironment;
                config.SetBasePath(AppContext.BaseDirectory);
                config.AddJsonFile("Configuration/appsettings.json", optional: false, reloadOnChange: true);
                config.AddJsonFile($"Configuration/appsettings.{env.EnvironmentName}.json", optional: true, reloadOnChange: true);
                config.AddEnvironmentVariables();
            })
            .ConfigureLogging((context, logging) =>
            {
                logging.ClearProviders();
                logging.AddConfiguration(context.Configuration.GetSection("Logging"));
                logging.AddConsole();
                logging.AddDebug();
            })
            .ConfigureServices((hostContext, services) =>
            {
                // Core Domain Services
                services.AddSingleton<SessionService>();
                services.AddSingleton<PerformanceMonitor>();
                services.AddSingleton<CommandService>();

                // IPC Server (hosts named pipe for UI)
                services.AddSingleton<IpcServerService>();
                services.AddHostedService(sp => sp.GetRequiredService<IpcServerService>());

                // Socket.IO Service (communicates with Node.js backend)
                services.AddHostedService<SocketService>();
            })
            .Build();

        await host.RunAsync();
    }
}

