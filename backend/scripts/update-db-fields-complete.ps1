# Complete Database Fields Update Script
# Generates Prisma Client and updates all database fields

Write-Host "`n=== Complete Database Fields Update ===`n" -ForegroundColor Cyan

# Step 1: Generate Prisma Client
Write-Host "Step 1: Generating Prisma Client..." -ForegroundColor Yellow
try {
    $output = & npm run prisma:generate 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Prisma Client generated" -ForegroundColor Green
    } else {
        Write-Host "  Error generating Prisma Client" -ForegroundColor Red
        Write-Host "  Trying alternative method..." -ForegroundColor Yellow
        & npx prisma generate
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Failed to generate Prisma Client" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Wait for generation to complete
Write-Host "`nStep 2: Verifying Prisma Client..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
if (Test-Path "node_modules\.prisma\client\index.js") {
    Write-Host "  Prisma Client verified" -ForegroundColor Green
} else {
    Write-Host "  Prisma Client still missing!" -ForegroundColor Red
    Write-Host "  Please run: npm run prisma:generate" -ForegroundColor Yellow
    exit 1
}

# Step 3: Update database fields
Write-Host "`nStep 3: Updating database fields..." -ForegroundColor Yellow
try {
    $output = & node scripts/update-all-db-fields.js 2>&1 | Out-String
    Write-Host $output
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=== Update Complete! ===" -ForegroundColor Green
    } else {
        Write-Host "`nUpdate completed with warnings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All done! You can now start your server: npm run dev`n" -ForegroundColor Cyan
