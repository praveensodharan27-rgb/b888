# Complete Prisma MongoDB Fix
# This script ensures Prisma is fully configured for MongoDB

Write-Host "`n=== Fixing Prisma MongoDB Configuration ===`n" -ForegroundColor Cyan

# Step 1: Delete Prisma cache
Write-Host "Step 1: Clearing Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma"
    Write-Host "  Deleted Prisma cache" -ForegroundColor Green
} else {
    Write-Host "  No cache found" -ForegroundColor Gray
}

# Step 2: Verify schema
Write-Host "`nStep 2: Verifying schema..." -ForegroundColor Yellow
$schema = Get-Content "prisma\schema.prisma" -Raw
if ($schema -match 'provider\s*=\s*"mongodb"') {
    Write-Host "  Schema is MongoDB" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Schema is not MongoDB!" -ForegroundColor Red
    exit 1
}

# Step 3: Regenerate Prisma Client
Write-Host "`nStep 3: Regenerating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Prisma Client regenerated" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Step 4: Test connection
Write-Host "`nStep 4: Testing MongoDB connection..." -ForegroundColor Yellow
node scripts/check-mongodb-ready.js
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== All Fixed! ===" -ForegroundColor Green
    Write-Host "`nYou can now start your server:" -ForegroundColor Cyan
    Write-Host "  npm run dev`n" -ForegroundColor White
} else {
    Write-Host "`nConnection test failed. Check your .env file." -ForegroundColor Red
    exit 1
}
