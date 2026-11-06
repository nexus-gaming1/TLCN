using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NexusControl.Models;

namespace NexusControl.Services
{
    public class ComputerApiService
    {
        private readonly ApiClient _apiClient;

        public ComputerApiService(ApiClient? apiClient = null)
        {
            _apiClient = apiClient ?? ApiClient.Instance;
        }

        public Task<ApiResponse<List<ComputerOverviewDto>>> GetOverviewAsync(
            CancellationToken cancellationToken = default)
        {
            return _apiClient.GetAsync<List<ComputerOverviewDto>>(
                "/computers/overview",
                cancellationToken);
        }

        public Task<ApiResponse<object>> SendCommandAsync(
            string ipAddress,
            string? macAddress,
            string command,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.PostAsync<object>(
                "/computers/by-address/command",
                new { ipAddress, macAddress, command },
                cancellationToken);
        }

        public Task<ApiResponse<object>> LogoutAsync(
            string ipAddress,
            string? macAddress,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.PostAsync<object>(
                "/computers/by-address/logout",
                new { ipAddress, macAddress },
                cancellationToken);
        }

        public Task<ApiResponse<object>> TopUpAsync(
            int memberId,
            decimal amount,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.PostAsync<object>(
                "/transactions/topup",
                new { member_id = memberId, amount },
                cancellationToken);
        }

        public Task<ApiResponse<object>> WithdrawAsync(
            int memberId,
            decimal amount,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.PostAsync<object>(
                "/transactions/withdraw",
                new { member_id = memberId, amount },
                cancellationToken);
        }

        public Task<ApiResponse<MemberBalanceDto>> GetMemberBalanceAsync(
            int memberId,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.GetAsync<MemberBalanceDto>(
                $"/members/{memberId}",
                cancellationToken);
        }

        public Task<ApiResponse<object>> AddFreeBalanceAsync(
            int memberId,
            decimal amount,
            string? description = null,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.PostAsync<object>(
                "/transactions/bonus-topup",
                new { member_id = memberId, amount, description },
                cancellationToken);
        }

        public Task<ApiResponse<object>> DeductFreeBalanceAsync(
            int memberId,
            decimal amount,
            string? description = null,
            CancellationToken cancellationToken = default)
        {
            return _apiClient.PostAsync<object>(
                "/transactions/bonus-withdraw",
                new { member_id = memberId, amount, description },
                cancellationToken);
        }
    }
}
