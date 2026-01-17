# Port Management Scripts

Quick helper scripts to manage processes on development ports.

## Usage

### Kill process on any port:
```powershell
.\kill-port.ps1 5000
.\kill-port.ps1 3000
```

### Quick scripts for common ports:
```powershell
# Kill backend server (port 5000)
.\kill-port-5000.ps1

# Kill frontend server (port 3000)
.\kill-port-3000.ps1

# Kill both servers
.\kill-all-ports.ps1
```

## Manual Commands

If you prefer to run commands manually:

```powershell
# Find process on port 5000
netstat -ano | findstr ":5000"

# Kill specific process
taskkill /F /PID <PID_NUMBER>
```

## Alternative: Using PowerShell natively

You can also use PowerShell to find and kill processes:

```powershell
# Find and kill process on port 5000
$port = 5000
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connection) {
    Stop-Process -Id $connection.OwningProcess -Force
    Write-Host "Killed process on port $port"
} else {
    Write-Host "No process found on port $port"
}
```

