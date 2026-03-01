# Seed All Categories Script
# This script seeds all categories and subcategories into the database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Seeding All Categories" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Step 1: Fix DATABASE_URL if needed
Write-Host "Step 1: Checking DATABASE_URL..." -ForegroundColor Yellow
try {
    $fixOutput = node fix-url-simple.js 2>&1
    Write-Host $fixOutput
    Write-Host ""
} catch {
    Write-Host "⚠️  Warning: Could not check DATABASE_URL" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Regenerate Prisma Client
Write-Host "Step 2: Regenerating Prisma Client..." -ForegroundColor Yellow
try {
    npm run prisma:generate 2>&1 | Out-String | Write-Host
    Write-Host "✅ Prisma Client regenerated" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  Warning: Prisma generation had issues" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Seed Categories
Write-Host "Step 3: Seeding categories..." -ForegroundColor Yellow
Write-Host ""
try {
    $seedOutput = node scripts/seed-all-categories.js 2>&1 | Out-String
    Write-Host $seedOutput
    
    if ($seedOutput -match "✅.*completed") {
        Write-Host "✅ Categories seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Check output above for any errors" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Error seeding categories: $_" -ForegroundColor Red
    Write-Host "   Check the error message above" -ForegroundColor Yellow
    exit 1
}

# Step 4: Verify Categories
Write-Host "Step 4: Verifying categories..." -ForegroundColor Yellow
Write-Host ""
try {
    $verifyOutput = node verify-categories.js 2>&1 | Out-String
    Write-Host $verifyOutput
    Write-Host ""
} catch {
    Write-Host "⚠️  Could not verify categories" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Category Seeding Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor White
Write-Host "   - Seed database: npm run seed-all-db" -ForegroundColor Yellow
Write-Host "   - Start server: npm run dev" -ForegroundColor Yellow
Write-Host ""
