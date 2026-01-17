# Fix DATABASE_URL in .env file
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing DATABASE_URL in .env" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envPath = ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envPath -Raw

# Find DATABASE_URL
if ($envContent -match "DATABASE_URL=(.*)") {
    $currentUrl = $matches[1].Trim()
    # Remove quotes
    $currentUrl = $currentUrl -replace '^["'']|["'']$', ''
    
    Write-Host "Current DATABASE_URL:" -ForegroundColor Yellow
    Write-Host "  $currentUrl" -ForegroundColor Gray
    Write-Host ""
    
    # Check if it starts with mongodb:// or mongodb+srv://
    if (-not ($currentUrl -match "^mongodb(\+srv)?://")) {
        Write-Host "❌ DATABASE_URL does not start with mongodb:// or mongodb+srv://" -ForegroundColor Red
        Write-Host "   Fixing...`n" -ForegroundColor Yellow
        
        # Fix the URL
        $fixedUrl = $currentUrl
        if (-not ($fixedUrl -match "://")) {
            # Missing protocol - add mongodb+srv:// for Atlas or mongodb:// for local
            if ($fixedUrl -match "@cluster" -or $fixedUrl -match "\.mongodb\.net") {
                $fixedUrl = "mongodb+srv://" + $fixedUrl
                Write-Host "   ✅ Added mongodb+srv:// protocol" -ForegroundColor Green
            } else {
                $fixedUrl = "mongodb://" + $fixedUrl
                Write-Host "   ✅ Added mongodb:// protocol" -ForegroundColor Green
            }
        }
        
        # Update .env
        $envContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=`"$fixedUrl`""
        
        # Update MONGO_URI too
        if ($envContent -match "MONGO_URI=") {
            $envContent = $envContent -replace "MONGO_URI=.*", "MONGO_URI=`"$fixedUrl`""
        } else {
            $envContent += "`nMONGO_URI=`"$fixedUrl`"`n"
        }
        
        Set-Content -Path $envPath -Value $envContent -NoNewline
        
        Write-Host "   ✅ Updated .env file`n" -ForegroundColor Green
        Write-Host "New DATABASE_URL:" -ForegroundColor Green
        Write-Host "  $fixedUrl`n" -ForegroundColor Gray
    } else {
        Write-Host "✅ DATABASE_URL already has correct protocol`n" -ForegroundColor Green
    }
} else {
    Write-Host "❌ DATABASE_URL not found in .env" -ForegroundColor Red
    Write-Host "   Adding default MongoDB Atlas connection...`n" -ForegroundColor Yellow
    
    $defaultUrl = "mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"
    $envContent += "`nDATABASE_URL=`"$defaultUrl`"`n"
    $envContent += "MONGO_URI=`"$defaultUrl`"`n"
    
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✅ Added DATABASE_URL to .env`n" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Regenerate Prisma Client:" -ForegroundColor White
Write-Host "   npm run prisma:generate" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Test connection:" -ForegroundColor White
Write-Host "   npm run test-mongodb" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Add dummy data:" -ForegroundColor White
Write-Host "   npm run add-dummy-data" -ForegroundColor Yellow
Write-Host ""
