#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clear Next.js build cache and node_modules cache
.DESCRIPTION
    Run this script if you encounter CSS parsing errors or build issues
    Removes .next and node_modules/.cache directories
#>

Write-Host "`n🧹 Clearing Next.js Build Cache..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$cleared = $false

# Remove .next directory
if (Test-Path ".next") {
    Write-Host "Removing .next directory..." -ForegroundColor Yellow
    try {
        Remove-Item -Path ".next" -Recurse -Force -ErrorAction Stop
        Write-Host "✓ Removed .next directory" -ForegroundColor Green
        $cleared = $true
    } catch {
        Write-Host "⚠ Could not remove .next: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ .next directory not found (already clean)" -ForegroundColor Gray
}

# Remove node_modules/.cache
if (Test-Path "node_modules\.cache") {
    Write-Host "Removing node_modules\.cache..." -ForegroundColor Yellow
    try {
        Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction Stop
        Write-Host "✓ Removed node_modules\.cache" -ForegroundColor Green
        $cleared = $true
    } catch {
        Write-Host "⚠ Could not remove cache: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ node_modules\.cache not found (already clean)" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Green
if ($cleared) {
    Write-Host "✨ Cache cleared successfully!" -ForegroundColor Green
} else {
    Write-Host "✨ No cache to clear (already clean)" -ForegroundColor Green
}
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
