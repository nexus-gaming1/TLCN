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
    }
}
