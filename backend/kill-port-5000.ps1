#!/usr/bin/env pwsh
# Kill all processes using port 5000
# Run this before starting the backend if you get EADDRINUSE error

Write-Host "`n🔍 Checking for processes on port 5000..." -ForegroundColor Cyan

$processes = netstat -ano | Select-String ":5000" | Select-String "LISTENING"

if ($processes) {
    Write-Host "⚠️  Found process(es) using port 5000" -ForegroundColor Yellow
    
    $processIds = @()
    $processes | ForEach-Object {
        $line = $_ -replace '\s+', ' '
        $pid = ($line -split ' ')[-1]
        if ($pid -and $pid -match '^\d+$' -and $pid -notin $processIds) {
            $processIds += $pid
        }
    }
    
    Write-Host "📋 PIDs: $($processIds -join ', ')" -ForegroundColor Yellow
    Write-Host "🔪 Killing process(es)...`n" -ForegroundColor Yellow
    
    foreach ($pid in $processIds) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "   ✅ Killed process $pid" -ForegroundColor Green
        }
        catch {
            Write-Host "   ⚠️  Could not kill process $pid" -ForegroundColor Red
        }
    }
    
    # Wait a moment for ports to be released
    Start-Sleep -Seconds 1
    
    # Verify port is free
    $check = netstat -ano | Select-String ":5000" | Select-String "LISTENING"
    if ($check) {
        Write-Host "`n⚠️  Port 5000 still in use. Try again or restart your computer." -ForegroundColor Red
    }
    else {
        Write-Host "`n✅ Port 5000 is now free!" -ForegroundColor Green
        Write-Host "You can now run: npm start" -ForegroundColor Cyan
    }
}
else {
    Write-Host "✅ Port 5000 is already free" -ForegroundColor Green
    Write-Host "You can run: npm start" -ForegroundColor Cyan
}

Write-Host ""
