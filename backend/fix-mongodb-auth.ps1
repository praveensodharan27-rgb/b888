# Fix MongoDB Authentication Error
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix MongoDB Authentication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "The error 'SCRAM failure: bad auth' means your MongoDB" -ForegroundColor Yellow
Write-Host "credentials are incorrect. Let's update them." -ForegroundColor Yellow
Write-Host ""

# Check if .env exists
$envPath = ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  .env file not found. Creating it..." -ForegroundColor Yellow
    "" | Out-File -FilePath $envPath -Encoding utf8
}

# Read current .env
$envContent = Get-Content $envPath -Raw

Write-Host "Current MongoDB connection options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. MongoDB Atlas (Cloud)" -ForegroundColor White
Write-Host "2. Local MongoDB" -ForegroundColor White
Write-Host "3. Update existing connection string" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "MongoDB Atlas Connection:" -ForegroundColor Green
        Write-Host ""
        Write-Host "Get your connection string from MongoDB Atlas:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://cloud.mongodb.com" -ForegroundColor White
        Write-Host "2. Click 'Connect' on your cluster" -ForegroundColor White
        Write-Host "3. Choose 'Connect your application'" -ForegroundColor White
        Write-Host "4. Copy the connection string" -ForegroundColor White
        Write-Host ""
        Write-Host "Format: mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE" -ForegroundColor Gray
        Write-Host ""
        
        $connectionString = Read-Host "Paste your MongoDB Atlas connection string"
        
        if ($connectionString -match "mongodb\+srv://") {
            # Update .env
            if ($envContent -match 'DATABASE_URL\s*=') {
                $envContent = $envContent -replace 'DATABASE_URL\s*=.*', "DATABASE_URL=$connectionString"
            } else {
                $envContent += "`nDATABASE_URL=$connectionString"
            }
            
            if ($envContent -match 'MONGO_URI\s*=') {
                $envContent = $envContent -replace 'MONGO_URI\s*=.*', "MONGO_URI=$connectionString"
            } else {
                $envContent += "`nMONGO_URI=$connectionString"
            }
            
            Set-Content -Path $envPath -Value $envContent -NoNewline
            Write-Host ""
            Write-Host "✅ Updated .env with MongoDB Atlas connection" -ForegroundColor Green
        } else {
            Write-Host "❌ Invalid connection string format!" -ForegroundColor Red
            exit 1
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Local MongoDB Connection:" -ForegroundColor Green
        Write-Host ""
        
        $host = Read-Host "MongoDB Host (default: localhost)"
        if ([string]::IsNullOrWhiteSpace($host)) { $host = "localhost" }
        
        $port = Read-Host "MongoDB Port (default: 27017)"
        if ([string]::IsNullOrWhiteSpace($port)) { $port = "27017" }
        
        $database = Read-Host "Database Name (default: sellit)"
        if ([string]::IsNullOrWhiteSpace($database)) { $database = "sellit" }
        
        $username = Read-Host "Username (leave empty if no auth)"
        $password = ""
        
        if (-not [string]::IsNullOrWhiteSpace($username)) {
            $passwordSecure = Read-Host "Password" -AsSecureString
            $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure))
        }
        
        if ([string]::IsNullOrWhiteSpace($username)) {
            $connectionString = "mongodb://${host}:${port}/${database}"
        } else {
            $connectionString = "mongodb://${username}:${password}@${host}:${port}/${database}"
        }
        
        # Update .env
        if ($envContent -match 'DATABASE_URL\s*=') {
            $envContent = $envContent -replace 'DATABASE_URL\s*=.*', "DATABASE_URL=$connectionString"
        } else {
            $envContent += "`nDATABASE_URL=$connectionString"
        }
        
        if ($envContent -match 'MONGO_URI\s*=') {
            $envContent = $envContent -replace 'MONGO_URI\s*=.*', "MONGO_URI=$connectionString"
        } else {
            $envContent += "`nMONGO_URI=$connectionString"
        }
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        Write-Host ""
        Write-Host "✅ Updated .env with local MongoDB connection" -ForegroundColor Green
        Write-Host "Connection: $connectionString" -ForegroundColor Gray
    }
    "3" {
        Write-Host ""
        Write-Host "Update Connection String:" -ForegroundColor Green
        Write-Host ""
        
        $connectionString = Read-Host "Enter your MongoDB connection string"
        
        if ($connectionString -match "mongodb") {
            # Update .env
            if ($envContent -match 'DATABASE_URL\s*=') {
                $envContent = $envContent -replace 'DATABASE_URL\s*=.*', "DATABASE_URL=$connectionString"
            } else {
                $envContent += "`nDATABASE_URL=$connectionString"
            }
            
            if ($envContent -match 'MONGO_URI\s*=') {
                $envContent = $envContent -replace 'MONGO_URI\s*=.*', "MONGO_URI=$connectionString"
            } else {
                $envContent += "`nMONGO_URI=$connectionString"
            }
            
            Set-Content -Path $envPath -Value $envContent -NoNewline
            Write-Host ""
            Write-Host "✅ Updated .env with new connection string" -ForegroundColor Green
        } else {
            Write-Host "❌ Invalid connection string format!" -ForegroundColor Red
            exit 1
        }
    }
    default {
        Write-Host "❌ Invalid option" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Regenerate Prisma Client:" -ForegroundColor White
Write-Host "   npx prisma generate" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test the connection:" -ForegroundColor White
Write-Host "   node -e \"const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message));\"" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Restart your server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
