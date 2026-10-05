using System.Text.Json.Serialization;

namespace NetClient.Shared.Models;

public class PerformanceData
{
    [JsonPropertyName("cpuUsage")]
    public double CpuUsage { get; set; }

    [JsonPropertyName("ramUsage")]
    public double RamUsage { get; set; }

    [JsonPropertyName("ramUsedGb")]
    public double RamUsedGb { get; set; }

    [JsonPropertyName("ramTotalGb")]
    public double RamTotalGb { get; set; }

    [JsonPropertyName("gpuUsage")]
    public double? GpuUsage { get; set; }

    [JsonPropertyName("gpuMemoryUsageMb")]
    public double? GpuMemoryUsageMb { get; set; }

    [JsonPropertyName("gpuTemperature")]
    public double? GpuTemperature { get; set; }

    [JsonPropertyName("diskUsage")]
    public double? DiskUsage { get; set; }

    [JsonPropertyName("networkSentBytes")]
    public long? NetworkSentBytes { get; set; }

    [JsonPropertyName("networkReceivedBytes")]
    public long? NetworkReceivedBytes { get; set; }
}

