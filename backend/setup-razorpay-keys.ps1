# Razorpay API Keys Setup Script
# This script helps you add Razorpay keys to your .env file

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Razorpay API Keys Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created .env file" -ForegroundColor Green
    } else {
        Write-Host "❌ .env.example not found. Please create .env manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📝 Instructions:" -ForegroundColor Cyan
Write-Host "1. Go to: https://dashboard.razorpay.com/" -ForegroundColor White
Write-Host "2. Login or Sign up" -ForegroundColor White
Write-Host "3. Go to Settings → API Keys" -ForegroundColor White
Write-Host "4. Generate Test Key (for development)" -ForegroundColor White
Write-Host "5. Copy Key ID and Key Secret" -ForegroundColor White
Write-Host ""

# Prompt for keys
$keyId = Read-Host "Enter Razorpay Key ID (rzp_test_...) "
$keySecret = Read-Host "Enter Razorpay Key Secret "

# Optional webhook secret
Write-Host ""
$addWebhook = Read-Host "Add Webhook Secret? (y/n) "
$webhookSecret = ""
if ($addWebhook -eq "y" -or $addWebhook -eq "Y") {
    $webhookSecret = Read-Host "Enter Webhook Secret "
}

# Read .env file
$envContent = Get-Content ".env" -Raw

# Update or add Razorpay keys
$envContent = $envContent -replace "PAYMENT_GATEWAY_DEV_MODE=.*", "PAYMENT_GATEWAY_DEV_MODE=false"
$envContent = $envContent -replace "RAZORPAY_KEY_ID=.*", "RAZORPAY_KEY_ID=$keyId"
$envContent = $envContent -replace "RAZORPAY_KEY_SECRET=.*", "RAZORPAY_KEY_SECRET=$keySecret"

if ($webhookSecret) {
    if ($envContent -match "RAZORPAY_WEBHOOK_SECRET=") {
        $envContent = $envContent -replace "RAZORPAY_WEBHOOK_SECRET=.*", "RAZORPAY_WEBHOOK_SECRET=$webhookSecret"
    } else {
        $envContent += "`nRAZORPAY_WEBHOOK_SECRET=$webhookSecret"
    }
}

# Write back to .env
Set-Content ".env" -Value $envContent -NoNewline

Write-Host ""
Write-Host "✅ Razorpay keys added to .env file!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  Key ID: $keyId" -ForegroundColor White
Write-Host "  Key Secret: $($keySecret.Substring(0, [Math]::Min(10, $keySecret.Length)))..." -ForegroundColor White
if ($webhookSecret) {
    Write-Host "  Webhook Secret: Added" -ForegroundColor White
}
Write-Host ""
Write-Host "🔄 Restart your server to apply changes:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test the setup:" -ForegroundColor Cyan
Write-Host "   curl http://localhost:5000/api/payment-gateway/status" -ForegroundColor White
Write-Host ""


