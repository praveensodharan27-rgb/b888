#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Kill all Node.js processes on ports 3000-3010 and 5000
#>

Write-Host "`n🔪 Killing all dev server processes...`n" -ForegroundColor Yellow

$ports = @(3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 5000)
$killedAny = $false

foreach ($port in $ports) {
    $processes = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    
    if ($processes) {
        $pids = @()
        $processes | ForEach-Object {
            $line = $_ -replace '\s+', ' '
            $pid = ($line -split ' ')[-1]
            if ($pid -and $pid -match '^\d+$' -and $pid -notin $pids) {
                $pids += $pid
            }
        }
        
        foreach ($pid in $pids) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host "✅ Killed process $pid on port $port" -ForegroundColor Green
                $killedAny = $true
            } catch {
                Write-Host "⚠️  Could not kill process $pid on port $port" -ForegroundColor Yellow
            }
        }
    }
}

if (-not $killedAny) {
    Write-Host "✅ No processes found on ports 3000-3010, 5000" -ForegroundColor Green
}

Write-Host "`n✅ Done`n" -ForegroundColor Green
