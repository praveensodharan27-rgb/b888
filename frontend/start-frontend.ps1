# Frontend Server Starter Script (Webpack)
# Uses Webpack instead of Turbopack to avoid CSS parsing errors

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Frontend Server Starter (Webpack)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting frontend with Webpack..." -ForegroundColor Yellow
Write-Host "(Turbopack has CSS parsing issues)" -ForegroundColor Gray
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Start the frontend with Webpack
npm run dev:webpack
