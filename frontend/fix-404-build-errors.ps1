# Script to fix Next.js 404 build errors
Write-Host "=== Fixing Next.js 404 Build Errors ===" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is in use
$port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "⚠️  Port 3000 is in use. Stopping Next.js server..." -ForegroundColor Yellow
    $process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "✅ Server stopped" -ForegroundColor Green
    }
}

# Clear .next directory
if (Test-Path .next) {
    Write-Host "🗑️  Removing .next directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "✅ .next directory cleared" -ForegroundColor Green
} else {
    Write-Host "✅ .next directory doesn't exist" -ForegroundColor Green
}

# Clear node_modules cache
if (Test-Path node_modules\.cache) {
    Write-Host "🗑️  Removing node_modules\.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
    Write-Host "✅ node_modules cache cleared" -ForegroundColor Green
}

# Clear .turbo directory (if using Turbopack)
if (Test-Path .turbo) {
    Write-Host "🗑️  Removing .turbo directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue
    Write-Host "✅ .turbo directory cleared" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now restart the dev server with:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "After restarting:" -ForegroundColor Yellow
Write-Host "   1. Hard refresh your browser (Ctrl+Shift+R or Ctrl+F5)" -ForegroundColor White
Write-Host "   2. Clear browser cache if needed" -ForegroundColor White
Write-Host "   3. Wait for the build to complete (60-90 seconds)" -ForegroundColor White
Write-Host ""
