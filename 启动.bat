@echo off
chcp 65001 >nul
title FocusBuddy
cd /d "%~dp0"

echo ================================
echo   🐱 FocusBuddy
echo   浏览器打开: http://localhost:8080/index_new.html
echo   按 Ctrl+C 停止
echo ================================

start "" "http://localhost:8080/index_new.html"
python -m http.server 8080
pause
