# Script to fix module loading errors (Cannot read properties of undefined reading 'call')
Write-Host "=== Fixing Module Loading Error ===" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is in use
$port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "⚠️  Port 3000 is in use. Please stop the Next.js server first!" -ForegroundColor Yellow
    Write-Host "   Press Ctrl+C in the terminal running 'npm run dev'" -ForegroundColor White
    Write-Host ""
    Write-Host "After stopping the server, run this script again." -ForegroundColor White
    exit
}

Write-Host "🗑️  Clearing Next.js build cache..." -ForegroundColor Yellow

# Clear .next directory
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Cleared .next directory" -ForegroundColor Green
} else {
    Write-Host "✅ .next directory doesn't exist" -ForegroundColor Green
}

# Clear node_modules cache
if (Test-Path node_modules/.cache) {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "✅ Cleared node_modules/.cache" -ForegroundColor Green
}

# Clear Next.js cache in node_modules
if (Test-Path node_modules/.next) {
    Remove-Item -Recurse -Force node_modules/.next
    Write-Host "✅ Cleared node_modules/.next" -ForegroundColor Green
}

# Clear webpack cache
if (Test-Path .webpack) {
    Remove-Item -Recurse -Force .webpack
    Write-Host "✅ Cleared .webpack directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now restart the dev server with:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "If the error persists:" -ForegroundColor Yellow
Write-Host "   1. Hard refresh your browser (Ctrl+Shift+R or Ctrl+F5)" -ForegroundColor White
Write-Host "   2. Clear browser cache completely" -ForegroundColor White
Write-Host "   3. Try in incognito/private mode" -ForegroundColor White
Write-Host "   4. Delete node_modules and reinstall: npm install" -ForegroundColor White
Write-Host ""

