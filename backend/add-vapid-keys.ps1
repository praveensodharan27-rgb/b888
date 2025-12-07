# Script to add VAPID keys to .env file
$envFile = ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file first." -ForegroundColor Yellow
    exit 1
}

$vapidPublicKey = "VAPID_PUBLIC_KEY=BMrnOgRlOVSF05zeIczXkB81LEf3zR4yrZNAmTiBPWnZ_mWInEfhDByvTnQXnG--SG8RiOTlJjVxvo7E0gk7D9w"
$vapidPrivateKey = "VAPID_PRIVATE_KEY=_Z6Wd1FtZGbFCRdmRBp-0LEL9Z-eYW62QhDWh2DKMc0"
$vapidSubject = "VAPID_SUBJECT=mailto:support@sellit.com"

# Read existing .env file
$envContent = Get-Content $envFile -Raw

# Check if VAPID keys already exist
if ($envContent -match "VAPID_PUBLIC_KEY") {
    Write-Host "⚠️  VAPID keys already exist in .env file" -ForegroundColor Yellow
    Write-Host "Updating existing keys..." -ForegroundColor Cyan
    
    # Remove existing VAPID lines
    $envContent = $envContent -replace "VAPID_PUBLIC_KEY=.*", ""
    $envContent = $envContent -replace "VAPID_PRIVATE_KEY=.*", ""
    $envContent = $envContent -replace "VAPID_SUBJECT=.*", ""
    
    # Remove extra blank lines
    $envContent = $envContent -replace "`n`n`n+", "`n`n"
}

# Add VAPID keys
$envContent += "`n# Push Notifications (VAPID Keys)`n"
$envContent += "$vapidPublicKey`n"
$envContent += "$vapidPrivateKey`n"
$envContent += "$vapidSubject`n"

# Write back to file
$envContent | Set-Content $envFile -NoNewline

Write-Host "✅ VAPID keys added to .env file!" -ForegroundColor Green
Write-Host "`n⚠️  Restart the backend server for changes to take effect." -ForegroundColor Yellow

