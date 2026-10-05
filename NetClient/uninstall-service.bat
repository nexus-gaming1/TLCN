@echo off
chcp 65001 > nul
echo ===================================================
echo     GỠ BỎ NETCLIENT (SERVICE + UI LOCKOVERLAY)
echo ===================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Vui lòng bấm chuột phải và chọn "Run as administrator"!
    pause
    exit /b 1
)

set SERVICE_NAME=NetClientService

echo 1. Đang đóng tiến trình giao diện NetClient.UI...
taskkill /F /IM NetClient.UI.exe >nul 2>&1

echo 2. Đang dừng Windows Service...
sc.exe stop %SERVICE_NAME% >nul 2>&1
timeout /t 1 /nobreak > nul

echo 3. Đang xóa Windows Service...
sc.exe delete %SERVICE_NAME% >nul 2>&1

echo 4. Đang xóa đăng ký khởi động cùng Windows (Startup Registry)...
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "NetClientUI" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "NetClientUI" /f >nul 2>&1

echo.
echo ===================================================
echo [OK] Đã gỡ bỏ toàn bộ NetClient Service & UI thành công!
echo ===================================================
pause


