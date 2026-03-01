# Backend Server Restart Script
# Kills all Node.js processes and starts the backend fresh

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Backend Server Restart Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Killing all Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "      SUCCESS: Killed $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
}
else {
    Write-Host "      INFO: No Node processes found" -ForegroundColor Blue
}

Write-Host ""
Write-Host "[2/3] Waiting for ports to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[3/3] Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "      Backend: http://localhost:5000" -ForegroundColor Green
Write-Host "      Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Start the backend
npm start
