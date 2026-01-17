# Script to Clear Cache and Restart All Servers
Write-Host "=== CLEARING CACHE AND RESTARTING SERVERS ===" -ForegroundColor Cyan
Write-Host ""

# Function to kill process on port
function Kill-Port {
    param([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "Stopping process on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

# Stop servers if running
Write-Host "Stopping running servers..." -ForegroundColor Yellow
Kill-Port -Port 5000
Kill-Port -Port 3000
Start-Sleep -Seconds 2

# Clear Frontend Cache (Next.js)
Write-Host ""
Write-Host "Clearing Frontend Cache..." -ForegroundColor Yellow
$frontendCachePaths = @(
    "frontend\.next",
    "frontend\node_modules\.cache",
    "frontend\.turbo"
)

foreach ($path in $frontendCachePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "   Cleared $path" -ForegroundColor Green
    }
}

# Clear Backend Cache
Write-Host ""
Write-Host "Clearing Backend Cache..." -ForegroundColor Yellow
$backendCachePaths = @(
    "backend\node_modules\.cache",
    "backend\.cache"
)

foreach ($path in $backendCachePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "   Cleared $path" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Cache cleared successfully!" -ForegroundColor Green
Write-Host ""

# Wait a moment
Start-Sleep -Seconds 1

# Start Backend Server
Write-Host "=== STARTING BACKEND SERVER ===" -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "backend"
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== BACKEND SERVER ===' -ForegroundColor Cyan; Write-Host 'Starting on http://localhost:5000' -ForegroundColor Green; npm run dev" -WindowStyle Normal
    Write-Host "   Backend server starting..." -ForegroundColor Green
} else {
    Write-Host "   Backend directory not found!" -ForegroundColor Red
}

# Wait for backend to start
Write-Host "Waiting 3 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host ""
Write-Host "=== STARTING FRONTEND SERVER ===" -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (Test-Path $frontendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== FRONTEND SERVER ===' -ForegroundColor Cyan; Write-Host 'Starting on http://localhost:3000' -ForegroundColor Green; npm run dev" -WindowStyle Normal
    Write-Host "   Frontend server starting..." -ForegroundColor Green
} else {
    Write-Host "   Frontend directory not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "All servers are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Server URLs:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Check the new PowerShell windows for server logs" -ForegroundColor Yellow
Write-Host ""
