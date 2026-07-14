@echo off
chcp 65001 >nul
title FocusBuddy MVP

echo ================================
echo   🐱 FocusBuddy MVP
echo ================================
echo.
echo 正在启动本地服务器...
echo.

cd /d "%~dp0"

:: 尝试不同端口
set PORT=8080

:: 检查端口占用并自动换端口
:checkport
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo 端口 %PORT% 被占用，尝试下一个...
    set /a PORT+=1
    goto checkport
)

echo 服务器已启动: http://localhost:%PORT%
echo.
echo 按 Ctrl+C 停止服务器
echo ================================

start http://localhost:%PORT%

python -m http.server %PORT%

pause
