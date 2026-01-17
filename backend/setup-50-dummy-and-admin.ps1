# Setup 50 Dummy Data + Admin User
# This script creates 50 dummy users, 50 dummy ads, and an admin user

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup 50 Dummy Data + Admin User" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Step 1: Fix DATABASE_URL if needed
Write-Host "Step 1: Checking DATABASE_URL..." -ForegroundColor Yellow
try {
    $fixOutput = node fix-url-simple.js 2>&1
    Write-Host $fixOutput
    Write-Host ""
} catch {
    Write-Host "⚠️  Warning: Could not check DATABASE_URL" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Regenerate Prisma Client
Write-Host "Step 2: Regenerating Prisma Client..." -ForegroundColor Yellow
try {
    npm run prisma:generate 2>&1 | Out-String | Write-Host
    Write-Host "✅ Prisma Client regenerated" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  Warning: Prisma generation had issues" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Check if categories exist
Write-Host "Step 3: Checking categories..." -ForegroundColor Yellow
try {
    $catCheck = node -e "require('dotenv').config(); const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.category.count().then(c => { console.log(c > 0 ? 'Categories exist' : 'No categories'); p.`$disconnect(); });" 2>&1
    if ($catCheck -match "No categories") {
        Write-Host "⚠️  No categories found. Seeding categories first..." -ForegroundColor Yellow
        npm run seed-all-categories 2>&1 | Out-String | Write-Host
        Write-Host ""
    } else {
        Write-Host "✅ Categories exist" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "⚠️  Could not check categories, continuing..." -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Create 50 dummy data + admin
Write-Host "Step 4: Creating 50 dummy data entries + admin user..." -ForegroundColor Yellow
Write-Host ""
try {
    $output = node scripts/add-50-dummy-data-and-admin.js 2>&1 | Out-String
    Write-Host $output
    
    if ($output -match "✅.*successfully") {
        Write-Host "✅ Dummy data and admin created successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Check output above for any errors" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "   Check the error message above" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Setup Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Login Credentials:" -ForegroundColor White
Write-Host "   Admin:" -ForegroundColor Yellow
Write-Host "     Email: admin@sellit.com" -ForegroundColor Gray
Write-Host "     Password: admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "   Regular Users:" -ForegroundColor Yellow
Write-Host "     Email: dummy1@example.com (through dummy50@example.com)" -ForegroundColor Gray
Write-Host "     Password: password123" -ForegroundColor Gray
Write-Host ""
