
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NetClient.Service.Services;
using System.Text;

namespace NetClient.Service;

public class Program
{
    public static async Task Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;

        // Handle Sunshine credential configuration
        if (args.Contains("--configure-sunshine-if-missing",
                StringComparer.OrdinalIgnoreCase))
        {
            ConfigureSunshineCredentials(force: false);
            return;
        }

        if (args.Contains("--configure-sunshine",
                StringComparer.OrdinalIgnoreCase))
        {
            ConfigureSunshineCredentials(force: true);
            return;
        }

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
                config.AddJsonFile(
                    "Configuration/appsettings.json",
                    optional: false,
                    reloadOnChange: true);

                config.AddJsonFile(
                    $"Configuration/appsettings.{env.EnvironmentName}.json",
                    optional: true,
                    reloadOnChange: true);

                config.AddEnvironmentVariables();
            })
            .ConfigureLogging((context, logging) =>
            {
                logging.ClearProviders();
                logging.AddConfiguration(
                    context.Configuration.GetSection("Logging"));
                logging.AddConsole();
                logging.AddDebug();
            })
            .ConfigureServices((hostContext, services) =>
            {
                // Core Domain Services
                services.AddSingleton<SessionService>();
                services.AddSingleton<AuthApiService>();
                services.AddSingleton<PerformanceMonitor>();
                services.AddSingleton<CommandService>();

                // Sunshine credentials
                services.AddSingleton<SunshineCredentialStore>();

                services.AddHttpClient("Sunshine", client =>
                {
                    client.BaseAddress = new Uri("https://127.0.0.1:47990/");
                    client.Timeout = TimeSpan.FromSeconds(90);
                })
                .ConfigurePrimaryHttpMessageHandler(() =>
                    new HttpClientHandler
                    {
                        // Sunshine sử dụng certificate tự ký trên localhost.
                        ServerCertificateCustomValidationCallback =
                            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
                    });

                services.AddSingleton<SunshineService>();
                // IPC Server
                services.AddSingleton<IpcServerService>();
                services.AddHostedService(
                    sp => sp.GetRequiredService<IpcServerService>());

                // Socket.IO
                services.AddHostedService<SocketService>();
            })
            .Build();

        await host.RunAsync();
    }

    private static void ConfigureSunshineCredentials(bool force)
    {
        try
        {
            var store = new SunshineCredentialStore();

            Console.WriteLine();
            Console.WriteLine("==========================================");
            Console.WriteLine("     NEXUS SUNSHINE CONFIGURATION");
            Console.WriteLine("==========================================");
            Console.WriteLine();

            if (store.Exists() && !force)
            {
                Console.WriteLine(
                    "[OK] Sunshine credentials already configured.");

                return;
            }

            Console.Write("Sunshine Admin Username: ");
            var username = Console.ReadLine()?.Trim();

            if (string.IsNullOrWhiteSpace(username))
            {
                throw new InvalidOperationException(
                    "Username cannot be empty.");
            }

            Console.Write("Sunshine Admin Password: ");
            var password = ReadPassword();

            if (string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException(
                    "Password cannot be empty.");
            }

            store.Save(username, password);

            Console.WriteLine();
            Console.WriteLine();
            Console.WriteLine(
                "[OK] Sunshine credentials saved successfully.");
            Console.WriteLine(
                "[INFO] Credentials protected by Windows DPAPI.");

            password = string.Empty;
        }
        catch (Exception ex)
        {
            Console.WriteLine();
            Console.WriteLine($"[ERROR] {ex.Message}");

            Environment.ExitCode = 1;
        }
    }

    private static string ReadPassword()
    {
        var password = new StringBuilder();

        while (true)
        {
            var key = Console.ReadKey(intercept: true);

            if (key.Key == ConsoleKey.Enter)
                break;

            if (key.Key == ConsoleKey.Backspace)
            {
                if (password.Length > 0)
                    password.Length--;

                continue;
            }

            if (!char.IsControl(key.KeyChar))
                password.Append(key.KeyChar);
        }

        return password.ToString();
    }
}
