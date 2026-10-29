using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using NexusControl.Models;

namespace NexusControl.Services
{
    public class ApiClient
    {
        private static readonly Lazy<ApiClient> _lazy = new(() => new ApiClient());
        public static ApiClient Instance => _lazy.Value;

        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions;
        private string _baseUrl;

        public string BaseUrl
        {
            get => _baseUrl;
            set
            {
                if (string.IsNullOrWhiteSpace(value))
                    throw new ArgumentException("BaseUrl không được để trống.", nameof(value));

                _baseUrl = value.TrimEnd('/');
            }
        }

        public ApiClient(string? baseUrl = null, HttpClient? httpClient = null)
        {
            string defaultUrl = Environment.GetEnvironmentVariable("NEXUS_API_URL") ?? "http://localhost:3001/api";
            _baseUrl = (baseUrl ?? defaultUrl).TrimEnd('/');

            _httpClient = httpClient ?? new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(15)
            };

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        #region Public HTTP Request Methods
        public Task<ApiResponse<T>> GetAsync<T>(string endpoint, CancellationToken cancellationToken = default)
        {
            return SendRequestAsync<T>(HttpMethod.Get, endpoint, null, cancellationToken);
        }

        public Task<ApiResponse<T>> PostAsync<T>(string endpoint, object? data = null, CancellationToken cancellationToken = default)
        {
            return SendRequestAsync<T>(HttpMethod.Post, endpoint, data, cancellationToken);
        }

        public Task<ApiResponse<T>> PutAsync<T>(string endpoint, object? data = null, CancellationToken cancellationToken = default)
        {
            return SendRequestAsync<T>(HttpMethod.Put, endpoint, data, cancellationToken);
        }

        public Task<ApiResponse<T>> PatchAsync<T>(string endpoint, object? data = null, CancellationToken cancellationToken = default)
        {
            return SendRequestAsync<T>(HttpMethod.Patch, endpoint, data, cancellationToken);
        }

        public Task<ApiResponse<T>> DeleteAsync<T>(string endpoint, CancellationToken cancellationToken = default)
        {
            return SendRequestAsync<T>(HttpMethod.Delete, endpoint, null, cancellationToken);
        }
        #endregion

        #region Internal Request Execution
        private async Task<ApiResponse<T>> SendRequestAsync<T>(
            HttpMethod method,
            string endpoint,
            object? body,
            CancellationToken cancellationToken)
        {
            string fullUrl = BuildUrl(endpoint);

            try
            {
                using var request = new HttpRequestMessage(method, fullUrl);

                string? token = UserSessionService.AccessToken;
                if (!string.IsNullOrWhiteSpace(token))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                }

                if (body != null)
                {
                    string json = JsonSerializer.Serialize(body, _jsonOptions);
                    request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                }

                using var responseMessage = await _httpClient.SendAsync(request, cancellationToken);
                string responseContent = await responseMessage.Content.ReadAsStringAsync(cancellationToken);

                ApiResponse<T>? parsedResponse = null;

                if (!string.IsNullOrWhiteSpace(responseContent))
                {
                    try
                    {
                        parsedResponse = JsonSerializer.Deserialize<ApiResponse<T>>(responseContent, _jsonOptions);
                    }
                    catch
                    {
                        try
                        {
                            T? directObject = JsonSerializer.Deserialize<T>(responseContent, _jsonOptions);
                            parsedResponse = ApiResponse<T>.Success(directObject);
                        }
                        catch
                        {
                            parsedResponse = null;
                        }
                    }
                }

                if (responseMessage.IsSuccessStatusCode)
                {
                    return parsedResponse ?? ApiResponse<T>.Success(default, "Thao tác thành công.");
                }

                if (responseMessage.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    if (UserSessionService.IsLoggedIn)
                    {
                        UserSessionService.Current.ClearSession();
                    }
                }

                string errorMessage = parsedResponse?.Message
                    ?? $"Yêu cầu thất bại với mã trạng thái HTTP {(int)responseMessage.StatusCode} ({responseMessage.StatusCode}).";

                return ApiResponse<T>.Error(errorMessage, parsedResponse != null ? parsedResponse.Data : default);
            }
            catch (HttpRequestException ex)
            {
                return ApiResponse<T>.Error($"Không thể kết nối đến máy chủ backend ({BaseUrl}). Vui lòng kiểm tra lại dịch vụ backend. Chi tiết: {ex.Message}");
            }
            catch (TaskCanceledException)
            {
                return ApiResponse<T>.Error("Yêu cầu tới máy chủ backend bị quá thời gian chờ (Timeout).");
            }
            catch (Exception ex)
            {
                return ApiResponse<T>.Error($"Lỗi trong quá trình gửi yêu cầu API: {ex.Message}");
            }
        }

        private string BuildUrl(string endpoint)
        {
            if (endpoint.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                endpoint.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return endpoint;
            }

            string cleanEndpoint = endpoint.TrimStart('/');
            return $"{_baseUrl}/{cleanEndpoint}";
        }
        #endregion
    }
}
