@echo off
REM ============================================================================
REM EmVoice - Open Windows Services Manager
REM ============================================================================
REM This opens the Windows Services control panel where you can:
REM - See if EmVoiceBackend service is running
REM - Start/Stop/Restart the service
REM - Change startup type

echo Opening Windows Services Manager...
echo.
echo Look for: "EmVoice Backend Service"
echo.

mmc services.msc

pause
