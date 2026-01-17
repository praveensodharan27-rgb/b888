# Start All Servers - Simple Version
# Opens two separate terminal windows for backend and frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting All Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check ports
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠️  Port 5000 is already in use!" -ForegroundColor Yellow
    Write-Host "   Run: .\kill-port-5000.ps1 to free it" -ForegroundColor Gray
    Write-Host ""
}

if ($port3000) {
    Write-Host "⚠️  Port 3000 is already in use!" -ForegroundColor Yellow
    Write-Host ""
}

# Fix DATABASE_URL if needed
if (Test-Path "fix-url-simple.js") {
    Write-Host "Checking DATABASE_URL..." -ForegroundColor Yellow
    node fix-url-simple.js 2>&1 | Out-Null
}

# Generate Prisma Client if needed
if (-not (Test-Path "node_modules\.prisma\client\index.js")) {
    Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
    npm run prisma:generate 2>&1 | Out-Null
}

# Start Backend in new window
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
$backendPath = $PWD
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; `$host.ui.RawUI.WindowTitle = 'Sellit Backend'; npm run dev"

Start-Sleep -Seconds 2

# Start Frontend in new window
$frontendPath = Join-Path $PWD "..\frontend"
if (Test-Path $frontendPath) {
    Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; `$host.ui.RawUI.WindowTitle = 'Sellit Frontend'; npm run dev"
} else {
    Write-Host "⚠️  Frontend directory not found at: $frontendPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Servers Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Backend: http://localhost:5000" -ForegroundColor White
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "💡 Two terminal windows have been opened" -ForegroundColor Cyan
Write-Host "   Close them to stop the servers" -ForegroundColor Gray
Write-Host ""
