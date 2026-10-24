@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ===================================================
echo     GO BO NETCLIENT APP VA XOA ICON DESKTOP
echo ===================================================
echo.

echo [1/3] Dang tat tien trinh NetClient.App.exe neu dang chay...
taskkill /F /IM NetClient.App.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo [OK] Da tat tien trinh.
echo.

echo [2/3] Dang xoa dang ky tu khoi dong cung Windows (Startup)...
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "NetClientApp" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "NetClientApp" /f >nul 2>&1
echo [OK] Da go bo dang ky Startup.
echo.

echo [3/3] Dang xoa icon Shortcut ngoai Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$userDesktop = $ws.SpecialFolders.Item('Desktop'); " ^
    "if ($userDesktop) { " ^
    "    $path = Join-Path $userDesktop 'NetClient App.lnk'; " ^
    "    if (Test-Path $path) { Remove-Item $path -Force; Write-Host ('[OK] Da xoa: ' + $path); } " ^
    "} " ^
    "$allDesktop = $ws.SpecialFolders.Item('AllUsersDesktop'); " ^
    "if ($allDesktop) { " ^
    "    $pathAll = Join-Path $allDesktop 'NetClient App.lnk'; " ^
    "    if (Test-Path $pathAll) { Remove-Item $pathAll -Force; Write-Host ('[OK] Da xoa: ' + $pathAll); } " ^
    "}"
echo [OK] Da don dep Shortcut.
echo.

echo ===================================================
echo [OK] Da go bo NetClientApp va icon Desktop thanh cong!
echo ===================================================
pause

endlocal
