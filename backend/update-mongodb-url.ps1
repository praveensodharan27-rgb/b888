# Quick MongoDB URL Update Script
# Updates DATABASE_URL in .env file with your MongoDB connection string

param(
    [Parameter(Mandatory=$false)]
    [string]$Password = "",
    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "sellit"
)

Write-Host "=== MongoDB URL Update ===" -ForegroundColor Cyan
Write-Host ""

$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "Please create it first or run setup-mongodb-url.ps1" -ForegroundColor Yellow
    exit 1
}

# MongoDB connection details
$username = "b888"
$cluster = "cluster0.cj9oi8t.mongodb.net"

Write-Host "MongoDB Connection Details:" -ForegroundColor Yellow
Write-Host "  Username: $username" -ForegroundColor White
Write-Host "  Cluster: $cluster" -ForegroundColor White
Write-Host "  Database: $DatabaseName" -ForegroundColor White
Write-Host ""

# Get password if not provided
if ([string]::IsNullOrEmpty($Password)) {
    Write-Host "Enter your MongoDB password:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    )
}

# URL encode password
$passwordEncoded = [System.Web.HttpUtility]::UrlEncode($Password)

# Build MongoDB URL
$mongodbUrl = "mongodb+srv://${username}:${passwordEncoded}@${cluster}/${DatabaseName}?retryWrites=true&w=majority&appName=SellIt"

Write-Host ""
Write-Host "New MongoDB URL:" -ForegroundColor Green
Write-Host $mongodbUrl -ForegroundColor White
Write-Host ""

# Read .env file
$envContent = Get-Content $envPath -Raw

# Update or add DATABASE_URL
if ($envContent -match "DATABASE_URL\s*=") {
    $envContent = $envContent -replace "DATABASE_URL\s*=.*", "DATABASE_URL=$mongodbUrl"
    Write-Host "✅ Updated DATABASE_URL in .env" -ForegroundColor Green
} else {
    # Add DATABASE_URL if it doesn't exist
    if (-not $envContent.EndsWith("`n")) {
        $envContent += "`n"
    }
    $envContent += "DATABASE_URL=$mongodbUrl`n"
    Write-Host "✅ Added DATABASE_URL to .env" -ForegroundColor Green
}

# Also update MONGO_URI if it exists
if ($envContent -match "MONGO_URI\s*=") {
    $envContent = $envContent -replace "MONGO_URI\s*=.*", "MONGO_URI=$mongodbUrl"
    Write-Host "✅ Updated MONGO_URI in .env" -ForegroundColor Green
}

# Write back to file
Set-Content -Path $envPath -Value $envContent -NoNewline

Write-Host ""
Write-Host "✅ MongoDB URL updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test connection: node test-mongodb-connection.js" -ForegroundColor White
Write-Host "  2. Generate Prisma client: npm run prisma:generate" -ForegroundColor White
Write-Host ""

