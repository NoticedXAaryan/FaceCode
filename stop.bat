@echo off
title FaceTag — Stop All
color 0C
cls

echo.
echo  Stopping FaceTag servers...
echo.

:: Kill node (backend)
taskkill /f /im node.exe > nul 2>&1
echo  [1/2] Backend stopped (node.exe killed)

:: Kill Metro bundler
taskkill /f /fi "WINDOWTITLE eq FaceTag Expo" > nul 2>&1
echo  [2/2] Expo Metro stopped

echo.
echo  All FaceTag processes stopped.
echo  Press any key to close...
pause > nul
exit