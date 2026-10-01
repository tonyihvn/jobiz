@echo off
REM ============================================================================
REM EmVoice - Service Startup Wrapper
REM ============================================================================
REM This script is run by Windows Service and starts the backend server
REM The frontend dev server is NOT started by the service - only backend

cd /d "%~dp0"

REM Create logs directory if it doesn't exist
if not exist "logs" (
    mkdir logs
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start the backend server - keep it running
echo EmVoice Backend Service Started at %date% %time% >> logs\service.log
node server.js >> logs\service.log 2>&1
