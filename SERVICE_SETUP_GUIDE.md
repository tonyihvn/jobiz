# EmVoice - Startup & Service Installation Guide

This guide explains how to start your EmVoice application (frontend + backend) both manually and as an automatic Windows service.

---

## 📋 Quick Start (Manual - Double-Click Method)

### For Quick Testing or Development:

Simply **double-click** `START_APP.bat` in this folder.

This will:
1. ✓ Check for dependencies (install if needed)
2. ✓ Start the backend server (Node.js) in one console window
3. ✓ Start the frontend dev server (React/Vite) in another console window

**Important:** Keep both console windows open while using the app. Close them to stop the app.

---

## 🔧 Setup as Windows Service (Auto-Start on Boot)

### What This Does:
- Backend server runs automatically when Windows starts
- No need to manually run `START_APP.bat` for the backend
- Backend restarts automatically if it crashes
- You only need to run `START_APP.bat` for the frontend (React dev server)

### Step 1: Run the Installation Script

1. **Open PowerShell as Administrator:**
   - Press `Windows Key + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Navigate to the app directory:**
   ```powershell
   cd C:\Users\Ogochukwu\Desktop\PROJECTS\REACTJS\emvoice
   ```

3. **Allow script execution (one-time):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

4. **Run the installation script:**
   ```powershell
   .\INSTALL_SERVICE.ps1
   ```

5. **Wait for completion** and review the output

### Step 2: Verify Installation

Check if the service is running:
- Press `Windows Key + R`
- Type: `services.msc`
- Look for "EmVoice Backend Service" in the list
- Status should show as "Running" (green arrow icon)

---

## 🚀 Using Your App

### After Service Installation:

**Starting the App:**
1. Backend is already running automatically ✓
2. To also run the frontend, double-click: `START_APP.bat`
3. Open browser to: http://localhost:5173

**Stopping the App:**
- To stop backend: 
  - Open Services (services.msc) → Right-click "EmVoice Backend Service" → Stop
  - OR in PowerShell (as Admin): `Stop-Service -Name EmVoiceBackend`

- To stop frontend: Close the frontend console window

**Restarting the Backend:**
- Open Services → Right-click "EmVoice Backend Service" → Restart
- OR after Windows boot, it starts automatically

---

## 📁 Files Explained

| File | Purpose |
|------|---------|
| `START_APP.bat` | Double-click to manually start both frontend & backend |
| `SERVICE_START.bat` | Wrapper script run by Windows Service (internal use) |
| `INSTALL_SERVICE.ps1` | Install backend as Windows service (Admin required) |
| `UNINSTALL_SERVICE.ps1` | Remove the Windows service |
| `logs/` | Directory where service logs are written |

---

## 🔍 Troubleshooting

### Backend won't start (service status stuck on "Starting"):
1. Check logs:
   ```
   logs\service.log
   ```
2. Verify Node.js is installed:
   ```powershell
   node --version
   ```
3. Try manually:
   ```powershell
   cd C:\Users\Ogochukwu\Desktop\PROJECTS\REACTJS\emvoice
   npm install
   node server.js
   ```

### Service won't install (permission denied):
- Make sure PowerShell is running as Administrator
- Try: `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process`

### Port already in use (backend):
- Edit `server.js` to use a different port
- Default is usually port 3001

### Frontend not running:
- Make sure you double-clicked `START_APP.bat`
- It should open a new console window with "EmVoice Frontend"

### Service runs but no output/logs:
- Check: `logs\service.log`
- Make sure `logs/` directory exists (script creates it)
- Service output is only written to logs, not console

---

## 🛑 Uninstalling the Service

If you want to remove the Windows service:

1. Open PowerShell as Administrator
2. Navigate to the app directory
3. Run:
   ```powershell
   .\UNINSTALL_SERVICE.ps1
   ```
4. Confirm when prompted

The backend will no longer auto-start on Windows boot, but you can still manually run `START_APP.bat`.

---

## 💡 Advanced: Manual Service Management

### View service status:
```powershell
Get-Service -Name EmVoiceBackend
```

### Start service:
```powershell
Start-Service -Name EmVoiceBackend
```

### Stop service:
```powershell
Stop-Service -Name EmVoiceBackend
```

### Restart service:
```powershell
Restart-Service -Name EmVoiceBackend
```

### View logs:
```powershell
Get-Content .\logs\service.log -Tail 50
```

---

## 📝 Notes

- **Frontend-only option:** If you only want the backend as a service, just run `node server.js` manually and skip `START_APP.bat`
- **Production mode:** For production, consider using dedicated process managers like PM2 instead of NSSM
- **Network access:** Backend runs on `http://localhost:3001` (or configured port)
- **Database:** Make sure your database server is running and accessible
- **Logs:** Always check `logs/service.log` if something fails

---

## ❓ Questions?

Check the service logs: `logs\service.log`

For port conflicts, database errors, or missing dependencies - the detailed error messages will be in the logs.

---

**Version:** 1.0  
**Created:** 2026-10-01  
**App:** EmVoice (React + Express + MySQL)
