# Backend Server Stop Script
# Kills any process using port 5000

Write-Host "`n🔍 Looking for backend process on port 5000..." -ForegroundColor Cyan

$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connection) {
    $processId = $connection.OwningProcess
    Write-Host "⚠️  Found backend process (PID: $processId)" -ForegroundColor Yellow
    Write-Host "🔪 Stopping backend server..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "✅ Backend server stopped successfully" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No backend process found on port 5000" -ForegroundColor Blue
}

Write-Host ""
