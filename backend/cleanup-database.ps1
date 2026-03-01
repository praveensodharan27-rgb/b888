# Database Cleanup PowerShell Script
# Quick launcher for database cleanup operations

param(
    [switch]$Preview,
    [switch]$Execute,
    [switch]$Help
)

$scriptPath = "$PSScriptRoot\scripts\cleanup-all-dummy-data.js"

function Show-Help {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        🧹 DATABASE CLEANUP UTILITY                    ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\cleanup-database.ps1 -Preview    # Show what will be deleted (safe)" -ForegroundColor White
    Write-Host "  .\cleanup-database.ps1 -Execute    # Actually delete dummy data" -ForegroundColor White
    Write-Host "  .\cleanup-database.ps1 -Help       # Show this help" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\cleanup-database.ps1 -Preview    # Preview mode (recommended first)" -ForegroundColor Gray
    Write-Host "  .\cleanup-database.ps1 -Execute    # Execute cleanup" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Safety:" -ForegroundColor Yellow
    Write-Host "  ✅ Admin users are NEVER deleted" -ForegroundColor Green
    Write-Host "  ✅ Preview mode shows exactly what will be deleted" -ForegroundColor Green
    Write-Host "  ✅ Backup recommended before execution" -ForegroundColor Green
    Write-Host ""
    Write-Host "What Gets Deleted:" -ForegroundColor Yellow
    Write-Host "  ❌ Users with test/dummy emails" -ForegroundColor Red
    Write-Host "  ❌ Ads with test/dummy titles" -ForegroundColor Red
    Write-Host "  ❌ Test orders (isTestOrder = true)" -ForegroundColor Red
    Write-Host "  ❌ Dummy categories" -ForegroundColor Red
    Write-Host "  ❌ Related data (favorites, notifications, chats)" -ForegroundColor Red
    Write-Host ""
    Write-Host "What Gets Kept:" -ForegroundColor Yellow
    Write-Host "  ✅ All admin users (role = ADMIN)" -ForegroundColor Green
    Write-Host "  ✅ admin@sellit.com" -ForegroundColor Green
    Write-Host "  ✅ All production data" -ForegroundColor Green
    Write-Host ""
}

function Show-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        🧹 DATABASE CLEANUP UTILITY                    ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Run-Preview {
    Show-Banner
    Write-Host "🔍 Running in PREVIEW mode (no data will be deleted)" -ForegroundColor Yellow
    Write-Host ""
    
    node $scriptPath
    
    Write-Host ""
    Write-Host "✅ Preview complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To execute cleanup, run:" -ForegroundColor Yellow
    Write-Host "  .\cleanup-database.ps1 -Execute" -ForegroundColor White
    Write-Host ""
}

function Run-Execute {
    Show-Banner
    Write-Host "⚠️  WARNING: This will PERMANENTLY delete dummy data!" -ForegroundColor Red
    Write-Host ""
    
    # Confirmation
    $confirm = Read-Host "Type 'DELETE' to confirm (or anything else to cancel)"
    
    if ($confirm -ne "DELETE") {
        Write-Host ""
        Write-Host "❌ Cancelled. No data was deleted." -ForegroundColor Yellow
        Write-Host ""
        exit
    }
    
    Write-Host ""
    Write-Host "🔥 Executing cleanup..." -ForegroundColor Red
    Write-Host ""
    
    node $scriptPath --confirm
    
    Write-Host ""
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
    Write-Host ""
}

# Main logic
if ($Help) {
    Show-Help
    exit
}

if ($Execute) {
    Run-Execute
    exit
}

if ($Preview) {
    Run-Preview
    exit
}

# Default: show help
Show-Help
Write-Host "💡 Tip: Start with preview mode to see what will be deleted" -ForegroundColor Cyan
Write-Host "  .\cleanup-database.ps1 -Preview" -ForegroundColor White
Write-Host ""
