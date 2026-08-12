# Start MySQL 8.4 for local dev without Windows service (no admin required)
$ErrorActionPreference = "Stop"

$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin"
$dataDir = "C:\ProgramData\MySQL\MySQL Server 8.4\Data"
$myIni = "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
$pidFile = "C:\ProgramData\MySQL\MySQL Server 8.4\mysql-dev.pid"

if (-not (Test-Path "$mysqlBin\mysqld.exe")) {
  Write-Host "[mysql] Install first: winget install Oracle.MySQL" -ForegroundColor Red
  exit 1
}

try {
  $c = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 3306)
  $c.Close()
  Write-Host "[mysql] Already running on port 3306" -ForegroundColor Green
  exit 0
} catch {}

if (-not (Test-Path "$dataDir\mysql")) {
  Write-Host "[mysql] Run as Administrator once: pnpm db:configure-mysql" -ForegroundColor Red
  Write-Host "[mysql] Or: powershell -ExecutionPolicy Bypass -File scripts/configure-mysql-windows.ps1"
  exit 1
}

if (-not (Test-Path $myIni)) {
  New-Item -ItemType Directory -Force -Path (Split-Path $myIni) | Out-Null
  @"
[mysqld]
basedir=C:/Program Files/MySQL/MySQL Server 8.4
datadir=C:/ProgramData/MySQL/MySQL Server 8.4/Data
port=3306
"@ | Set-Content -Path $myIni -Encoding ASCII
}

Write-Host "[mysql] Starting mysqld (dev mode)..." -ForegroundColor Yellow
$proc = Start-Process -FilePath "$mysqlBin\mysqld.exe" `
  -ArgumentList "--defaults-file=`"$myIni`"", "--console" `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Seconds 4

for ($i = 0; $i -lt 10; $i++) {
  try {
    $c = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 3306)
    $c.Close()
    $proc.Id | Set-Content -Path $pidFile -Encoding ASCII
    Write-Host "[mysql] Running on 127.0.0.1:3306 (pid $($proc.Id))" -ForegroundColor Green
    Write-Host "[mysql] Next: pnpm db:setup"
    exit 0
  } catch {
    Start-Sleep -Seconds 2
  }
}

Write-Host "[mysql] mysqld did not open port 3306. Check Windows Event Viewer or run configure script as Admin." -ForegroundColor Red
exit 1
