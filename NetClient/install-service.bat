@echo off
chcp 65001 > nul
setlocal

echo ===================================================
echo     KHOI DONG NETCLIENT (SERVICE + UI OVERLAY)
echo ===================================================
echo.

:: 1. Kiem tra / Cau hinh tai khoan Sunshine truoc
echo [1/3] Dang kiem tra Sunshine credentials...

dotnet run --project "%~dp0NetClient.Service\NetClient.Service.csproj" -- --configure-sunshine-if-missing

if errorlevel 1 (
    echo.
    echo [ERROR] Cau hinh Sunshine credentials that bai hoac bi huy!
    echo [INFO] Khong the khoi dong NetClient.
    echo.
    pause
    exit /b 1
)

echo [OK] Sunshine credentials da san sang.
echo.

:: 2. Khoi dong NetClient.Service chay nen
echo [2/3] Dang khoi dong NetClient.Service chay nen...

start "NetClient Service" dotnet run --project "%~dp0NetClient.Service\NetClient.Service.csproj"

timeout /t 3 /nobreak > nul

:: 3. Khoi dong NetClient.UI (LockOverlay)
echo [3/3] Dang khoi dong NetClient.UI (LockOverlay)...

start "NetClient UI" dotnet run --project "%~dp0NetClient.UI\NetClient.UI.csproj"

echo.
echo [OK] Da hoan tat cau hinh va khoi dong ca hai tien trinh!
echo.

endlocal