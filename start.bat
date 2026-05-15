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

:: Kill any existing node process on port 3000 (just in case)
echo  Clearing port 3000...
taskkill /f /im node.exe > nul 2>&1
timeout /t 1 /nobreak > nul
echo  Port 3000 cleared.
echo.

:: Start Expo
echo  [1/1] Starting Expo ...
start "FaceTag Expo" cmd /k "cd /d %PROJECT_ROOT% && color 0D && echo FaceTag Expo && echo. && npm run dev -- --clear"

echo.
echo  -------------------------------------------------------
echo  Backend API:  https://face-code-pink.vercel.app/api/health
echo  Expo:         Scan QR with Expo Go
echo.
echo  Press any key to open live API health check in browser...
pause > nul
start https://face-code-pink.vercel.app/api/health
exit
