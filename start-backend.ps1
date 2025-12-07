# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Green
cd backend
if (Test-Path .env) {
    Write-Host "✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠ .env file not found - please create it" -ForegroundColor Yellow
}

Write-Host "`nStarting server on http://localhost:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

npm run dev
