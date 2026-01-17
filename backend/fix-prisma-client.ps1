# Fix Prisma Client Generation
Write-Host "`n=== Fixing Prisma Client ===`n" -ForegroundColor Cyan

# Step 1: Check current state
Write-Host "Step 1: Checking current state..." -ForegroundColor Yellow
$clientExists = Test-Path "node_modules\@prisma\client\index.js"
if ($clientExists) {
    Write-Host "  Prisma Client exists" -ForegroundColor Green
} else {
    Write-Host "  Prisma Client MISSING" -ForegroundColor Red
}

# Step 2: Clear cache
Write-Host "`nStep 2: Clearing Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared" -ForegroundColor Green
}

# Step 3: Verify schema
Write-Host "`nStep 3: Verifying schema..." -ForegroundColor Yellow
$schema = Get-Content "prisma\schema.prisma" -Raw
if ($schema -match 'provider\s*=\s*"mongodb"') {
    Write-Host "  Schema is MongoDB ✓" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Schema is not MongoDB!" -ForegroundColor Red
    exit 1
}

# Step 4: Generate Prisma Client
Write-Host "`nStep 4: Generating Prisma Client..." -ForegroundColor Yellow
$output = & npx prisma generate --schema=./prisma/schema.prisma 2>&1
Write-Host $output

# Step 5: Verify generation
Write-Host "`nStep 5: Verifying generation..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$clientExists = Test-Path "node_modules\@prisma\client\index.js"
if ($clientExists) {
    Write-Host "  ✅ Prisma Client generated successfully!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Prisma Client still missing!" -ForegroundColor Red
    Write-Host "  Trying alternative method..." -ForegroundColor Yellow
    & npm run prisma:generate
    Start-Sleep -Seconds 2
    $clientExists = Test-Path "node_modules\@prisma\client\index.js"
    if ($clientExists) {
        Write-Host "  ✅ Prisma Client generated!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Still missing. Please check Prisma installation." -ForegroundColor Red
        exit 1
    }
}

# Step 6: Test import
Write-Host "`nStep 6: Testing Prisma Client import..." -ForegroundColor Yellow
$testResult = & node -e "try { const {PrismaClient} = require('@prisma/client'); console.log('SUCCESS'); } catch(e) { console.log('ERROR:', e.message); process.exit(1); }" 2>&1
Write-Host $testResult
if ($testResult -match "SUCCESS") {
    Write-Host "  ✅ Import test passed!" -ForegroundColor Green
} else {
    Write-Host "  ❌ Import test failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Fix Complete! ===" -ForegroundColor Green
Write-Host "You can now start your server with: npm run dev`n" -ForegroundColor Cyan
