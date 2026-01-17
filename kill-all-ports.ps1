# Kill processes on both backend (5000) and frontend (3000) ports
Write-Host "Killing processes on ports 5000 and 3000..." -ForegroundColor Yellow
.\kill-port.ps1 5000
.\kill-port.ps1 3000

