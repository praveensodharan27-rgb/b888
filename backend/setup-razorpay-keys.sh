#!/bin/bash

# Razorpay API Keys Setup Script
# This script helps you add Razorpay keys to your .env file

echo "========================================"
echo "Razorpay API Keys Setup"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file"
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

echo ""
echo "📝 Instructions:"
echo "1. Go to: https://dashboard.razorpay.com/"
echo "2. Login or Sign up"
echo "3. Go to Settings → API Keys"
echo "4. Generate Test Key (for development)"
echo "5. Copy Key ID and Key Secret"
echo ""

# Prompt for keys
read -p "Enter Razorpay Key ID (rzp_test_...): " keyId
read -p "Enter Razorpay Key Secret: " keySecret

# Optional webhook secret
echo ""
read -p "Add Webhook Secret? (y/n): " addWebhook
webhookSecret=""
if [ "$addWebhook" = "y" ] || [ "$addWebhook" = "Y" ]; then
    read -p "Enter Webhook Secret: " webhookSecret
fi

# Update .env file
sed -i.bak "s/PAYMENT_GATEWAY_DEV_MODE=.*/PAYMENT_GATEWAY_DEV_MODE=false/" .env
sed -i.bak "s/RAZORPAY_KEY_ID=.*/RAZORPAY_KEY_ID=$keyId/" .env
sed -i.bak "s/RAZORPAY_KEY_SECRET=.*/RAZORPAY_KEY_SECRET=$keySecret/" .env

if [ ! -z "$webhookSecret" ]; then
    if grep -q "RAZORPAY_WEBHOOK_SECRET=" .env; then
        sed -i.bak "s/RAZORPAY_WEBHOOK_SECRET=.*/RAZORPAY_WEBHOOK_SECRET=$webhookSecret/" .env
    else
        echo "RAZORPAY_WEBHOOK_SECRET=$webhookSecret" >> .env
    fi
fi

# Remove backup file
rm -f .env.bak

echo ""
echo "✅ Razorpay keys added to .env file!"
echo ""
echo "📋 Summary:"
echo "  Key ID: $keyId"
echo "  Key Secret: ${keySecret:0:10}..."
if [ ! -z "$webhookSecret" ]; then
    echo "  Webhook Secret: Added"
fi
echo ""
echo "🔄 Restart your server to apply changes:"
echo "   npm run dev"
echo ""
echo "🧪 Test the setup:"
echo "   curl http://localhost:5000/api/payment-gateway/status"
echo ""


