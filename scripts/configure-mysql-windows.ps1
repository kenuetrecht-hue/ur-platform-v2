# One-time MySQL 8.4 setup after winget install (run PowerShell as Administrator)
$ErrorActionPreference = "Stop"

$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin"
$dataDir = "C:\ProgramData\MySQL\MySQL Server 8.4\Data"
$serviceName = "MySQL84"
$myIni = "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"

if (-not (Test-Path "$mysqlBin\mysqld.exe")) {
  Write-Host "[mysql] mysqld.exe not found. Install MySQL first: winget install Oracle.MySQL" -ForegroundColor Red
  exit 1
}

Write-Host "[mysql] Bin: $mysqlBin" -ForegroundColor Cyan

# Port already open?
try {
  $c = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 3306)
  $c.Close()
  Write-Host "[mysql] Already running on port 3306" -ForegroundColor Green
  exit 0
} catch {}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

if (-not (Test-Path "$dataDir\mysql")) {
  Write-Host "[mysql] Initializing data directory (root with no password)..." -ForegroundColor Yellow
  & "$mysqlBin\mysqld.exe" --initialize-insecure --datadir="$dataDir"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path $myIni)) {
  @"
[mysqld]
basedir=$mysqlBin/..
datadir=$dataDir
port=3306
"@ | Set-Content -Path $myIni -Encoding ASCII
}

$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $svc) {
  Write-Host "[mysql] Installing Windows service $serviceName..." -ForegroundColor Yellow
  & "$mysqlBin\mysqld.exe" --install $serviceName --defaults-file="$myIni"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[mysql] Service install failed. Run this script as Administrator." -ForegroundColor Red
    exit 1
  }
}

$svc = Get-Service -Name $serviceName
if ($svc.Status -ne "Running") {
  Write-Host "[mysql] Starting $serviceName..." -ForegroundColor Yellow
  Start-Service -Name $serviceName
}

Start-Sleep -Seconds 3
try {
  $c = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 3306)
  $c.Close()
  Write-Host "[mysql] MySQL is running on 127.0.0.1:3306" -ForegroundColor Green
  Write-Host "[mysql] Next: pnpm db:setup"
} catch {
  Write-Host "[mysql] Service started but port 3306 not responding yet. Wait 10s and run: pnpm db:check" -ForegroundColor Yellow
  exit 1
}
