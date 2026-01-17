# Fix Prisma Client and Test MongoDB Connection
Write-Host "`n=== Fixing Prisma Client and Testing MongoDB ===`n" -ForegroundColor Cyan

# Step 1: Clear cache
Write-Host "Step 1: Clearing Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared" -ForegroundColor Green
}

# Step 2: Generate Prisma Client
Write-Host "`nStep 2: Generating Prisma Client..." -ForegroundColor Yellow
try {
    $output = & npx prisma generate 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Prisma Client generated successfully" -ForegroundColor Green
    } else {
        Write-Host "  Error generating Prisma Client" -ForegroundColor Red
        Write-Host $output
        exit 1
    }
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Verify Prisma Client exists
Write-Host "`nStep 3: Verifying Prisma Client..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
if (Test-Path "node_modules\@prisma\client\index.js") {
    Write-Host "  Prisma Client exists" -ForegroundColor Green
} else {
    Write-Host "  Prisma Client still missing!" -ForegroundColor Red
    Write-Host "  Trying alternative method..." -ForegroundColor Yellow
    & npm run prisma:generate
    Start-Sleep -Seconds 2
    if (Test-Path "node_modules\@prisma\client\index.js") {
        Write-Host "  Prisma Client generated" -ForegroundColor Green
    } else {
        Write-Host "  Failed to generate Prisma Client" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Test MongoDB connection
Write-Host "`nStep 4: Testing MongoDB connection..." -ForegroundColor Yellow
try {
    $testOutput = & node scripts/test-mongodb-connection-full.js 2>&1 | Out-String
    Write-Host $testOutput
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Green
    } else {
        Write-Host "`nConnection test failed" -ForegroundColor Red
    }
} catch {
    Write-Host "  Error running test: $_" -ForegroundColor Red
}

Write-Host "`n=== Complete ===" -ForegroundColor Cyan
Write-Host "You can now start your server: npm run dev`n" -ForegroundColor White
