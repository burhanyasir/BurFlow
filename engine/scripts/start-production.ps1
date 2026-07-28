#!/usr/bin/env pwsh
# ─── Production Start Script ─────────────────────────────────────
# Launches both services with PM2 for process management.
# Usage: .\scripts\start-production.ps1
#
# Prerequisites:
#   1. npm run build (compile TypeScript)
#   2. npm i -g pm2 (install PM2 globally)
#   3. .env file configured (copy from .env.example)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

Write-Host "═" * 60 -ForegroundColor Cyan
Write-Host "  Production Start" -ForegroundColor Cyan
Write-Host "═" * 60 -ForegroundColor Cyan
Write-Host ""

# Verify build is fresh
Write-Host "  [1/4] Verifying build freshness..." -NoNewline
$tsFiles = Get-ChildItem -Recurse -Filter "*.ts" -Path "$RootDir\packages\*\src" | Where-Object { $_.FullName -notmatch '__tests__|__bench_data__|__stress_data__' }
$stale = $false
foreach ($file in $tsFiles) {
  $jsFile = $file.FullName -replace '\.ts$', '.js' -replace '\\src\\', '\dist\'
  if (Test-Path -LiteralPath $jsFile) {
    if ($file.LastWriteTime -gt (Get-Item -LiteralPath $jsFile).LastWriteTime) {
      Write-Host "`n    STALE: $($file.FullName)" -ForegroundColor Yellow
      $stale = $true
    }
  }
}
if ($stale) {
  Write-Host "  Build is stale. Run 'npm run build' first." -ForegroundColor Red
  exit 1
}
Write-Host " OK" -ForegroundColor Green

# Check .env exists
Write-Host "  [2/4] Checking .env file..." -NoNewline
if (-not (Test-Path "$RootDir\.env")) {
  Write-Host " MISSING" -ForegroundColor Red
  Write-Host "  Create .env from .env.example before starting."
  exit 1
}
Write-Host " OK" -ForegroundColor Green

# Validate required env vars
Write-Host "  [3/4] Validating environment..." -NoNewline
$envFile = Get-Content "$RootDir\.env"
$vars = @{}
foreach ($line in $envFile) {
  if ($line -match '^([A-Z_]+)=(.+)$') {
    $vars[$matches[1]] = $matches[2]
  }
}
$required = @('JWT_SECRET', 'INTERNAL_SYNC_KEY', 'LLM_API_KEY', 'WIDGET_SECRET', 'OPENAI_API_KEY')
$missing = $required | Where-Object { -not $vars[$_] -or $vars[$_] -eq '' }
if ($missing.Count -gt 0) {
  Write-Host "`n    Missing required vars: $($missing -join ', ')" -ForegroundColor Red
  exit 1
}
Write-Host " OK" -ForegroundColor Green

# Start services
Write-Host "  [4/4] Starting services with PM2..." -ForegroundColor Green
Set-Location $RootDir
pm2 start ecosystem.config.js --env production
pm2 save

Write-Host ""
Write-Host "  Services started:" -ForegroundColor Green
Write-Host "    Pipeline: http://localhost:3456" -ForegroundColor White
Write-Host "    SaaS API: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "  Use 'pm2 logs' to view logs, 'pm2 stop all' to stop." -ForegroundColor Yellow
