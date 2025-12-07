# Start All Servers Script for SellIt Platform
# This script starts both backend and frontend servers

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting SellIt Platform Servers" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if servers are already running
$backendRunning = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*5000*" }
$frontendRunning = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*3000*" }

if ($backendRunning -or $frontendRunning) {
    Write-Host "WARNING: Some servers may already be running." -ForegroundColor Yellow
    Write-Host "   If you encounter 'port already in use' errors, stop existing servers first.`n" -ForegroundColor Yellow
}

# Start Backend Server
Write-Host "Starting Backend Server (Port 5000)..." -ForegroundColor Green
Write-Host "   Opening new terminal for backend...`n" -ForegroundColor Gray

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\sellit\backend; Write-Host 'Backend Server' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Frontend Server
Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Green
Write-Host "   Opening new terminal for frontend...`n" -ForegroundColor Gray

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\sellit\frontend; Write-Host 'Frontend Server' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "         Servers Starting..." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Server Status:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Admin:    http://localhost:3000/admin" -ForegroundColor White
Write-Host "   Alerts:   http://localhost:3000/admin/search-alerts" -ForegroundColor White

Write-Host "`nPlease wait 10-15 seconds for servers to fully start...`n" -ForegroundColor Yellow

Write-Host "Tips:" -ForegroundColor Cyan
Write-Host "   - Both servers will open in separate terminal windows" -ForegroundColor Gray
Write-Host "   - Keep those terminals open while using the app" -ForegroundColor Gray
Write-Host "   - Use Ctrl+C in each terminal to stop servers" -ForegroundColor Gray
Write-Host "   - Check backend logs for search alerts cron job messages`n" -ForegroundColor Gray

Write-Host "Ready to use SellIt Platform!" -ForegroundColor Green
Write-Host "   Open your browser: http://localhost:3000`n" -ForegroundColor White
