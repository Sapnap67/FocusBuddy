@echo off
chcp 65001 >nul
title FocusBuddy Full

echo ================================
echo   🐱 FocusBuddy 完整版
echo ================================
echo.
echo 正在启动本地服务器...
echo.

cd /d "%~dp0"

set PORT=8080

:checkport
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo 端口 %PORT% 被占用，尝试下一个...
    set /a PORT+=1
    if %PORT% gtr 8090 (
        echo 端口都占满了，请手动关掉占用进程
        pause
        exit /b 1
    )
    goto checkport
)

echo 服务器已启动: http://localhost:%PORT%
echo 连上 ESP32 WiFi 宠物就会动哦~
echo 按 Ctrl+C 停止
echo ================================

start http://localhost:%PORT%

python -m http.server %PORT%

pause
