using System;
using System.Threading;
using System.Threading.Tasks;
using NexusControl.Models;

namespace NexusControl.Services
{
    public class AuthService
    {
        private static readonly Lazy<AuthService> _lazy = new(() => new AuthService());
        public static AuthService Instance => _lazy.Value;

        private readonly ApiClient _apiClient;
        private readonly UserSessionService _sessionService;

        public AuthService(ApiClient? apiClient = null, UserSessionService? sessionService = null)
        {
            _apiClient = apiClient ?? ApiClient.Instance;
            _sessionService = sessionService ?? UserSessionService.Current;
        }

        public async Task<ApiResponse<LoginResponseData>> LoginAsync(
            string username,
            string password,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return ApiResponse<LoginResponseData>.Error("Vui lòng nhập tên đăng nhập.");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                return ApiResponse<LoginResponseData>.Error("Vui lòng nhập mật khẩu.");
            }

            var request = new LoginRequest
            {
                Username = username.Trim(),
                Password = password
            };

            var response = await _apiClient.PostAsync<LoginResponseData>("/auth/control-login", request, cancellationToken);

            if (response.IsSuccess && response.Data?.User != null && !string.IsNullOrWhiteSpace(response.Data.Token))
            {
                _sessionService.SetSession(response.Data.Token, response.Data.User);
            }

            return response;
        }

        public async Task<ApiResponse<UserDto>> GetCurrentUserProfileAsync(CancellationToken cancellationToken = default)
        {
            if (!UserSessionService.IsLoggedIn)
            {
                return ApiResponse<UserDto>.Error("Chưa đăng nhập hoặc phiên làm việc đã kết thúc.");
            }

            var response = await _apiClient.GetAsync<UserProfileResponseData>("/auth/me", cancellationToken);

            if (response.IsSuccess && response.Data?.User != null)
            {
                _sessionService.UpdateUser(response.Data.User);
                return ApiResponse<UserDto>.Success(response.Data.User, response.Message);
            }

            return ApiResponse<UserDto>.Error(response.Message ?? "Không thể lấy thông tin người dùng từ máy chủ.");
        }

        public void Logout()
        {
            _sessionService.ClearSession();
        }
    }
}
