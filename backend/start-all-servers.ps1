# Start All Servers
# This script starts both backend and frontend development servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting All Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Check if ports are already in use
Write-Host "Checking ports..." -ForegroundColor Yellow

$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠️  Port 5000 is already in use!" -ForegroundColor Yellow
    Write-Host "   Backend might already be running, or another process is using it." -ForegroundColor Gray
    Write-Host "   To kill it, run: .\kill-port-5000.ps1" -ForegroundColor Gray
    Write-Host ""
}

if ($port3000) {
    Write-Host "⚠️  Port 3000 is already in use!" -ForegroundColor Yellow
    Write-Host "   Frontend might already be running, or another process is using it." -ForegroundColor Gray
    Write-Host ""
}

# Step 1: Fix DATABASE_URL if needed
Write-Host "Step 1: Checking DATABASE_URL..." -ForegroundColor Yellow
try {
    if (Test-Path "fix-url-simple.js") {
        $fixOutput = node fix-url-simple.js 2>&1
        if ($fixOutput -match "updated" -or $fixOutput -match "correct") {
            Write-Host "   ✅ DATABASE_URL is correct" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ⚠️  Could not check DATABASE_URL" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Regenerate Prisma Client (if needed)
Write-Host "Step 2: Checking Prisma Client..." -ForegroundColor Yellow
try {
    if (-not (Test-Path "node_modules\.prisma\client\index.js")) {
        Write-Host "   Generating Prisma Client..." -ForegroundColor Yellow
        npm run prisma:generate 2>&1 | Out-Null
        Write-Host "   ✅ Prisma Client generated" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Prisma Client exists" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not check Prisma Client" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Start Backend Server
Write-Host "Step 3: Starting Backend Server (Port 5000)..." -ForegroundColor Yellow
Write-Host ""

$backendScript = @"
`$host.ui.RawUI.WindowTitle = 'Sellit Backend Server'
cd '$PWD'
npm run dev
"@

$backendJob = Start-Job -ScriptBlock {
    param($script)
    Invoke-Expression $script
} -ArgumentList $backendScript

Write-Host "   ✅ Backend server starting in background..." -ForegroundColor Green
Write-Host "   📡 Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Step 4: Start Frontend Server
Write-Host "Step 4: Starting Frontend Server (Port 3000)..." -ForegroundColor Yellow
Write-Host ""

$frontendPath = Join-Path $PWD "..\frontend"
if (Test-Path $frontendPath) {
    $frontendScript = @"
`$host.ui.RawUI.WindowTitle = 'Sellit Frontend Server'
cd '$frontendPath'
npm run dev
"@

    $frontendJob = Start-Job -ScriptBlock {
        param($script)
        Invoke-Expression $script
    } -ArgumentList $frontendScript

    Write-Host "   ✅ Frontend server starting in background..." -ForegroundColor Green
    Write-Host "   🌐 Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "   ⚠️  Frontend directory not found at: $frontendPath" -ForegroundColor Yellow
    Write-Host "   Starting backend only..." -ForegroundColor Yellow
    Write-Host ""
}

# Step 5: Show status
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Servers Starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "🌐 Frontend App: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📋 To view server logs:" -ForegroundColor Yellow
Write-Host "   Get-Job | Receive-Job" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 To stop servers:" -ForegroundColor Yellow
Write-Host "   Stop-Job -Id `$backendJob.Id, `$frontendJob.Id" -ForegroundColor Gray
Write-Host "   Remove-Job -Id `$backendJob.Id, `$frontendJob.Id" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tip: Open new terminal windows to see live logs" -ForegroundColor Cyan
Write-Host ""

# Keep script running and show logs
Write-Host "Press Ctrl+C to stop all servers..." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 5
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        
        if ($backendOutput) {
            Write-Host "[Backend] $backendOutput" -ForegroundColor Green
        }
        if ($frontendOutput) {
            Write-Host "[Frontend] $frontendOutput" -ForegroundColor Blue
        }
    }
} catch {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Servers stopped" -ForegroundColor Green
}
