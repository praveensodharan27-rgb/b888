# Start Backend Server Script
Write-Host "Starting SellIt Backend Server..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if Prisma client is generated
if (-not (Test-Path "node_modules\.prisma\client")) {
    Write-Host "⚠️  Prisma client not found. Generating..." -ForegroundColor Yellow
    npm run prisma:generate
}

# Start the server
Write-Host "`n🚀 Starting server on http://localhost:5000`n" -ForegroundColor Green
npm run dev
