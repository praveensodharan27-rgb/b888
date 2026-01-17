# Fix Port 5000 Error

## Error Message
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

This means another process is already using port 5000.

## Quick Fix (Automated)

Run the fix script:
```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\fix-port-5000.ps1
```

## Manual Fix (PowerShell)

### Option 1: Kill Process on Port 5000

```powershell
# Find process using port 5000
$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connection) {
    $processId = $connection.OwningProcess
    Write-Host "Killing process $processId"
    Stop-Process -Id $processId -Force
    Write-Host "✅ Done"
} else {
    Write-Host "No process found on port 5000"
}
```

### Option 2: Kill All Node.js Processes

```powershell
# Kill all Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ All Node.js processes stopped"
```

### Option 3: Find and Kill Specific Process

```powershell
# Find the process
$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$processId = $connection.OwningProcess
$process = Get-Process -Id $processId

# Show process info
Write-Host "Process: $($process.ProcessName)"
Write-Host "PID: $processId"
Write-Host "Path: $($process.Path)"

# Kill it
Stop-Process -Id $processId -Force
```

## Manual Fix (Command Prompt)

```cmd
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number from above)
taskkill /PID <PID> /F
```

Example:
```cmd
netstat -ano | findstr :5000
# Output: TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    12345

taskkill /PID 12345 /F
```

## One-Liner Commands

### PowerShell One-Liner
```powershell
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Command Prompt One-Liner
```cmd
for /f "tokens=5" %a in ('netstat -ano ^| findstr :5000') do taskkill /PID %a /F
```

## Verify Port is Free

```powershell
$port = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "⚠️  Port 5000 is still in use"
} else {
    Write-Host "✅ Port 5000 is free"
}
```

## Start Server After Fix

Once port 5000 is free:

```powershell
cd d:\sellit\backend
npm run dev
```

## Prevention

To avoid this issue:
1. Always stop the server with `Ctrl+C` before starting a new one
2. Use the fix script before starting: `.\fix-port-5000.ps1`
3. Check if server is running: `Get-NetTCPConnection -LocalPort 5000`

## Troubleshooting

### Port Still in Use After Killing Process

1. **Wait a few seconds** - Port may take a moment to free up
2. **Check Task Manager** - Look for Node.js processes
3. **Restart computer** - If nothing else works
4. **Change port** - Edit `.env` and set `PORT=5001`

### Can't Kill Process

If you get "Access Denied":
1. Run PowerShell as Administrator
2. Use: `Stop-Process -Id <PID> -Force`

### Multiple Processes

If multiple Node.js processes are running:
```powershell
# See all Node processes
Get-Process node

# Kill all at once
Get-Process node | Stop-Process -Force
```
