# Update .env file to use MongoDB
$envFile = Join-Path $PSScriptRoot ".env"
$mongoUri = "mongodb+srv://b888:Ponkunnam4433!@cluster0.zfcaepv.mongodb.net/olx_app?retryWrites=true&w=majority&appName=Cluster0"

Write-Host "Updating .env file with MongoDB connection..." -ForegroundColor Cyan

if (Test-Path $envFile) {
    $content = Get-Content $envFile
    $updated = $false
    $newContent = @()
    
    foreach ($line in $content) {
        if ($line -match '^DATABASE_URL=') {
            $newContent += "DATABASE_URL=$mongoUri"
            $updated = $true
            Write-Host "  Updated DATABASE_URL" -ForegroundColor Green
        } elseif ($line -match '^MONGO_URI=') {
            $newContent += "MONGO_URI=$mongoUri"
            $updated = $true
            Write-Host "  Updated MONGO_URI" -ForegroundColor Green
        } else {
            $newContent += $line
        }
    }
    
    # Add MONGO_URI if it doesn't exist
    if ($newContent -notmatch '^MONGO_URI=') {
        $newContent += "MONGO_URI=$mongoUri"
        Write-Host "  Added MONGO_URI" -ForegroundColor Green
    }
    
    # Ensure DATABASE_URL exists
    if ($newContent -notmatch '^DATABASE_URL=') {
        $newContent = @("DATABASE_URL=$mongoUri") + $newContent
        Write-Host "  Added DATABASE_URL" -ForegroundColor Green
    }
    
    $newContent | Set-Content $envFile
    Write-Host "`n✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host "   MongoDB URI: $($mongoUri.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host "`n⚠️  IMPORTANT: Restart your server for changes to take effect!" -ForegroundColor Yellow
} else {
    Write-Host "❌ .env file not found at: $envFile" -ForegroundColor Red
    Write-Host "   Creating new .env file..." -ForegroundColor Yellow
    @(
        "DATABASE_URL=$mongoUri",
        "MONGO_URI=$mongoUri",
        "",
        "NODE_ENV=development",
        "PORT=5000"
    ) | Set-Content $envFile
    Write-Host "✅ Created .env file with MongoDB configuration" -ForegroundColor Green
}
