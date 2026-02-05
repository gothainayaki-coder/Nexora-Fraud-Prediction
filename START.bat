@echo off
title NEXORA CONTROL CENTER - STARTING...
echo ============================================================
echo    NEXORA FRAUD PREDICTOR - MASTER LAUNCHER
echo ============================================================
echo.

:: Check for node_modules
if not exist "frontend\node_modules" (
    echo [!] First time setup detected. Installing dependencies...
    call npm run install:all
)

echo [!] Starting Backend and Frontend Servers...
echo [!] Once started, visit: http://localhost:3000
echo.

:: Open the Command Center UI
start "" "%~dp0NEXORA_CENTER.html"

:: Run concurrently
npm start

pause
