# Script to restart all servers (Backend + Frontend)
Write-Host "=== RESTARTING ALL SERVERS ===" -ForegroundColor Cyan
Write-Host ""

# Check if servers are running
$backend = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($backend -or $frontend) {
    Write-Host "⚠️  Servers are still running!" -ForegroundColor Yellow
    if ($backend) {
        Write-Host "   - Backend (port 5000) is running" -ForegroundColor White
    }
    if ($frontend) {
        Write-Host "   - Frontend (port 3000) is running" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Please stop all servers first (Ctrl+C in their terminals)" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor White
    exit
}

# Clear Next.js cache
Write-Host "🗑️  Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path frontend\.next) {
    Remove-Item -Recurse -Force frontend\.next
    Write-Host "✅ Cleared frontend/.next" -ForegroundColor Green
}
if (Test-Path frontend\node_modules\.cache) {
    Remove-Item -Recurse -Force frontend\node_modules\.cache
    Write-Host "✅ Cleared frontend/node_modules/.cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== STARTING BACKEND SERVER ===" -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== BACKEND SERVER ===' -ForegroundColor Cyan; Write-Host 'Starting on http://localhost:5000' -ForegroundColor Green; npm run dev" -WindowStyle Normal

Write-Host "⏳ Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=== STARTING FRONTEND SERVER ===" -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== FRONTEND SERVER ===' -ForegroundColor Cyan; Write-Host 'Starting on http://localhost:3000' -ForegroundColor Green; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Servers are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""

