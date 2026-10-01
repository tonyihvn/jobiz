# EmVoice - Windows Service Installation Script
# Run this script as Administrator!

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "[OK] App Directory: $appDir" -ForegroundColor Green

# Create logs directory
$logsDir = Join-Path $appDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "[OK] Created logs directory" -ForegroundColor Green
}

$serviceName = "EmVoiceBackend"
$serviceDisplayName = "EmVoice Backend Service"

# Check if service exists
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host ""
    Write-Host "[WARNING] Service '$serviceName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "Remove and reinstall? (yes/no)"
    if ($response -eq "yes") {
        Write-Host "Stopping service..." -ForegroundColor Cyan
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "Removing service..." -ForegroundColor Cyan
        sc.exe delete $serviceName | Out-Null
        Start-Sleep -Seconds 2
        Write-Host "[OK] Service removed" -ForegroundColor Green
    } else {
        Write-Host "Cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Check NSSM
$nssmPath = Join-Path $appDir "tools\nssm\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host ""
    Write-Host "NSSM not found. Downloading..." -ForegroundColor Cyan
    
    $nssmDir = Join-Path $appDir "tools\nssm"
    if (-not (Test-Path $nssmDir)) {
        New-Item -ItemType Directory -Path $nssmDir | Out-Null
    }
    
    $nssmUrl = "https://nssm.cc/download/nssm-2.24.zip"
    $nssmZip = Join-Path $nssmDir "nssm.zip"
    
    try {
        Write-Host "Downloading from $nssmUrl..." -ForegroundColor Cyan
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
        Write-Host "[OK] Downloaded" -ForegroundColor Green
        
        Write-Host "Extracting..." -ForegroundColor Cyan
        Expand-Archive -Path $nssmZip -DestinationPath $nssmDir -Force
        
        $extracted = Get-ChildItem -Path $nssmDir -Filter "nssm.exe" -Recurse | Select-Object -First 1
        if ($extracted) {
            Copy-Item $extracted.FullName -Destination $nssmPath -Force
            Write-Host "[OK] NSSM installed" -ForegroundColor Green
        }
        
        Remove-Item $nssmZip -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "[ERROR] Failed to download NSSM: $_" -ForegroundColor Red
        pause
        exit 1
    }
}

if (-not (Test-Path $nssmPath)) {
    Write-Host "[ERROR] NSSM not found" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[OK] NSSM ready" -ForegroundColor Green

# Install service
Write-Host ""
Write-Host "Installing service..." -ForegroundColor Cyan
$batPath = Join-Path $appDir "SERVICE_START.bat"

if (-not (Test-Path $batPath)) {
    Write-Host "[ERROR] SERVICE_START.bat not found" -ForegroundColor Red
    pause
    exit 1
}

& $nssmPath install $serviceName $batPath | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Service installed" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Installation failed" -ForegroundColor Red
    pause
    exit 1
}

# Configure
Write-Host "Configuring..." -ForegroundColor Cyan
& $nssmPath set $serviceName AppDirectory $appDir | Out-Null
& $nssmPath set $serviceName AppExit Default Restart | Out-Null
& $nssmPath set $serviceName AppRestartDelay 5000 | Out-Null
& $nssmPath set $serviceName Start SERVICE_AUTO_START | Out-Null
sc.exe config $serviceName start=auto | Out-Null
Write-Host "[OK] Configured" -ForegroundColor Green

# Start
Write-Host ""
Write-Host "Starting service..." -ForegroundColor Cyan
Start-Service -Name $serviceName -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

$status = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($status.Status -eq "Running") {
    Write-Host "[OK] Service is running" -ForegroundColor Green
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "[OK] Installation Complete!" -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Name: $serviceName" -ForegroundColor White
    Write-Host "Status: Running" -ForegroundColor Green
    Write-Host "Startup: Automatic" -ForegroundColor White
    Write-Host ""
    Write-Host "The backend will start automatically when Windows boots." -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[WARNING] Service may not be running" -ForegroundColor Yellow
    Write-Host "Check logs\service.log for errors" -ForegroundColor Yellow
}

Write-Host ""
pause
