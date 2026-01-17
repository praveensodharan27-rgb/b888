# SellIt Backend Server Startup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SellIt Backend Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location $PSScriptRoot

# Check if node_modules exists
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found!" -ForegroundColor Red
    Write-Host "Installing dependencies... This may take a few minutes." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ node_modules found" -ForegroundColor Green
}

# Check if Prisma client is generated
Write-Host "Checking Prisma client..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\.prisma\client")) {
    Write-Host "⚠️  Prisma client not found!" -ForegroundColor Red
    Write-Host "Generating Prisma client..." -ForegroundColor Yellow
    npm run prisma:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Prisma generate failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "✅ Prisma client found" -ForegroundColor Green
}

# Check if .env file exists
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "Server will use default values from env.js" -ForegroundColor Gray
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server will start on: http://localhost:5000" -ForegroundColor White
Write-Host "Health check: http://localhost:5000/health" -ForegroundColor White
Write-Host "API base: http://localhost:5000/api" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
npm run dev
