@echo off
chcp 65001 > nul
echo ===================================================
echo     KHỞI ĐỘNG NETCLIENT (SERVICE + UI OVERLAY)
echo ===================================================

echo 1. Khởi động NetClient.Service chạy nền...
start "NetClient Service" dotnet run --project "%~dp0NetClient.Service\NetClient.Service.csproj"

timeout /t 2 /nobreak > nul

echo 2. Khởi động NetClient.UI (LockOverlay)...
start "NetClient UI" dotnet run --project "%~dp0NetClient.UI\NetClient.UI.csproj"

echo Đã khởi động cả hai tiến trình!

