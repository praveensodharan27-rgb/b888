# Restart Backend Server Script

Write-Host "`nRestarting Backend Server..." -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Kill existing node processes on port 5000
Write-Host "Stopping existing backend server..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($proc in $processes) {
    try {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped process $proc" -ForegroundColor Gray
    } catch {
        Write-Host "  Process $proc already stopped" -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 2

# Start backend in new window
Write-Host "`nStarting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\sellit\backend; Write-Host 'Backend Server - Search Alerts Active' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 5

# Check if server is running
$running = Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($running) {
    Write-Host "`nBackend server restarted successfully!" -ForegroundColor Green
    Write-Host "  URL: http://localhost:5000" -ForegroundColor White
    Write-Host "  Admin Panel: http://localhost:3000/admin/search-alerts" -ForegroundColor White
    Write-Host "`nCheck the backend terminal for:" -ForegroundColor Cyan
    Write-Host "  - Cron jobs scheduled message" -ForegroundColor Gray
    Write-Host "  - Search alerts initialization" -ForegroundColor Gray
} else {
    Write-Host "`nWaiting for server to start..." -ForegroundColor Yellow
    Write-Host "  Check the new terminal window for status" -ForegroundColor Gray
}

Write-Host ""

