# Update MongoDB Password in Connection String
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Update MongoDB Password" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will update the MongoDB connection string in .env" -ForegroundColor Yellow
Write-Host "with the correct password for user 'b888'." -ForegroundColor Yellow
Write-Host ""

$envPath = ".env"

# Check if .env exists
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    "" | Out-File -FilePath $envPath -Encoding utf8
}

# Read current .env
$envContent = Get-Content $envPath -Raw

Write-Host "Current MongoDB connection:" -ForegroundColor Cyan
if ($envContent -match "DATABASE_URL=(.*)") {
    $currentUrl = $matches[1].Trim()
    # Mask password in display
    $maskedUrl = $currentUrl -replace "://([^:]+):([^@]+)@", "://`$1:***@"
    Write-Host "  $maskedUrl" -ForegroundColor Gray
} else {
    Write-Host "  Not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Enter the CORRECT password for MongoDB user 'b888':" -ForegroundColor Yellow
Write-Host "(The password you set in MongoDB Atlas → Database Access)" -ForegroundColor Gray
Write-Host ""

$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    Write-Host "❌ Password cannot be empty!" -ForegroundColor Red
    exit 1
}

# URL-encode special characters in password
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

Write-Host ""
Write-Host "⚠️  Special characters in password will be URL-encoded" -ForegroundColor Yellow
Write-Host "   Original: $passwordPlain" -ForegroundColor Gray
Write-Host "   Encoded:  $encodedPassword" -ForegroundColor Gray
Write-Host ""

# Build connection string
$connectionString = "mongodb+srv://b888:${encodedPassword}@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"

# Update DATABASE_URL
if ($envContent -match "DATABASE_URL=") {
    $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$connectionString"
    Write-Host "✅ Updated DATABASE_URL" -ForegroundColor Green
} else {
    $envContent = "DATABASE_URL=$connectionString`n$envContent"
    Write-Host "✅ Added DATABASE_URL" -ForegroundColor Green
}

# Update MONGO_URI
if ($envContent -match "MONGO_URI=") {
    $envContent = $envContent -replace "MONGO_URI=.*", "MONGO_URI=$connectionString"
    Write-Host "✅ Updated MONGO_URI" -ForegroundColor Green
} else {
    $envContent += "`nMONGO_URI=$connectionString`n"
    Write-Host "✅ Added MONGO_URI" -ForegroundColor Green
}

# Write updated .env
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Regenerate Prisma Client:" -ForegroundColor White
Write-Host "   npm run prisma:generate" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test connection:" -ForegroundColor White
Write-Host "   node -e \"require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message));\"" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Start server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
