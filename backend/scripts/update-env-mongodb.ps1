# PowerShell script to update .env file with MongoDB connection
$envPath = Join-Path $PSScriptRoot "..\.env"
$mongoUri = "mongodb+srv://b888:Ponkunnam1133!@cluster0.zfcaepv.mongodb.net/?appName=Cluster0"

Write-Host "Updating .env file with MongoDB connection..." -ForegroundColor Cyan

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    # Update DATABASE_URL
    if ($content -match "DATABASE_URL=") {
        $content = $content -replace "DATABASE_URL=.*", "DATABASE_URL=$mongoUri"
        Write-Host "✅ Updated DATABASE_URL" -ForegroundColor Green
    } else {
        $content += "`nDATABASE_URL=$mongoUri`n"
        Write-Host "✅ Added DATABASE_URL" -ForegroundColor Green
    }
    
    # Update MONGO_URI
    if ($content -match "MONGO_URI=") {
        $content = $content -replace "MONGO_URI=.*", "MONGO_URI=$mongoUri"
        Write-Host "✅ Updated MONGO_URI" -ForegroundColor Green
    } else {
        $content += "MONGO_URI=$mongoUri`n"
        Write-Host "✅ Added MONGO_URI" -ForegroundColor Green
    }
    
    # Remove any PostgreSQL URLs
    $content = $content -replace "postgresql://.*", ""
    $content = $content -replace "202\.164\.131\.201:5432", ""
    
    Set-Content -Path $envPath -Value $content -NoNewline
    Write-Host "`n✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host "MongoDB URI: $mongoUri" -ForegroundColor Yellow
} else {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "Creating new .env file..." -ForegroundColor Yellow
    $newContent = @"
DATABASE_URL=$mongoUri
MONGO_URI=$mongoUri
NODE_ENV=development
PORT=5000
"@
    Set-Content -Path $envPath -Value $newContent
    Write-Host "✅ Created .env file with MongoDB connection" -ForegroundColor Green
}

Write-Host "`n⚠️  IMPORTANT: Restart your backend server for changes to take effect!" -ForegroundColor Yellow
