#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Safe frontend startup - kills existing Next.js processes first
#>

Write-Host "`n🔍 Checking for existing Next.js processes...`n" -ForegroundColor Cyan

$ports = @(3000, 3001, 3002, 3003, 3004, 3005)
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
                Write-Host "⚠️  Could not kill process $pid" -ForegroundColor Yellow
            }
        }
    }
}

if (-not $killedAny) {
    Write-Host "✅ No existing Next.js processes found" -ForegroundColor Green
}

Write-Host "`n🚀 Starting frontend...`n" -ForegroundColor Cyan

npm run dev
