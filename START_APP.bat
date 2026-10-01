@echo off
REM EmVoice - Startup Script (Double-Click to Start Frontend + Backend)
REM This script starts both Node.js backend and React frontend servers

cd /d "%~dp0"

echo.
echo ============================================================================
echo                    EMVOICE - Starting Application
echo ============================================================================
echo.

if not exist "server.js" (
    echo ERROR: server.js not found
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ERROR: package.json not found
    pause
    exit /b 1
)

echo [OK] server.js found
echo [OK] package.json found
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting Backend Server...
echo.
start "EmVoice Backend" cmd /k "node server.js"

timeout /t 3 /nobreak

echo.
echo Starting Frontend Dev Server...
echo.
start "EmVoice Frontend" cmd /k "npm run dev"

echo.
echo ============================================================================
echo Both servers started successfully!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Keep both console windows open. Close them to stop the app.
echo ============================================================================
echo.

timeout /t 5 /nobreak
