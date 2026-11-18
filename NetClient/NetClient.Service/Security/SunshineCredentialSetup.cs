using NetClient.Service.Services;

namespace NetClient.Service.Security;

public class SunshineCredentialSetup
{
    private readonly SunshineCredentialStore _store;

    public SunshineCredentialSetup(
        SunshineCredentialStore store)
    {
        _store = store;
    }

    public void Configure(string username, string password)
    {
        _store.Save(username, password);
    }

    public bool IsConfigured()
    {
        return _store.Exists();
    }
}