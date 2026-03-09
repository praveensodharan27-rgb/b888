# Fix All Caching Issues and Restart

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FIX CACHING & RESTART SERVERS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all Node processes
Write-Host "Step 1: Stopping all servers..." -ForegroundColor Yellow
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

# Step 3: Clear backend cache
Write-Host ""
Write-Host "Step 3: Clearing backend cache..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules\.cache") {
    Remove-Item -Recurse -Force "backend\node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   Cleared backend cache" -ForegroundColor Green
}

# Step 4: Start servers
Write-Host ""
Write-Host "Step 4: Starting servers..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
.\start-all.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DONE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Code Changes Applied:" -ForegroundColor Cyan
Write-Host "  - Disabled React Query caching" -ForegroundColor Green
Write-Host "  - Added cache-busting to API" -ForegroundColor Green
Write-Host "  - Disabled Next.js caching" -ForegroundColor Green
Write-Host "  - Disabled backend caching" -ForegroundColor Green
Write-Host "  - Added no-cache headers" -ForegroundColor Green
Write-Host ""
Write-Host "Servers:" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "CLEAR BROWSER CACHE:" -ForegroundColor Yellow
Write-Host "  1. Press: Ctrl + Shift + Delete" -ForegroundColor White
Write-Host "  2. Clear: 'Cached images and files'" -ForegroundColor White
Write-Host "  3. Go to: http://localhost:3000" -ForegroundColor White
Write-Host "  4. Press: Ctrl + Shift + R" -ForegroundColor White
Write-Host ""
Write-Host "OR Test in Incognito:" -ForegroundColor Yellow
Write-Host "  Ctrl + Shift + N" -ForegroundColor White
Write-Host ""
