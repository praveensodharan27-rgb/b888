# Backend Server Starter Script
# Kills any existing process on port 5000 and starts a fresh backend server

Write-Host ""
Write-Host "🔍 Checking for existing backend process on port 5000..." -ForegroundColor Cyan

# Find and kill any process using port 5000
$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($connection) {
    $processId = $connection.OwningProcess
    Write-Host "⚠️  Found existing process using port 5000 (PID: $processId)" -ForegroundColor Yellow
    Write-Host "🔪 Killing process $processId..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Process killed successfully" -ForegroundColor Green
}
else {
    Write-Host "✅ Port 5000 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting backend server..." -ForegroundColor Cyan
Write-Host "📍 Backend will run on: http://localhost:5000" -ForegroundColor Green
Write-Host "📍 Frontend should run on: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Please wait while the server initializes..." -ForegroundColor Yellow
Write-Host ""

# Start the backend server
npm start
