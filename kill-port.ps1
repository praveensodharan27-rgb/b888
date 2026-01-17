# PowerShell script to kill process on port 5000
param(
    [int]$Port = 5000
)

Write-Host "Checking for process on port $Port..."

$processId = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess

if ($processId) {
    Write-Host "Found process $processId using port $Port"
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Killing process: $($process.ProcessName) (PID: $processId)"
        Stop-Process -Id $processId -Force
        Write-Host "Process killed successfully!"
    } else {
        Write-Host "Process not found (may have already terminated)"
    }
} else {
    Write-Host "No process found on port $Port"
}
