@echo off
chcp 65001 > nul
setlocal

echo ===================================================
echo     KHỞI ĐỘNG NETCLIENT (SERVICE + UI OVERLAY)
echo ===================================================
echo.

:: 1. Kiểm tra / Cấu hình tài khoản Sunshine trước
echo [1/3] Đang kiểm tra cấu hình Sunshine credentials...
dotnet run --project "%~dp0NetClient.Service\NetClient.Service.csproj" -- --configure-sunshine-if-missing

if errorlevel 1 (
    echo.
    echo [ERROR] Cấu hình Sunshine credentials thất bại hoặc bị hủy!
    echo [INFO] Không thể khởi động NetClient.
    echo.
    pause
    exit /b 1
)

echo [OK] Sunshine credentials đã sẵn sàng.
echo.

:: 2. Khởi động NetClient.Service chạy nền
echo [2/3] Khởi động NetClient.Service chạy nền...
start "NetClient Service" dotnet run --project "%~dp0NetClient.Service\NetClient.Service.csproj"

timeout /t 3 /nobreak > nul

:: 3. Khởi động NetClient.UI (LockOverlay)
echo [3/3] Khởi động NetClient.UI (LockOverlay)...
start "NetClient UI" dotnet run --project "%~dp0NetClient.UI\NetClient.UI.csproj"

echo.
echo [OK] Đã hoàn tất cấu hình và khởi động cả hai tiến trình!
