# Tries to start MySQL on Windows if already installed; otherwise prints install steps.
$ErrorActionPreference = "Stop"

Write-Host "[db] Checking port 3306..." -ForegroundColor Cyan

$portOpen = $false
try {
  $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 3306)
  $client.Close()
  $portOpen = $true
} catch {
  $portOpen = $false
}

if ($portOpen) {
  Write-Host "[db] MySQL is already running on 127.0.0.1:3306" -ForegroundColor Green
  Write-Host "[db] Run: pnpm db:setup"
  exit 0
}

$serviceNames = @("MySQL80", "MySQL84", "MySQL", "MariaDB", "mysql")
$started = $false

foreach ($name in $serviceNames) {
  $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
  if (-not $svc) { continue }

  Write-Host "[db] Found service: $($svc.Name) ($($svc.Status))" -ForegroundColor Yellow
  if ($svc.Status -ne "Running") {
    try {
      Start-Service -Name $svc.Name
      Write-Host "[db] Started $($svc.Name)" -ForegroundColor Green
      $started = $true
      break
    } catch {
      Write-Host "[db] Could not start $($svc.Name). Try running PowerShell as Administrator." -ForegroundColor Red
      Write-Host $_.Exception.Message
    }
  } else {
    Write-Host "[db] Service is running but port 3306 is closed - check MySQL config." -ForegroundColor Red
    exit 1
  }
}

if ($started) {
  Start-Sleep -Seconds 3
  try {
    $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 3306)
    $client.Close()
    Write-Host "[db] MySQL is up. Run: pnpm db:setup" -ForegroundColor Green
    exit 0
  } catch {
    Write-Host "[db] Service started but port 3306 still closed. Wait a few seconds and run: pnpm db:check" -ForegroundColor Yellow
    exit 1
  }
}

# XAMPP mysql path
$xampp = "C:\xampp\mysql\bin\mysqld.exe"
if (Test-Path $xampp) {
  Write-Host "[db] XAMPP found - start MySQL from XAMPP Control Panel, then: pnpm db:setup" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "[db] MySQL is NOT installed or not running on this PC." -ForegroundColor Red
Write-Host ""
Write-Host "Pick ONE option:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  A) Docker Desktop (easiest for dev)"
Write-Host "     https://www.docker.com/products/docker-desktop/"
Write-Host "     Then: pnpm db:mysql:up && pnpm db:setup"
Write-Host ""
Write-Host "  B) MySQL Installer"
Write-Host "     https://dev.mysql.com/downloads/installer/"
Write-Host "     After install, run this script again (as Admin) or start MySQL80 in services.msc"
Write-Host "     Then: pnpm db:setup"
Write-Host ""
Write-Host "  C) XAMPP"
Write-Host "     https://www.apachefriends.org/"
Write-Host "     Start MySQL in XAMPP Control Panel, then: pnpm db:setup"
Write-Host ""
Write-Host "  D) winget (Admin PowerShell)"
Write-Host "     winget install Oracle.MySQL --accept-source-agreements --accept-package-agreements"
Write-Host ""
exit 1
