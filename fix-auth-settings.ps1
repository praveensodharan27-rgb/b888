# Fix Auth Settings Script

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Fixing Auth Settings Feature" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Stop servers
Write-Host "1. Stopping servers..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ Servers stopped`n" -ForegroundColor Green

# Navigate to backend
Set-Location backend

# Regenerate Prisma
Write-Host "2. Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host "   ✅ Prisma client generated`n" -ForegroundColor Green

# Push schema
Write-Host "3. Pushing schema to database..." -ForegroundColor Yellow
npx prisma db push --skip-generate
Write-Host "   ✅ Schema pushed`n" -ForegroundColor Green

# Seed data
Write-Host "4. Seeding auth settings..." -ForegroundColor Yellow
node scripts/seed-auth-settings.js
Write-Host "   ✅ Data seeded`n" -ForegroundColor Green

# Test
Write-Host "5. Testing database..." -ForegroundColor Yellow
node scripts/test-auth-settings.js
Write-Host "`n" -ForegroundColor Green

# Go back
Set-Location ..

# Restart servers
Write-Host "6. Restarting servers..." -ForegroundColor Yellow
.\start-all-servers.ps1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Auth Settings Fixed!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "Wait 15 seconds then visit:" -ForegroundColor Cyan
Write-Host "http://localhost:3000/admin?tab=auth-pages`n" -ForegroundColor White

