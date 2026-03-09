#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Fix CSS cache corruption and start frontend safely
.DESCRIPTION
    Automatically clears .next cache and restarts frontend
    Use this whenever you see CSS parsing errors
#>

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  🔧 CSS Fix & Safe Start" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Stop existing frontend processes
Write-Host "Step 1: Stopping existing frontend..." -ForegroundColor Yellow
$frontendPorts = @(3000, 3001, 3002, 3003, 3004, 3005, 3006)
$stopped = $false

foreach ($port in $frontendPorts) {
    $processes = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    if ($processes) {
        $pids = @()
        $processes | ForEach-Object {
            $line = $_ -replace '\s+', ' '
            $processId = ($line -split ' ')[-1]
            if ($processId -and $processId -match '^\d+$' -and $processId -notin $pids) {
                $pids += $processId
            }
        }
        
        foreach ($processId in $pids) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "   ✓ Stopped process $processId on port $port" -ForegroundColor Green
                $stopped = $true
            } catch {
                Write-Host "   ⚠ Could not stop $processId" -ForegroundColor Yellow
            }
        }
    }
}

if (-not $stopped) {
    Write-Host "   ℹ No frontend processes running" -ForegroundColor Gray
}

Start-Sleep -Seconds 1

# Step 2: Clear build cache
Write-Host "`nStep 2: Clearing build cache..." -ForegroundColor Yellow

if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Cleared .next directory" -ForegroundColor Green
}

if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✓ Cleared node_modules cache" -ForegroundColor Green
}

# Step 3: Verify source CSS is valid
Write-Host "`nStep 3: Validating source CSS..." -ForegroundColor Yellow
if (Test-Path "app\globals.css") {
    $cssContent = Get-Content "app\globals.css" -Raw
    if ($cssContent -match ':hoverbutton') {
        Write-Host "   ❌ ERROR: Invalid :hoverbutton found in source!" -ForegroundColor Red
        Write-Host "   This should not happen. Check app/globals.css" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "   ✓ Source CSS is valid" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠ app/globals.css not found" -ForegroundColor Yellow
}

# Step 4: Start frontend
Write-Host "`nStep 4: Starting frontend..." -ForegroundColor Yellow
Write-Host "   This will take 10-20 seconds...`n" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Cache cleared, starting server..." -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Start npm dev
npm run dev
