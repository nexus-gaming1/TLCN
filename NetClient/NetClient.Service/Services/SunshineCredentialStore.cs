
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace NetClient.Service.Services;

public class SunshineCredentials
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SunshineCredentialStore
{
    private readonly string _directoryPath =
        Path.Combine(
            Environment.GetFolderPath(
                Environment.SpecialFolder.CommonApplicationData),
            "NEXUS"
        );

    private readonly string _filePath;

    public SunshineCredentialStore()
    {
        _filePath = Path.Combine(
            _directoryPath,
            "sunshine.dat"
        );
    }

    // Kiểm tra đã cấu hình credentials chưa
    public bool Exists()
    {
        return File.Exists(_filePath);
    }

    // Lưu credentials đã mã hóa
    public void Save(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username is required.");

        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password is required.");

        var credentials = new SunshineCredentials
        {
            Username = username,
            Password = password
        };

        var json = JsonSerializer.Serialize(credentials);
        var plaintext = Encoding.UTF8.GetBytes(json);

        var encrypted = ProtectedData.Protect(
            plaintext,
            null,
            DataProtectionScope.LocalMachine
        );

        Directory.CreateDirectory(_directoryPath);

        File.WriteAllBytes(_filePath, encrypted);

        // Xóa dữ liệu nhạy cảm khỏi buffer
        CryptographicOperations.ZeroMemory(plaintext);
    }

    // Đọc và giải mã credentials
    public SunshineCredentials Load()
    {
        if (!File.Exists(_filePath))
            throw new FileNotFoundException(
                "Sunshine credentials have not been configured."
            );

        var encrypted = File.ReadAllBytes(_filePath);

        var plaintext = ProtectedData.Unprotect(
            encrypted,
            null,
            DataProtectionScope.LocalMachine
        );

        try
        {
            var credentials =
                JsonSerializer.Deserialize<SunshineCredentials>(
                    plaintext
                );

            if (credentials == null ||
                string.IsNullOrWhiteSpace(credentials.Username) ||
                string.IsNullOrWhiteSpace(credentials.Password))
            {
                throw new InvalidDataException(
                    "Invalid Sunshine credentials."
                );
            }

            return credentials;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    // Xóa credentials khi cần cấu hình lại
    public void Delete()
    {
        if (File.Exists(_filePath))
            File.Delete(_filePath);
    }
}
