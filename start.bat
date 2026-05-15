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

:: ---- PATHS ----
set PROJECT_ROOT=C:\Users\notic\OneDrive\Desktop\face-app
:: ----------------

:: Check folders exist
if not exist "%PROJECT_ROOT%" (
    color 0C
    echo  ERROR: Project folder not found: %PROJECT_ROOT%
    pause & exit /b 1
)

:: Kill any existing node process on port 3000
echo  Clearing port 3000...
taskkill /f /im node.exe > nul 2>&1
timeout /t 1 /nobreak > nul
echo  Port 3000 cleared.
echo.

:: Start Vercel local API server
echo  [1/2] Starting Vercel API Backend on http://localhost:3000 ...
start "FaceTag API" cmd /k "cd /d %PROJECT_ROOT% && color 0B && echo FaceTag API && echo. && npx vercel dev --listen 3000"

:: Wait for backend to boot
timeout /t 5 /nobreak > nul

:: Start Expo
echo  [2/2] Starting Expo ...
start "FaceTag Expo" cmd /k "cd /d %PROJECT_ROOT% && color 0D && echo FaceTag Expo && echo. && npm run dev -- --clear"

echo.
echo  -------------------------------------------------------
echo  Backend API:  http://localhost:3000/api/health
echo  Expo:         Scan QR with Expo Go
echo.
echo  Press any key to open API health check in browser...
pause > nul
start http://localhost:3000/api/health
exit
