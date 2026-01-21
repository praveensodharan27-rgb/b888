# Script to fix Next.js chunk loading errors
Write-Host "=== Fixing Next.js Chunk Loading Error ===" -ForegroundColor Cyan
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
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Restart dev server: npm run dev" -ForegroundColor White
Write-Host "   2. Wait for FULL build completion (60-90 seconds)" -ForegroundColor White
Write-Host "   3. Clear browser cache:" -ForegroundColor White
Write-Host "      - Press Ctrl+Shift+Delete (Chrome/Edge)" -ForegroundColor Yellow
Write-Host "      - Or use Incognito/Private mode" -ForegroundColor Yellow
Write-Host "   4. Hard refresh: Ctrl+Shift+R" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Wait for '✓ Ready' message before opening browser!" -ForegroundColor Yellow
Write-Host ""
