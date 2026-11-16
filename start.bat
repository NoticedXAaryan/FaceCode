@echo off
chcp 65001 >nul
title FaceTag
cd /d "%~dp0"
echo Starting FaceTag from %CD%
call npm run dev
