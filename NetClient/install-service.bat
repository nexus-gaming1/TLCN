@echo off
chcp 65001 >nul
setlocal

echo ===================================================
echo     CAI DAT NETCLIENT (SERVICE + UI LOCKOVERLAY)
echo ===================================================
echo.

:: ===================================================
:: KIEM TRA QUYEN ADMIN
:: ===================================================
net session >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Vui long chay file bang Run as administrator!
    echo.
    pause
    goto :END
)

:: ===================================================
:: KHAI BAO DUONG DAN
:: ===================================================
set "SERVICE_NAME=NetClientService"
set "SERVICE_DIR=%~dp0publish\Service"
set "SERVICE_EXE=%SERVICE_DIR%\NetClient.Service.exe"
set "UI_DIR=%~dp0publish\UI"
set "UI_EXE=%UI_DIR%\NetClient.UI.exe"

echo [INFO] Service EXE:
echo        %SERVICE_EXE%
echo.
echo [INFO] UI EXE:
echo        %UI_EXE%
echo.

:: ===================================================
:: STOP CAC THANH PHAN CU
:: ===================================================
echo [1/7] Dang dung cac tien trinh cu...

taskkill /F /IM NetClient.UI.exe >nul 2>&1

sc.exe stop "%SERVICE_NAME%" >nul 2>&1

timeout /t 2 /nobreak >nul

echo [OK] Da dung tien trinh cu.
echo.

:: ===================================================
:: PUBLISH SERVICE
:: ===================================================
echo [2/7] Dang build va publish NetClient.Service...

dotnet publish "%~dp0NetClient.Service\NetClient.Service.csproj" -c Release -o "%SERVICE_DIR%"

if errorlevel 1 (
    echo.
    echo [ERROR] dotnet publish NetClient.Service that bai!
    echo.
    pause
    goto :END
)

if not exist "%SERVICE_EXE%" (
    echo.
    echo [ERROR] Khong tim thay:
    echo        %SERVICE_EXE%
    echo.
    pause
    goto :END
)

echo [OK] NetClient.Service publish thanh cong.
echo.

:: ===================================================
:: PUBLISH UI
:: ===================================================
echo [3/7] Dang build va publish NetClient.UI...

dotnet publish "%~dp0NetClient.UI\NetClient.UI.csproj" -c Release -o "%UI_DIR%"

if errorlevel 1 (
    echo.
    echo [ERROR] dotnet publish NetClient.UI that bai!
    echo.
    pause
    goto :END
)

if not exist "%UI_EXE%" (
    echo.
    echo [ERROR] Khong tim thay:
    echo        %UI_EXE%
    echo.
    pause
    goto :END
)

echo [OK] NetClient.UI publish thanh cong.
echo.

:: ===================================================
:: CONFIG WINDOWS SERVICE
:: ===================================================
echo [4/7] Dang cau hinh Windows Service...

sc.exe query "%SERVICE_NAME%" >nul 2>&1

if errorlevel 1 (
    echo [INFO] Service chua ton tai. Dang tao moi...

    sc.exe create "%SERVICE_NAME%" ^
        binPath= "\"%SERVICE_EXE%\"" ^
        start= auto

    if errorlevel 1 (
        echo [ERROR] Khong the tao Windows Service!
    ) else (
        echo [OK] Da tao Windows Service.

        sc.exe description "%SERVICE_NAME%" "Dich vu quan ly may tram phong net (NetClient Agent)"
    )
) else (
    echo [INFO] Service da ton tai. Dang cap nhat...

    sc.exe config "%SERVICE_NAME%" ^
        binPath= "\"%SERVICE_EXE%\"" ^
        start= auto

    if errorlevel 1 (
        echo [ERROR] Khong the cap nhat Windows Service!
    ) else (
        echo [OK] Da cap nhat Windows Service.
    )
)

echo.

:: ===================================================
:: START SERVICE
:: ===================================================
echo [5/7] Dang khoi dong Windows Service...

sc.exe start "%SERVICE_NAME%"

if errorlevel 1 (
    echo [ERROR] Khong the khoi dong Service!
    echo [INFO] Kiem tra bang:
    echo        sc query %SERVICE_NAME%
) else (
    echo [OK] Service da duoc khoi dong.
)

echo.

:: ===================================================
:: REGISTER UI STARTUP
:: ===================================================
echo [6/7] Dang ky NetClient.UI tu dong khoi dong...

reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" ^
    /v "NetClientUI" ^
    /t REG_SZ ^
    /d "\"%UI_EXE%\"" ^
    /f

if errorlevel 1 (
    echo [ERROR] Khong the dang ky HKCU Startup!
) else (
    echo [OK] Da dang ky HKCU Startup.
)

echo.

:: ===================================================
:: START UI
:: ===================================================
echo [7/7] Dang khoi chay NetClient.UI...

start "" "%UI_EXE%"

if errorlevel 1 (
    echo [ERROR] Khong the khoi chay NetClient.UI!
) else (
    echo [OK] NetClient.UI da duoc khoi chay.
)

echo.
echo ===================================================
echo CAI DAT HOAN TAT
echo ===================================================
echo.
echo Kiem tra Service:
echo     sc query %SERVICE_NAME%
echo.
echo Kiem tra UI:
echo     tasklist ^| findstr NetClient.UI.exe
echo.
echo Kiem tra Startup:
echo     reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v NetClientUI
echo.
echo ===================================================

pause

:END
endlocal