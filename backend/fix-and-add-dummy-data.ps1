# Fix DATABASE_URL and Add Dummy Data
# This script fixes the DATABASE_URL protocol issue and adds dummy data

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix DATABASE_URL & Add Dummy Data" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Fix DATABASE_URL
Write-Host "Step 1: Fixing DATABASE_URL..." -ForegroundColor Yellow
try {
    $output = node fix-url-simple.js 2>&1
    Write-Host $output
    Write-Host "✅ DATABASE_URL fixed" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error fixing DATABASE_URL: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Regenerate Prisma Client
Write-Host "Step 2: Regenerating Prisma Client..." -ForegroundColor Yellow
try {
    npm run prisma:generate 2>&1 | Out-String | Write-Host
    Write-Host "✅ Prisma Client regenerated" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error regenerating Prisma: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Test MongoDB Connection
Write-Host "Step 3: Testing MongoDB connection..." -ForegroundColor Yellow
try {
    $testOutput = npm run test-mongodb 2>&1 | Out-String
    Write-Host $testOutput
    if ($testOutput -match "✅.*Connected") {
        Write-Host "✅ MongoDB connection successful" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Connection test had issues - continuing anyway" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "⚠️  Connection test failed - continuing anyway" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Add Dummy Data
Write-Host "Step 4: Adding dummy data..." -ForegroundColor Yellow
try {
    $dummyOutput = node scripts/add-10-dummy-data.js 2>&1 | Out-String
    Write-Host $dummyOutput
    if ($dummyOutput -match "✅.*successfully") {
        Write-Host "✅ Dummy data added successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Check output above for any errors" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Error adding dummy data: $_" -ForegroundColor Red
    Write-Host "   Check the error message above" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ All Steps Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Test Credentials:" -ForegroundColor White
Write-Host "   Email: dummy1@example.com" -ForegroundColor Yellow
Write-Host "   Password: password123" -ForegroundColor Yellow
Write-Host "   (Same for dummy2@example.com through dummy10@example.com)" -ForegroundColor Gray
Write-Host ""
