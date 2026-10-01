# ============================================================================
# EmVoice - Windows Service Uninstall/Stop Script (RUN AS ADMIN)
# ============================================================================
# This script stops and removes the EmVoice backend Windows service.
#
# IMPORTANT: Run this script as Administrator!
#
# Usage:
#   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
#   .\UNINSTALL_SERVICE.ps1

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$serviceName = "EmVoiceBackend"
$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nssmPath = Join-Path $appDir "tools\nssm\nssm.exe"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Yellow
Write-Host "EmVoice Backend Service - Uninstall" -ForegroundColor Yellow
Write-Host "============================================================================" -ForegroundColor Yellow
Write-Host ""

# Check if service exists
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "⚠️  Service '$serviceName' is not installed." -ForegroundColor Yellow
    pause
    exit 0
}

Write-Host "Service found: $serviceName" -ForegroundColor Cyan
Write-Host "Status: $($service.Status)" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Are you sure you want to uninstall this service? (yes/no)"
if ($response -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    pause
    exit 0
}

# Stop the service
Write-Host ""
Write-Host "Stopping service..." -ForegroundColor Cyan
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✓ Service stopped" -ForegroundColor Green

# Remove the service using NSSM if available
if (Test-Path $nssmPath) {
    Write-Host "Removing service..." -ForegroundColor Cyan
    & $nssmPath remove $serviceName confirm | Out-Null
} else {
    # Fallback: use sc.exe
    Write-Host "Removing service (using sc.exe)..." -ForegroundColor Cyan
    sc.exe delete $serviceName | Out-Null
}

Start-Sleep -Seconds 2

# Verify removal
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "⚠️  Service still exists. Attempting force removal..." -ForegroundColor Yellow
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
Write-Host "✓ Service uninstalled successfully!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "The backend will no longer start automatically on Windows boot." -ForegroundColor White
Write-Host "You can still run: START_APP.bat to manually start the app" -ForegroundColor White
Write-Host ""

pause
