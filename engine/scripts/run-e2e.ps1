# run-e2e.ps1 — Starts the SaaS API server, runs e2e verification, cleans up

$ErrorActionPreference = 'Stop'
$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

$port = 3462
$dbPath = "data/e2e-run-$(Get-Random).db"
$logFile = "data/e2e-server-$(Get-Random).log"

# Clean up old DB on exit
$cleanup = { 
  if (Test-Path $dbPath) { Remove-Item -Force $dbPath -ErrorAction SilentlyContinue }
  if (Test-Path "$dbPath-wal") { Remove-Item -Force "$dbPath-wal" -ErrorAction SilentlyContinue }
  if (Test-Path "$dbPath-shm") { Remove-Item -Force "$dbPath-shm" -ErrorAction SilentlyContinue }
}

# ─── Start Server ─────────────────────────────────────────────
Write-Host "Starting server on port $port..."
$envVars = @{
  JWT_SECRET = 'e2e-test-jwt-secret-that-is-at-least-32-chars-long!'
  DB_PATH = $dbPath
  PORT = $port
  CORS_ORIGIN = 'false'
  LOG_LEVEL = 'error'
  EMAIL_PROVIDER = 'CONSOLE'
  NODE_ENV = 'development'
  PIPELINE_URL = 'http://localhost:3456'
}

# Use Start-Process with a helper cmd that sets env vars and runs tsx
$envCmd = "set"
foreach ($kv in $envVars.GetEnumerator()) {
  $envCmd += " $($kv.Key)=$($kv.Value)&"
}
$envCmd += " npx tsx packages/saas-api/src/index.ts"
$cmdArgs = @('/c', "start /B cmd /c `"$envCmd > $logFile 2>&1`"")

$proc = Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList $cmdArgs -PassThru
Start-Sleep 10

# Test if server is up
try {
  $r = Invoke-RestMethod -Uri "http://localhost:$port/api/live" -TimeoutSec 5 -ErrorAction Stop
  Write-Host "Server UP ($($r.status))"
} catch {
  Write-Host "Server failed to start. Log:" -ForegroundColor Red
  if (Test-Path $logFile) { Get-Content $logFile -Tail 20 }
  exit 1
}

# ─── Run E2E Tests ────────────────────────────────────────────
try {
  node scripts/e2e-verify.mjs "http://localhost:$port"
  $exitCode = $LASTEXITCODE
} catch {
  Write-Host "E2E script crashed: $_" -ForegroundColor Red
  $exitCode = 1
}

# ─── Cleanup ──────────────────────────────────────────────────
$pids = netstat -ano | Select-String ":$port " | ForEach-Object { $_ -replace '.*\s+(\d+)$', '$1' } | Select-Object -Unique
foreach ($pid in $pids) {
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
& $cleanup

if ($exitCode -ne 0) {
  Write-Host "E2E verification FAILED (exit code $exitCode)" -ForegroundColor Red
  if (Test-Path $logFile) { Write-Host "--- Server Log ---"; Get-Content $logFile -Tail 30 }
}
exit $exitCode
