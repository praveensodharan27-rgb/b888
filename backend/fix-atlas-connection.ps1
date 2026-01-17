# MongoDB Atlas Connection Fix Script
# Fixes common MongoDB Atlas connectivity issues

Write-Host "`n🔧 MongoDB Atlas Connection Fix`n" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# Step 1: Check .env file
Write-Host "`n📋 Step 1: Checking .env file..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Creating .env file..." -ForegroundColor Yellow
    
    $databaseUrl = Read-Host "Enter your MongoDB Atlas connection string (mongodb+srv://...)"
    "DATABASE_URL=$databaseUrl" | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host "✅ Created .env file" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "DATABASE_URL\s*=") {
        Write-Host "✅ DATABASE_URL is set" -ForegroundColor Green
        
        # Extract connection details (safely)
        if ($envContent -match "mongodb\+srv://([^:]+):([^@]+)@([^/]+)/([^?]+)") {
            $username = $matches[1]
            $hostname = $matches[3]
            $database = $matches[4]
            
            Write-Host "`n   Connection Details:" -ForegroundColor Cyan
            Write-Host "   Username: $username" -ForegroundColor White
            Write-Host "   Host: $hostname" -ForegroundColor White
            Write-Host "   Database: $database" -ForegroundColor White
        }
    } else {
        Write-Host "❌ DATABASE_URL not found in .env" -ForegroundColor Red
        $databaseUrl = Read-Host "Enter your MongoDB Atlas connection string"
        Add-Content -Path $envPath -Value "`nDATABASE_URL=$databaseUrl"
        Write-Host "✅ Added DATABASE_URL" -ForegroundColor Green
    }
}

# Step 2: Instructions
Write-Host "`n📋 Step 2: MongoDB Atlas Checklist" -ForegroundColor Yellow
Write-Host "`nPlease verify the following in MongoDB Atlas Dashboard:" -ForegroundColor White
Write-Host "   1. Cluster Status: https://cloud.mongodb.com → Clusters" -ForegroundColor Cyan
Write-Host "      → Ensure cluster is 'Running' (not paused)" -ForegroundColor Gray
Write-Host "`n   2. Network Access: https://cloud.mongodb.com → Network Access" -ForegroundColor Cyan
Write-Host "      → Click 'Add IP Address'" -ForegroundColor Gray
Write-Host "      → Click 'Add Current IP Address' or allow '0.0.0.0/0' for development" -ForegroundColor Gray
Write-Host "      → Wait 1-2 minutes for changes to apply" -ForegroundColor Gray
Write-Host "`n   3. Database User: https://cloud.mongodb.com → Database Access" -ForegroundColor Cyan
Write-Host "      → Verify user 'b888' exists and has correct password" -ForegroundColor Gray

# Step 3: Test connection
Write-Host "`n📋 Step 3: Testing Connection..." -ForegroundColor Yellow
Write-Host "   Running diagnostic test..." -ForegroundColor Gray

$testScript = Join-Path $PSScriptRoot "diagnose-mongodb.js"
if (Test-Path $testScript) {
    node $testScript
} else {
    Write-Host "   Diagnostic script not found. Run manually:" -ForegroundColor Yellow
    Write-Host "   node diagnose-mongodb.js" -ForegroundColor Cyan
}

# Step 4: Next steps
Write-Host "`n📋 Step 4: Next Steps" -ForegroundColor Yellow
Write-Host "`nAfter fixing MongoDB Atlas:" -ForegroundColor White
Write-Host "   1. Restart your backend server" -ForegroundColor Cyan
Write-Host "   2. Check server logs for connection success" -ForegroundColor Cyan
Write-Host "   3. Test API endpoints" -ForegroundColor Cyan

Write-Host "`n✅ Fix script completed!`n" -ForegroundColor Green





