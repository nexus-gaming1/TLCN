using System;
using NexusControl.Models;

namespace NexusControl.Services
{
    public class UserSessionService
    {
        private static readonly Lazy<UserSessionService> _lazy = new(() => new UserSessionService());
        private static readonly object _lock = new();

        private UserDto? _currentUser;
        private string? _accessToken;
        private string? _refreshToken;

        public static UserSessionService Current => _lazy.Value;

        #region Static Convenience Accessors
        public static bool IsLoggedIn => Current.IsActive;
        public static UserDto? CurrentUser => Current.User;
        public static string? AccessToken => Current.Token;
        public static int? CurrentUserId => Current.UserId;
        public static string? CurrentUsername => Current.Username;
        public static string? CurrentFullName => Current.FullName;
        public static string? CurrentRole => Current.Role;
        #endregion

        #region Instance Properties
        public event EventHandler<UserDto?>? UserChanged;

        public bool IsActive
        {
            get
            {
                lock (_lock)
                {
                    return _currentUser != null && !string.IsNullOrWhiteSpace(_accessToken);
                }
            }
        }

        public UserDto? User
        {
            get
            {
                lock (_lock)
                {
                    return _currentUser;
                }
            }
        }

        public string? Token
        {
            get
            {
                lock (_lock)
                {
                    return _accessToken;
                }
            }
        }

        public string? RefreshToken
        {
            get
            {
                lock (_lock)
                {
                    return _refreshToken;
                }
            }
        }

        public int? UserId => User?.UserId;
        public string? Username => User?.Username;
        public string? FullName => User?.FullName;
        public string? Role => User?.Role;
        #endregion

        #region Session Management Methods
        public void SetSession(string accessToken, UserDto user, string? refreshToken = null)
        {
            ArgumentNullException.ThrowIfNull(user);
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                throw new ArgumentException("Access token không được để trống.", nameof(accessToken));
            }

            lock (_lock)
            {
                _accessToken = accessToken;
                _refreshToken = refreshToken;
                _currentUser = user;
            }

            UserChanged?.Invoke(this, user);
        }

        public void UpdateUser(UserDto user)
        {
            ArgumentNullException.ThrowIfNull(user);

            lock (_lock)
            {
                _currentUser = user;
            }

            UserChanged?.Invoke(this, user);
        }

        public void ClearSession()
        {
            lock (_lock)
            {
                _accessToken = null;
                _refreshToken = null;
                _currentUser = null;
            }

            UserChanged?.Invoke(this, null);
        }
        #endregion
    }
}
