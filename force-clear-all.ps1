# Force Clear All Cache and Restart

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FORCE CLEAR ALL CACHE & RESTART" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all Node processes
Write-Host "Step 1: Killing all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   Done" -ForegroundColor Green

# Step 2: Clear frontend cache
Write-Host ""
Write-Host "Step 2: Clearing frontend cache..." -ForegroundColor Yellow
if (Test-Path "frontend\.next") {
    Remove-Item -Recurse -Force "frontend\.next" -ErrorAction SilentlyContinue
    Write-Host "   Cleared .next folder" -ForegroundColor Green
}
if (Test-Path "frontend\node_modules\.cache") {
    Remove-Item -Recurse -Force "frontend\node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   Cleared node_modules cache" -ForegroundColor Green
}

# Step 3: Clear backend cache (if any)
Write-Host ""
Write-Host "Step 3: Clearing backend cache..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules\.cache") {
    Remove-Item -Recurse -Force "backend\node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   Cleared backend cache" -ForegroundColor Green
}

# Step 4: Verify database
Write-Host ""
Write-Host "Step 4: Verifying database..." -ForegroundColor Yellow
cd backend
$adsCount = node -e "const { MongoClient } = require('mongodb'); require('dotenv').config(); const uri = process.env.DATABASE_URL; const client = new MongoClient(uri); client.connect().then(() => { const db = client.db('olx_app'); db.collection('ads').countDocuments().then(count => { console.log(count); client.close(); }); });"
cd ..
Write-Host "   Ads in database: $adsCount" -ForegroundColor $(if ($adsCount -eq "0") { "Green" } else { "Red" })

# Step 5: Start servers
Write-Host ""
Write-Host "Step 5: Starting servers..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
.\start-all.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DONE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database has $adsCount ads" -ForegroundColor Green
Write-Host ""
Write-Host "NOW DO THIS:" -ForegroundColor Yellow
Write-Host "1. Go to your browser" -ForegroundColor White
Write-Host "2. Press Ctrl + Shift + Delete" -ForegroundColor White
Write-Host "3. Clear 'Cached images and files'" -ForegroundColor White
Write-Host "4. Go to http://localhost:3000" -ForegroundColor White
Write-Host "5. Press Ctrl + Shift + R (hard refresh)" -ForegroundColor White
Write-Host ""
Write-Host "OR use Incognito/Private window:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000" -ForegroundColor White
Write-Host ""
