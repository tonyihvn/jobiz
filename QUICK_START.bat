@echo off
REM ============================================================================
REM EMVOICE - QUICK START GUIDE
REM ============================================================================

cls
color 0A

echo.
echo ============================================================================
echo                  EMVOICE - STARTUP SCRIPTS QUICK START
echo ============================================================================
echo.
echo You now have these convenient scripts in your app folder:
echo.
echo 📌 QUICK START (No Setup Needed):
echo    1. Double-click: START_APP.bat
echo       → Starts frontend + backend in 2 console windows
echo       → Keep windows open while using the app
echo.
echo.
echo 🔧 WINDOWS SERVICE SETUP (Auto-start on boot):
echo.
echo    Step 1 - Install as Service:
echo       1. Open PowerShell as Administrator
echo       2. Type: cd C:\Users\Ogochukwu\Desktop\PROJECTS\REACTJS\emvoice
echo       3. Type: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
echo       4. Type: .\INSTALL_SERVICE.ps1
echo       5. Wait for completion
echo.
echo    Step 2 - After Installation:
echo       • Backend starts automatically when Windows boots ✓
echo       • To start frontend: Double-click START_APP.bat
echo       • To view logs: Double-click VIEW_LOGS.bat
echo       • To manage service: Double-click OPEN_SERVICES.bat
echo.
echo.
echo 📁 ALL AVAILABLE SCRIPTS:
echo.
echo    Double-Click Scripts:
echo    • START_APP.bat ..................... Start frontend + backend
echo    • VIEW_LOGS.bat ..................... View service logs
echo    • OPEN_SERVICES.bat ................. Open Windows Services manager
echo.
echo    PowerShell Scripts (Run as Admin):
echo    • INSTALL_SERVICE.ps1 .............. Install Windows service
echo    • UNINSTALL_SERVICE.ps1 ............ Remove Windows service
echo.
echo    Documentation:
echo    • SERVICE_SETUP_GUIDE.md ........... Complete setup guide
echo    • This file: QUICK_START.bat
echo.
echo.
echo 📖 FOR DETAILED INSTRUCTIONS:
echo    Open and read: SERVICE_SETUP_GUIDE.md
echo.
echo.
echo 🆘 TROUBLESHOOTING:
echo    1. Check logs: Double-click VIEW_LOGS.bat
echo    2. Manage service: Double-click OPEN_SERVICES.bat
echo    3. Read guide: SERVICE_SETUP_GUIDE.md
echo.
echo ============================================================================
echo.

pause
