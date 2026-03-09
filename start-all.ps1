#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Production-ready startup script for SellIt Marketplace
.DESCRIPTION
    Kills conflicting processes, validates environment, starts backend and frontend
#>

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  🚀 SellIt Marketplace Startup" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Kill port 5000 processes
Write-Host "Step 1: Checking port 5000..." -ForegroundColor Yellow
$port5000 = netstat -ano | Select-String ":5000" | Select-String "LISTENING"

if ($port5000) {
    Write-Host "⚠️  Port 5000 in use. Killing processes..." -ForegroundColor Yellow
    $pids = @()
    $port5000 | ForEach-Object {
        $line = $_ -replace '\s+', ' '
        $processId = ($line -split ' ')[-1]
        if ($processId -and $processId -match '^\d+$' -and $processId -notin $pids) {
            $pids += $processId
        }
    }
    
    foreach ($processId in $pids) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "   ✅ Killed PID $processId" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Could not kill PID $processId" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "✅ Port 5000 is free" -ForegroundColor Green
}

# Step 2: Validate environment files
Write-Host "`nStep 2: Validating environment..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ backend\.env not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "❌ frontend\.env.local not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment files found" -ForegroundColor Green

# Step 3: Start backend in new window
Write-Host "`nStep 3: Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal
Write-Host "✅ Backend starting on port 5000" -ForegroundColor Green

# Wait for backend to initialize
Write-Host "   Waiting 5 seconds for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 4: Start frontend in new window
Write-Host "`nStep 4: Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal
Write-Host "✅ Frontend starting on port 3000+" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ SERVERS STARTING" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nBackend:  " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Yellow
Write-Host "`nCheck the new terminal windows for logs.`n" -ForegroundColor Gray
