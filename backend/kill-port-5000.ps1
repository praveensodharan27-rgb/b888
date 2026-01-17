# Kill Process on Port 5000
Write-Host "Finding and killing process on port 5000..." -ForegroundColor Cyan

# Method 1: Find by port
$connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Found process on port 5000:" -ForegroundColor Yellow
            Write-Host "  PID: $($proc.Id)" -ForegroundColor White
            Write-Host "  Name: $($proc.ProcessName)" -ForegroundColor White
            Write-Host "  Path: $($proc.Path)" -ForegroundColor White
            
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Killed process $($proc.Id)" -ForegroundColor Green
        }
    }
} else {
    Write-Host "No process found on port 5000" -ForegroundColor Yellow
}

# Method 2: Kill all Node.js processes
Write-Host "`nKilling all Node.js processes..." -ForegroundColor Cyan
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "  Killing PID: $($proc.Id)" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Killed $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Yellow
}

# Verify port is free
Start-Sleep -Seconds 1
$stillInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($stillInUse) {
    Write-Host "`n⚠️  Port 5000 is still in use. You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Restart your computer" -ForegroundColor White
    Write-Host "  2. Check for other applications using port 5000" -ForegroundColor White
} else {
    Write-Host "`n✅ Port 5000 is now free!" -ForegroundColor Green
    Write-Host "You can now start your server with: npm run dev" -ForegroundColor Cyan
}
