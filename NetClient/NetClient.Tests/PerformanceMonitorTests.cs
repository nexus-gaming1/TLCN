using Microsoft.Extensions.Logging.Abstractions;
using NetClient.Service.Services;
using Xunit;

namespace NetClient.Tests;

public class PerformanceMonitorTests
{
    private readonly PerformanceMonitor _monitor;

    public PerformanceMonitorTests()
    {
        _monitor = new PerformanceMonitor(NullLogger<PerformanceMonitor>.Instance);
    }

    [Fact]
    public void Collect_ShouldNotThrowAndReturnValidMetrics()
    {
        // First sample
        var data1 = _monitor.Collect();
        Assert.NotNull(data1);

        // Small pause to let CPU deltas accumulate
        Thread.Sleep(200);

        // Second sample
        var data2 = _monitor.Collect();
        Assert.NotNull(data2);

        // CPU should be in 0..100 range
        Assert.InRange(data2.CpuUsage, 0.0, 100.0);

        // RAM total should be positive (> 0 GB)
        Assert.True(data2.RamTotalGb > 0);
        Assert.True(data2.RamUsedGb >= 0);
        Assert.InRange(data2.RamUsage, 0.0, 100.0);

        // Disk usage if available should be in 0..100
        if (data2.DiskUsage.HasValue)
        {
            Assert.InRange(data2.DiskUsage.Value, 0.0, 100.0);
        }

        // Nullable GPU values should not crash
        // data2.GpuUsage can be null
    }
}

