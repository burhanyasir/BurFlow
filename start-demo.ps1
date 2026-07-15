Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BrightSmile AI - Demo Mode" -ForegroundColor Cyan
Write-Host "  AI Lead Generation Platform for Dental Clinics" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$port = 3456
$demoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $demoDir

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --silent

Write-Host "Starting server on port $port..." -ForegroundColor Green
Write-Host ""
Write-Host "  Open in browser: http://localhost:$port" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

$env:PORT = $port
node server.js
