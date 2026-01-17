# Final MongoDB Fix Script
# This will completely fix Prisma for MongoDB

Write-Host "`n=== Final MongoDB Configuration Fix ===`n" -ForegroundColor Cyan

# Step 1: Update .env
Write-Host "Step 1: Updating .env file..." -ForegroundColor Yellow
$mongoUri = "mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"
$envFile = ".env"

if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $newContent = @()
    $updated = $false
    
    foreach ($line in $content) {
        if ($line -match '^DATABASE_URL=') {
            $newContent += "DATABASE_URL=$mongoUri"
            $updated = $true
        } elseif ($line -match '^MONGO_URI=') {
            $newContent += "MONGO_URI=$mongoUri"
            $updated = $true
        } else {
            $newContent += $line
        }
    }
    
    if (-not $updated) {
        $newContent += "DATABASE_URL=$mongoUri"
        $newContent += "MONGO_URI=$mongoUri"
    }
    
    $newContent | Set-Content $envFile
    Write-Host "  .env file updated" -ForegroundColor Green
} else {
    Write-Host "  Creating .env file..." -ForegroundColor Yellow
    @("DATABASE_URL=$mongoUri", "MONGO_URI=$mongoUri") | Set-Content $envFile
    Write-Host "  .env file created" -ForegroundColor Green
}

# Step 2: Verify schema
Write-Host "`nStep 2: Verifying Prisma schema..." -ForegroundColor Yellow
$schema = Get-Content "prisma\schema.prisma" -Raw

if ($schema -match 'datasource\s+db\s*\{[^}]*provider\s*=\s*"postgresql"') {
    Write-Host "  ERROR: Schema still has PostgreSQL!" -ForegroundColor Red
    Write-Host "  Fixing schema..." -ForegroundColor Yellow
    $schema = $schema -replace 'provider\s*=\s*"postgresql"', 'provider = "mongodb"'
    Set-Content "prisma\schema.prisma" $schema -NoNewline
    Write-Host "  Schema fixed" -ForegroundColor Green
} elseif ($schema -match 'provider\s*=\s*"mongodb"') {
    Write-Host "  Schema is MongoDB" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Could not verify schema provider" -ForegroundColor Yellow
}

# Step 3: Delete all Prisma cache
Write-Host "`nStep 3: Clearing Prisma cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue
    Write-Host "  Cache cleared" -ForegroundColor Green
}
if (Test-Path "node_modules\@prisma\client") {
    Remove-Item -Recurse -Force "node_modules\@prisma\client" -ErrorAction SilentlyContinue
    Write-Host "  Client cleared" -ForegroundColor Green
}

# Step 4: Regenerate
Write-Host "`nStep 4: Regenerating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to generate" -ForegroundColor Red
    exit 1
}

# Step 5: Test
Write-Host "`nStep 5: Testing connection..." -ForegroundColor Yellow
node scripts/check-mongodb-ready.js

Write-Host "`n=== Fix Complete! ===" -ForegroundColor Green
Write-Host "`nYou can now start your server:" -ForegroundColor Cyan
Write-Host "  npm run dev`n" -ForegroundColor White
