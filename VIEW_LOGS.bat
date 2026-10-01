@echo off
REM ============================================================================
REM EmVoice - View Service Logs
REM ============================================================================
REM This opens the service logs in Notepad for easy viewing

cd /d "%~dp0"

if not exist "logs\service.log" (
    echo logs\service.log does not exist yet.
    echo The service logs will be created after the service runs for the first time.
    echo.
    pause
    exit /b 1
)

echo Opening service logs...
notepad logs\service.log
