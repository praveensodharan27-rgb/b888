# Delete All Data (Except Admin) - PowerShell Wrapper

param(
    [switch]$Preview,
    [switch]$Execute,
    [switch]$Help
)

$scriptPath = "$PSScriptRoot\scripts\delete-all-except-admin.js"

function Show-Help {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║     ⚠️  DELETE ALL DATA (EXCEPT ADMIN) ⚠️            ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  WARNING: This deletes ALL users and posts!" -ForegroundColor Red
    Write-Host "✅ SAFE: Admin users are preserved" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\delete-all-data.ps1 -Preview    # Show what will be deleted (SAFE)" -ForegroundColor White
    Write-Host "  .\delete-all-data.ps1 -Execute    # Actually delete data (DANGEROUS)" -ForegroundColor White
    Write-Host "  .\delete-all-data.ps1 -Help       # Show this help" -ForegroundColor White
    Write-Host ""
    Write-Host "What Will Be Deleted:" -ForegroundColor Yellow
    Write-Host "  ❌ 2,669 users (all non-admin)" -ForegroundColor Red
    Write-Host "  ❌ 1,795 ads (ALL ads)" -ForegroundColor Red
    Write-Host "  ❌ All favorites, notifications, chats" -ForegroundColor Red
    Write-Host "  ❌ All orders, payments, wallets" -ForegroundColor Red
    Write-Host "  ❌ Total: 6,420+ records" -ForegroundColor Red
    Write-Host ""
    Write-Host "What Will Be Kept:" -ForegroundColor Yellow
    Write-Host "  ✅ admin@sellit.com [ADMIN]" -ForegroundColor Green
    Write-Host "  ✅ meetmee09@gmail.com [USER]" -ForegroundColor Green
    Write-Host "  ✅ All categories" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  THIS CANNOT BE UNDONE!" -ForegroundColor Red
    Write-Host "⚠️  BACKUP YOUR DATABASE FIRST!" -ForegroundColor Red
    Write-Host ""
}

function Show-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║     ⚠️  DELETE ALL DATA (EXCEPT ADMIN) ⚠️            ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
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
    Write-Host "⚠️  To execute deletion, run:" -ForegroundColor Yellow
    Write-Host "  .\delete-all-data.ps1 -Execute" -ForegroundColor White
    Write-Host ""
}

function Run-Execute {
    Show-Banner
    Write-Host "⚠️  WARNING: This will PERMANENTLY delete ALL data!" -ForegroundColor Red
    Write-Host ""
    Write-Host "What will be deleted:" -ForegroundColor Yellow
    Write-Host "  ❌ 2,669 users (all non-admin)" -ForegroundColor Red
    Write-Host "  ❌ 1,795 ads (ALL ads)" -ForegroundColor Red
    Write-Host "  ❌ All related data" -ForegroundColor Red
    Write-Host ""
    Write-Host "What will be kept:" -ForegroundColor Yellow
    Write-Host "  ✅ 2 admin users" -ForegroundColor Green
    Write-Host "  ✅ All categories" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  THIS CANNOT BE UNDONE!" -ForegroundColor Red
    Write-Host ""
    
    # First confirmation
    $confirm1 = Read-Host "Type 'DELETE ALL' to confirm (or anything else to cancel)"
    
    if ($confirm1 -ne "DELETE ALL") {
        Write-Host ""
        Write-Host "❌ Cancelled. No data was deleted." -ForegroundColor Yellow
        Write-Host ""
        exit
    }
    
    Write-Host ""
    Write-Host "⚠️  FINAL CONFIRMATION" -ForegroundColor Red
    Write-Host "Did you backup your database?" -ForegroundColor Yellow
    $confirm2 = Read-Host "Type 'YES' to proceed (or anything else to cancel)"
    
    if ($confirm2 -ne "YES") {
        Write-Host ""
        Write-Host "❌ Cancelled. No data was deleted." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Backup command:" -ForegroundColor Cyan
        Write-Host '  mongodump --uri="YOUR_URI" --out="./backup"' -ForegroundColor White
        Write-Host ""
        exit
    }
    
    Write-Host ""
    Write-Host "🔥 Executing deletion..." -ForegroundColor Red
    Write-Host ""
    
    node $scriptPath --confirm
    
    Write-Host ""
    Write-Host "✅ Deletion complete!" -ForegroundColor Green
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
Write-Host "  .\delete-all-data.ps1 -Preview" -ForegroundColor White
Write-Host ""
