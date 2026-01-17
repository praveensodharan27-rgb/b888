# Fix Port 5000 - Kill Process Using Port 5000
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Port 5000 Issue" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Method 1: Find and kill process on port 5000
Write-Host "Finding process on port 5000..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $processId = $conn.OwningProcess
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($proc) {
            Write-Host "Found process:" -ForegroundColor Yellow
            Write-Host "  PID: $processId" -ForegroundColor White
            Write-Host "  Name: $($proc.ProcessName)" -ForegroundColor White
            Write-Host "  Path: $($proc.Path)" -ForegroundColor Gray
            
            try {
                Stop-Process -Id $processId -Force
                Write-Host "  ✅ Killed process $processId" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Failed to kill process: $_" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "No process found on port 5000" -ForegroundColor Yellow
}

# Method 2: Kill all Node.js processes
Write-Host "`nKilling all Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            Write-Host "  Killing PID: $($proc.Id) - $($proc.ProcessName)" -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "  ⚠️  Could not kill PID: $($proc.Id)" -ForegroundColor Yellow
        }
    }
    Write-Host "✅ Killed $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Yellow
}

# Wait a moment
Start-Sleep -Seconds 2

# Verify port is free
Write-Host "`nVerifying port 5000 is free..." -ForegroundColor Yellow
$stillInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($stillInUse) {
    Write-Host "⚠️  Port 5000 is still in use!" -ForegroundColor Red
    Write-Host "`nTry these steps:" -ForegroundColor Yellow
    Write-Host "  1. Close all terminal windows" -ForegroundColor White
    Write-Host "  2. Check Task Manager for Node.js processes" -ForegroundColor White
    Write-Host "  3. Restart your computer if needed" -ForegroundColor White
} else {
    Write-Host "✅ Port 5000 is now free!" -ForegroundColor Green
    Write-Host "`nYou can now start your server:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor Yellow
}

Write-Host ""
