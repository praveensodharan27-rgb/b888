# Script to fix MIME type error by clearing Next.js cache
Write-Host "=== Fixing MIME Type Error ===" -ForegroundColor Cyan
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

# Clear .next directory
if (Test-Path .next) {
    Write-Host "🗑️  Removing .next directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next
    Write-Host "✅ .next directory cleared" -ForegroundColor Green
} else {
    Write-Host "✅ .next directory doesn't exist" -ForegroundColor Green
}

# Clear node_modules cache
if (Test-Path node_modules/.cache) {
    Write-Host "🗑️  Removing node_modules/.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "✅ node_modules cache cleared" -ForegroundColor Green
} else {
    Write-Host "✅ node_modules/.cache doesn't exist" -ForegroundColor Green
}

# Clear Next.js cache in node_modules
if (Test-Path node_modules/.next) {
    Write-Host "🗑️  Removing node_modules/.next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules/.next
    Write-Host "✅ node_modules/.next cleared" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now restart the dev server with:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "If the error persists, try:" -ForegroundColor Yellow
Write-Host "   1. Hard refresh your browser (Ctrl+Shift+R or Ctrl+F5)" -ForegroundColor White
Write-Host "   2. Clear browser cache" -ForegroundColor White
Write-Host "   3. Try in incognito/private mode" -ForegroundColor White
Write-Host ""

