@echo off
title NgroupStream - Production P2P Screen Share & Voice
color 0B

echo =========================================================
echo   NGROUPSTREAM - HIGH-GRADE PRODUCTION HOST LAUNCHER
echo =========================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b
)

:: Check if node_modules exists
if not exist node_modules (
    echo [1/2] Installing dependencies...
    call npm install
)

echo [2/2] Launching NgroupStream Local Server...
echo.

:: Start server in a background job or directly
start "" "http://localhost:3000"
node server.js

pause
