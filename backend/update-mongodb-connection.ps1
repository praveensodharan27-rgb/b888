# Update MongoDB Connection String
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update MongoDB Connection" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop any running Node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Stopped Node.js processes" -ForegroundColor Green
Write-Host ""

# Check .env file
$envPath = ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    "" | Out-File -FilePath $envPath -Encoding utf8
}

$envContent = Get-Content $envPath -Raw

Write-Host "Enter your MongoDB connection string:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Examples:" -ForegroundColor Yellow
Write-Host "  MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority" -ForegroundColor Gray
Write-Host "  Local MongoDB: mongodb://localhost:27017/sellit" -ForegroundColor Gray
Write-Host "  With Auth: mongodb://username:password@localhost:27017/sellit" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Important: If your password has special characters, URL-encode them:" -ForegroundColor Yellow
Write-Host "   @ = %40, # = %23, ! = %21, $ = %24, etc." -ForegroundColor Gray
Write-Host ""

$connectionString = Read-Host "MongoDB Connection String"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "❌ Connection string cannot be empty!" -ForegroundColor Red
    exit 1
}

if (-not ($connectionString -match "mongodb")) {
    Write-Host "❌ Invalid connection string format!" -ForegroundColor Red
    exit 1
}

# Update DATABASE_URL
if ($envContent -match 'DATABASE_URL\s*=') {
    $envContent = $envContent -replace 'DATABASE_URL\s*=.*', "DATABASE_URL=$connectionString"
    Write-Host "✅ Updated DATABASE_URL" -ForegroundColor Green
} else {
    $envContent += "`nDATABASE_URL=$connectionString"
    Write-Host "✅ Added DATABASE_URL" -ForegroundColor Green
}

# Update MONGO_URI
if ($envContent -match 'MONGO_URI\s*=') {
    $envContent = $envContent -replace 'MONGO_URI\s*=.*', "MONGO_URI=$connectionString"
    Write-Host "✅ Updated MONGO_URI" -ForegroundColor Green
} else {
    $envContent += "`nMONGO_URI=$connectionString"
    Write-Host "✅ Added MONGO_URI" -ForegroundColor Green
}

# Write updated .env
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Regenerating Prisma Client..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Remove old Prisma client to avoid lock issues
$prismaClientPath = "node_modules\.prisma\client"
if (Test-Path $prismaClientPath) {
    Write-Host "Removing old Prisma client..." -ForegroundColor Yellow
    Remove-Item -Path $prismaClientPath -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Generate Prisma client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅✅✅ SUCCESS! ✅✅✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test connection:" -ForegroundColor White
    Write-Host "   node -e `"const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.`$connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message));`"" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Start server:" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Prisma generate failed. Please check the error above." -ForegroundColor Red
}
