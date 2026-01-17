# MongoDB URL Setup Script
# This script helps you set up your MongoDB connection URL

Write-Host "=== MongoDB URL Setup ===" -ForegroundColor Cyan
Write-Host ""

# Your MongoDB connection details
$username = "b888"
$cluster = "cluster0.cj9oi8t.mongodb.net"
$databaseName = "sellit"  # Change this to your database name if different

Write-Host "MongoDB Connection Details:" -ForegroundColor Yellow
Write-Host "  Username: $username" -ForegroundColor White
Write-Host "  Cluster: $cluster" -ForegroundColor White
Write-Host "  Database: $databaseName" -ForegroundColor White
Write-Host ""

# Prompt for password
Write-Host "Enter your MongoDB password:" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# URL encode special characters in password
$passwordEncoded = [System.Web.HttpUtility]::UrlEncode($passwordPlain)

# Build MongoDB URL
$mongodbUrl = "mongodb+srv://${username}:${passwordEncoded}@${cluster}/${databaseName}?retryWrites=true&w=majority&appName=SellIt"

Write-Host ""
Write-Host "Generated MongoDB URL:" -ForegroundColor Green
Write-Host $mongodbUrl -ForegroundColor White
Write-Host ""

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot ".env"
$envExists = Test-Path $envPath

if ($envExists) {
    Write-Host "Found existing .env file" -ForegroundColor Yellow
    
    # Read current .env
    $envContent = Get-Content $envPath -Raw
    
    # Check if DATABASE_URL exists
    if ($envContent -match "DATABASE_URL=") {
        Write-Host "Updating existing DATABASE_URL..." -ForegroundColor Yellow
        $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$mongodbUrl"
    } else {
        Write-Host "Adding DATABASE_URL..." -ForegroundColor Yellow
        $envContent += "`n# Database Configuration`nDATABASE_URL=$mongodbUrl`n"
    }
    
    # Write back to file
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✅ Updated .env file" -ForegroundColor Green
} else {
    Write-Host "Creating new .env file..." -ForegroundColor Yellow
    
    # Create .env file with basic configuration
    $envContent = @"
# Environment Variables
NODE_ENV=development
PORT=5000

# Database Configuration
DATABASE_URL=$mongodbUrl

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify your MongoDB Atlas IP whitelist includes your current IP" -ForegroundColor White
Write-Host "  2. Test connection: node test-mongodb-connection.js" -ForegroundColor White
Write-Host "  3. Generate Prisma client: npm run prisma:generate" -ForegroundColor White
Write-Host ""

