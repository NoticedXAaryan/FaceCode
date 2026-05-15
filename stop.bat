@echo off
title FaceTag — Stop All
color 0C
cls

echo.
echo  Stopping FaceTag servers...
echo.

:: Kill node (backend and vercel dev)
taskkill /f /im node.exe > nul 2>&1
echo  [1/2] Backend and Metro stopped (node.exe killed)

:: Kill Expo command window
taskkill /f /fi "WINDOWTITLE eq FaceTag Expo" > nul 2>&1
:: Kill API command window
taskkill /f /fi "WINDOWTITLE eq FaceTag API" > nul 2>&1
echo  [2/2] Command windows closed

echo.
echo  All FaceTag processes stopped.
echo  Press any key to close...
pause > nul
exit