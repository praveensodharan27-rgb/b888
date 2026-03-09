#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clear Next.js build cache and node_modules cache
.DESCRIPTION
    Removes .next and node_modules/.cache to fix CSS build errors
#>

Write-Host "`n🧹 Clearing Next.js Build Cache..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Clear .next directory
if (Test-Path ".next") {
    Write-Host "Removing .next directory..." -ForegroundColor Yellow
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "ℹ .next directory not found" -ForegroundColor Gray
}

# Clear node_modules/.cache
if (Test-Path "node_modules\.cache") {
    Write-Host "Removing node_modules\.cache..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Removed node_modules\.cache" -ForegroundColor Green
} else {
    Write-Host "ℹ node_modules\.cache not found" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✨ Cache cleared successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
