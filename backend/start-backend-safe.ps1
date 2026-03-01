#!/usr/bin/env pwsh
# Safe backend startup script - kills existing processes first

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  🚀 Starting Backend Server (Safe Mode)" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill existing processes on port 5000
Write-Host "Step 1: Checking port 5000..." -ForegroundColor Yellow
$processes = netstat -ano | Select-String ":5000" | Select-String "LISTENING"

if ($processes) {
    Write-Host "⚠️  Found existing process(es) on port 5000" -ForegroundColor Yellow
    
    $processIds = @()
    $processes | ForEach-Object {
        $line = $_ -replace '\s+', ' '
        $pid = ($line -split ' ')[-1]
        if ($pid -and $pid -match '^\d+$' -and $pid -notin $processIds) {
            $processIds += $pid
        }
    }
    
    Write-Host "   Killing PIDs: $($processIds -join ', ')" -ForegroundColor Yellow
    
    foreach ($pid in $processIds) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "   ✅ Killed process $pid" -ForegroundColor Green
        }
        catch {
            Write-Host "   ⚠️  Could not kill process $pid (may already be stopped)" -ForegroundColor Red
        }
    }
    
    Write-Host "   Waiting for port to be released..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}
else {
    Write-Host "✅ Port 5000 is free" -ForegroundColor Green
}

# Step 2: Verify port is free
Write-Host "`nStep 2: Verifying port 5000..." -ForegroundColor Yellow
$check = netstat -ano | Select-String ":5000" | Select-String "LISTENING"

if ($check) {
    Write-Host "❌ ERROR: Port 5000 is still in use!" -ForegroundColor Red
    Write-Host "   Try running this script again or restart your computer." -ForegroundColor Red
    Write-Host ""
    exit 1
}
else {
    Write-Host "✅ Port 5000 is available" -ForegroundColor Green
}

# Step 3: Start backend server
Write-Host "`nStep 3: Starting backend server..." -ForegroundColor Yellow
Write-Host ""

npm start
