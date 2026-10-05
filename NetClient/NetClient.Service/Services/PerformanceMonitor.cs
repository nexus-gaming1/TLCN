using System.Diagnostics;
using System.IO;
using System.Management;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;
using NetClient.Shared.Models;

namespace NetClient.Service.Services;

public class PerformanceMonitor
{
    private readonly ILogger<PerformanceMonitor> _logger;
    private ulong _prevIdleTime;
    private ulong _prevKernelTime;
    private ulong _prevUserTime;
    private bool _isCpuInitialized;

    public PerformanceMonitor(ILogger<PerformanceMonitor> logger)
    {
        _logger = logger;
        InitializeCpu();
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetSystemTimes(
        out System.Runtime.InteropServices.ComTypes.FILETIME lpIdleTime,
        out System.Runtime.InteropServices.ComTypes.FILETIME lpKernelTime,
        out System.Runtime.InteropServices.ComTypes.FILETIME lpUserTime);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private class MEMORYSTATUSEX
    {
        public uint dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalMemoryStatusEx([In, Out] MEMORYSTATUSEX lpBuffer);

    private static ulong FileTimeToUInt64(System.Runtime.InteropServices.ComTypes.FILETIME ft)
    {
        return ((ulong)ft.dwHighDateTime << 32) | (uint)ft.dwLowDateTime;
    }

    private void InitializeCpu()
    {
        try
        {
            if (GetSystemTimes(out var idle, out var kernel, out var user))
            {
                _prevIdleTime = FileTimeToUInt64(idle);
                _prevKernelTime = FileTimeToUInt64(kernel);
                _prevUserTime = FileTimeToUInt64(user);
                _isCpuInitialized = true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize CPU counters");
        }
    }

    public PerformanceData Collect()
    {
        var data = new PerformanceData();

        // 1. CPU Usage
        try
        {
            data.CpuUsage = GetCpuUsage();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error reading CPU usage");
            data.CpuUsage = 0;
        }

        // 2. RAM Usage
        try
        {
            var mem = new MEMORYSTATUSEX();
            if (GlobalMemoryStatusEx(mem))
            {
                double totalGb = Math.Round((double)mem.ullTotalPhys / (1024 * 1024 * 1024), 2);
                double availGb = Math.Round((double)mem.ullAvailPhys / (1024 * 1024 * 1024), 2);
                double usedGb = Math.Max(0, Math.Round(totalGb - availGb, 2));

                data.RamTotalGb = totalGb;
                data.RamUsedGb = usedGb;
                data.RamUsage = mem.dwMemoryLoad;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error reading RAM usage");
        }

        // 3. GPU (Nullable - fallback gracefully)
        try
        {
            data.GpuUsage = null;
            data.GpuTemperature = null;
            data.GpuMemoryUsageMb = null;

            // Attempt basic WMI check for video controller if needed
            // Drivers like NVIDIA usually expose sensor data via NvAPI or third-party drivers.
            // When not exposed directly via standard WMI, return null per specification.
        }
        catch
        {
            // Nullable metrics do not throw
        }

        // 4. Disk Usage
        try
        {
            var drive = DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady && d.RootDirectory.FullName.StartsWith("C", StringComparison.OrdinalIgnoreCase))
                        ?? DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady);
            if (drive != null && drive.TotalSize > 0)
            {
                var used = drive.TotalSize - drive.AvailableFreeSpace;
                data.DiskUsage = Math.Round((double)used * 100.0 / drive.TotalSize, 1);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error reading Disk usage");
        }

        // 5. Network Sent / Received
        try
        {
            long sent = 0;
            long recv = 0;
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus == OperationalStatus.Up && ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                {
                    var stats = ni.GetIPv4Statistics();
                    sent += stats.BytesSent;
                    recv += stats.BytesReceived;
                }
            }
            data.NetworkSentBytes = sent;
            data.NetworkReceivedBytes = recv;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error reading Network stats");
        }

        return data;
    }

    private double GetCpuUsage()
    {
        if (!GetSystemTimes(out var idle, out var kernel, out var user))
        {
            return 0.0;
        }

        ulong currentIdle = FileTimeToUInt64(idle);
        ulong currentKernel = FileTimeToUInt64(kernel);
        ulong currentUser = FileTimeToUInt64(user);

        if (!_isCpuInitialized)
        {
            _prevIdleTime = currentIdle;
            _prevKernelTime = currentKernel;
            _prevUserTime = currentUser;
            _isCpuInitialized = true;
            return 0.0;
        }

        ulong usrDiff = currentUser - _prevUserTime;
        ulong kerDiff = currentKernel - _prevKernelTime;
        ulong idlDiff = currentIdle - _prevIdleTime;

        _prevIdleTime = currentIdle;
        _prevKernelTime = currentKernel;
        _prevUserTime = currentUser;

        ulong sysDiff = kerDiff + usrDiff;
        if (sysDiff == 0) return 0.0;

        double cpuPercent = (double)(sysDiff - idlDiff) * 100.0 / sysDiff;
        if (cpuPercent < 0) cpuPercent = 0;
        if (cpuPercent > 100) cpuPercent = 100;

        return Math.Round(cpuPercent, 1);
    }
}

