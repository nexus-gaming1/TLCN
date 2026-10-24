@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ===================================================
echo     CAI DAT NETCLIENT APP VA TAO ICON DESKTOP
echo ===================================================
echo.

:: ===================================================
:: XAC DINH DUONG DAN DU AN
:: ===================================================
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%NetClientApp\NetClient.App.csproj" (
    set "BASE_DIR=%SCRIPT_DIR%"
) else if exist "%SCRIPT_DIR%NetClient\NetClientApp\NetClient.App.csproj" (
    set "BASE_DIR=%SCRIPT_DIR%NetClient\"
) else (
    set "BASE_DIR=%~dp0"
)

set "APP_PROJECT=%BASE_DIR%NetClientApp\NetClient.App.csproj"
set "PUBLISH_DIR=%BASE_DIR%publish\App"
set "APP_EXE=%PUBLISH_DIR%\NetClient.App.exe"

echo [THONG TIN] Duong dan project:
echo             %APP_PROJECT%
echo [THONG TIN] Thu muc cai dat:
echo             %PUBLISH_DIR%
echo.

:: ===================================================
:: DUNG TIEN TRINH CU (NEU DANG CHAY)
:: ===================================================
echo [1/5] Dang kiem tra va tat tien trinh NetClient.App.exe cu...
taskkill /F /IM NetClient.App.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo [OK] Da san sang cap nhat.
echo.

:: ===================================================
:: BUILD VA PUBLISH BAN RELEASE
:: ===================================================
echo [2/5] Dang build va publish NetClientApp (Release)...
if not exist "%APP_PROJECT%" (
    echo [ERROR] Khong tim thay file project: %APP_PROJECT%
    echo Vui long kiem tra lai cau truc thu muc!
    pause
    goto :END
)

dotnet publish "%APP_PROJECT%" -c Release -o "%PUBLISH_DIR%"
if errorlevel 1 (
    echo.
    echo [ERROR] dotnet publish NetClientApp that bai!
    echo Vui long kiem tra xem may da cai dat .NET SDK chua.
    pause
    goto :END
)

if not exist "%APP_EXE%" (
    echo.
    echo [ERROR] Khong tim thay file thuc thi sau khi publish:
    echo         %APP_EXE%
    pause
    goto :END
)

echo [OK] Build va Publish NetClientApp thanh cong.
echo.

:: ===================================================
:: TAO ICON SHORTCUT NGOAI DESKTOP
:: ===================================================
echo [3/5] Dang tao icon Shortcut ngoai Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$created = $false; " ^
    "try { " ^
    "    $userDesktop = $ws.SpecialFolders.Item('Desktop'); " ^
    "    if ($userDesktop) { " ^
    "        $scPath = Join-Path $userDesktop 'NetClient App.lnk'; " ^
    "        $sc = $ws.CreateShortcut($scPath); " ^
    "        $sc.TargetPath = '%APP_EXE%'; " ^
    "        $sc.WorkingDirectory = '%PUBLISH_DIR%'; " ^
    "        $sc.Description = 'NetClient App - Ung dung quan ly may tram phong net'; " ^
    "        $sc.Save(); " ^
    "        Write-Host ('[OK] Da tao icon Desktop nguoi dung: ' + $scPath); " ^
    "        $created = $true; " ^
    "    } " ^
    "} catch { Write-Host ('[!] Khong the tao shortcut user: ' + $_.Exception.Message); } " ^
    "try { " ^
    "    $allDesktop = $ws.SpecialFolders.Item('AllUsersDesktop'); " ^
    "    if ($allDesktop -and (Test-Path $allDesktop)) { " ^
    "        $scPathAll = Join-Path $allDesktop 'NetClient App.lnk'; " ^
    "        $scAll = $ws.CreateShortcut($scPathAll); " ^
    "        $scAll.TargetPath = '%APP_EXE%'; " ^
    "        $scAll.WorkingDirectory = '%PUBLISH_DIR%'; " ^
    "        $scAll.Description = 'NetClient App - Ung dung quan ly may tram phong net'; " ^
    "        $scAll.Save(); " ^
    "        Write-Host ('[OK] Da tao icon Desktop chung (All Users): ' + $scPathAll); " ^
    "    } " ^
    "} catch {} " ^
    "if (-not $created) { exit 1 }"

if errorlevel 1 (
    echo [ERROR] Tao Shortcut Desktop that bai!
) else (
    echo [OK] Hoan tat tao icon Desktop.
)
echo.

:: ===================================================
:: DANG KY KHOI DONG CUNG WINDOWS (STARTUP)
:: ===================================================
echo [4/5] Dang ky NetClientApp tu dong khoi dong cung Windows (Startup)...
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" ^
    /v "NetClientApp" ^
    /t REG_SZ ^
    /d "\"%APP_EXE%\"" ^
    /f >nul 2>&1

if errorlevel 1 (
    echo [!] Canh bao: Khong the ghi registry Startup HKCU.
) else (
    echo [OK] Da dang ky tu khoi dong cung Windows thanh cong.
)
echo.

:: ===================================================
:: KHOI CHAY UNG DUNG
:: ===================================================
echo [5/5] Dang khoi chay NetClientApp...
start "" "%APP_EXE%"
if errorlevel 1 (
    echo [!] Khong the tu khoi chay ung dung. Ban co the mo truc tiep tu Desktop.
) else (
    echo [OK] NetClientApp dang chay.
)

echo.
echo ===================================================
echo              CAI DAT HOAN TAT THANH CONG!
echo ===================================================
echo.
echo - File ung dung: %APP_EXE%
echo - Icon Desktop : Da tao "NetClient App.lnk" ngoai man hinh
echo - Tu khoi dong : Da dang ky tu chay khi dang nhap Windows
echo.
echo Ban co the nhan icon "NetClient App" ngoai Desktop de mo ung dung bat cu luc nao.
echo ===================================================
pause

:END
endlocal