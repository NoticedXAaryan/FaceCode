@echo off
chcp 65001 >nul
title FaceTag Launcher
color 0A
cls

echo.
echo  ███████╗ █████╗  ██████╗███████╗████████╗ █████╗  ██████╗ 
echo  ██╔════╝██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔════╝ 
echo  █████╗  ███████║██║     █████╗     ██║   ███████║██║  ███╗ 
echo  ██╔══╝  ██╔══██║██║     ██╔══╝     ██║   ██╔══██║██║   ██║ 
echo  ██║     ██║  ██║╚██████╗███████╗   ██║   ██║  ██║╚██████╔╝ 
echo  ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  
echo.
echo  Starting FaceTag...
echo  -------------------------------------------------------
echo.

:: ---- PATHS — edit if your folder is in a different location ----
set BACKEND=C:\Users\notic\OneDrive\Desktop\face-app\FaceTag\backend
set FRONTEND=C:\Users\notic\OneDrive\Desktop\face-app\FaceTag
:: ----------------------------------------------------------------

:: Check folders exist
if not exist "%BACKEND%" (
    color 0C
    echo  ERROR: Backend folder not found: %BACKEND%
    pause & exit /b 1
)
if not exist "%FRONTEND%" (
    color 0C
    echo  ERROR: Frontend folder not found: %FRONTEND%
    pause & exit /b 1
)

:: Kill any existing node process on port 3000
echo  Clearing port 3000...
taskkill /f /im node.exe > nul 2>&1
timeout /t 1 /nobreak > nul
echo  Port 3000 cleared.
echo.

:: Start backend
echo  [1/2] Starting Backend on http://localhost:3000 ...
start "FaceTag Backend" cmd /k "cd /d %BACKEND% && color 0B && echo FaceTag Backend && echo. && node server.js"

:: Wait for backend to boot
timeout /t 3 /nobreak > nul

:: Start Expo
echo  [2/2] Starting Expo (LAN mode) ...
start "FaceTag Expo" cmd /k "cd /d %FRONTEND% && color 0D && echo FaceTag Expo && echo. && npx expo start --clear --lan"

echo.
echo  -------------------------------------------------------
echo  Backend:  http://localhost:3000/health
echo  Expo:     Scan QR with Expo Go (same WiFi as laptop)
echo.
echo  Press any key to open health check in browser...
pause > nul
start http://localhost:3000/health
exit