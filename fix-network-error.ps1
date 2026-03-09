#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Fix Axios Network Error by restarting backend with MongoDB fallback

.DESCRIPTION
    This script:
    1. Kills all Node.js processes
    2. Verifies Meilisearch is disabled in .env
    3. Restarts backend server
    4. Tests the API endpoint
    5. Provides next steps for the user

.NOTES
    Meilisearch has been temporarily disabled because it contains stale data.
    The API will use MongoDB fallback which has the correct empty state.
#>

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Fix Axios Network Error" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill all Node processes
Write-Host "Step 1: Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   ✅ All Node processes stopped`n" -ForegroundColor Green

# Step 2: Verify Meilisearch is disabled
Write-Host "Step 2: Checking .env configuration..." -ForegroundColor Yellow
$envContent = Get-Content "backend\.env" -Raw
if ($envContent -match "^#\s*MEILISEARCH_HOST" -or $envContent -notmatch "MEILISEARCH_HOST") {
    Write-Host "   ✅ Meilisearch is disabled (using MongoDB fallback)`n" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Meilisearch is still enabled!" -ForegroundColor Yellow
    Write-Host "   Disabling now..." -ForegroundColor Yellow
    
    $envContent = $envContent -replace "MEILISEARCH_HOST=", "# MEILISEARCH_HOST="
    $envContent = $envContent -replace "MEILISEARCH_MASTER_KEY=", "# MEILISEARCH_MASTER_KEY="
    $envContent | Set-Content "backend\.env"
    
    Write-Host "   ✅ Meilisearch disabled`n" -ForegroundColor Green
}

# Step 3: Start backend
Write-Host "Step 3: Starting backend server..." -ForegroundColor Yellow
Write-Host "   Starting in new window..." -ForegroundColor Gray

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm start" -WindowStyle Normal

Write-Host "   ⏳ Waiting 20 seconds for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# Step 4: Check if backend is running
Write-Host "`nStep 4: Verifying backend status..." -ForegroundColor Yellow
$port5000 = netstat -ano | Select-String ":5000" | Select-String "LISTENING"

if ($port5000) {
    Write-Host "   ✅ Backend is running on port 5000`n" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend is not running on port 5000" -ForegroundColor Red
    Write-Host "   Check the backend terminal window for errors`n" -ForegroundColor Yellow
    exit 1
}

# Step 5: Test API endpoint
Write-Host "Step 5: Testing /api/home-feed endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/home-feed?limit=1" -Method GET -UseBasicParsing -TimeoutSec 10
    $json = $response.Content | ConvertFrom-Json
    
    Write-Host "   ✅ API Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   ✅ Success: $($json.success)" -ForegroundColor Green
    Write-Host "   ✅ Ads Count: $($json.ads.Count)" -ForegroundColor Green
    Write-Host "   ✅ Total: $($json.pagination.total)" -ForegroundColor Green
    
    if ($json.fallback) {
        Write-Host "   ✅ Fallback: $($json.fallback)" -ForegroundColor Green
    }
    
    Write-Host ""
    
    if ($json.pagination.total -eq 0) {
        Write-Host "   🎉 PERFECT! Database is empty as expected!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  WARNING: Found $($json.pagination.total) ads (should be 0)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ API test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Backend might still be starting..." -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Open your browser" -ForegroundColor White
Write-Host "2. Go to http://localhost:3000" -ForegroundColor White
Write-Host "3. Press Ctrl + Shift + R (hard refresh)" -ForegroundColor White
Write-Host "4. Or use Incognito mode to test" -ForegroundColor White
Write-Host ""
Write-Host "Expected Result:" -ForegroundColor Yellow
Write-Host "   ✅ Homepage shows 0 ads (empty state)" -ForegroundColor Green
Write-Host "   ✅ No network errors in console" -ForegroundColor Green
Write-Host "   ✅ Console shows detailed request logs" -ForegroundColor Green
Write-Host ""
Write-Host "Debug Console:" -ForegroundColor Yellow
Write-Host "   Open DevTools (F12) → Console tab" -ForegroundColor Gray
Write-Host "   Look for: '🔍 Fetching home feed' and '✅ Home feed response'" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "   See NETWORK_ERROR_FIXED_COMPLETE.md for full details" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================`n" -ForegroundColor Cyan
