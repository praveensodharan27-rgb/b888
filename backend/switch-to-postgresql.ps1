# Switch from MongoDB to PostgreSQL
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Switching to PostgreSQL Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Backup current schema
$schemaPath = "prisma\schema.prisma"
$backupPath = "prisma\schema.mongodb.backup.prisma"

if (Test-Path $schemaPath) {
    Copy-Item $schemaPath $backupPath -Force
    Write-Host "✅ Backed up MongoDB schema to: $backupPath" -ForegroundColor Green
} else {
    Write-Host "❌ Schema file not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: This will convert the schema from MongoDB to PostgreSQL" -ForegroundColor Yellow
Write-Host "   MongoDB-specific types (@db.ObjectId) will need to be changed" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please provide your PostgreSQL connection details:" -ForegroundColor Cyan
Write-Host ""

$host = Read-Host "PostgreSQL Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($host)) { $host = "localhost" }

$port = Read-Host "PostgreSQL Port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($port)) { $port = "5432" }

$database = Read-Host "Database Name (default: sellit)"
if ([string]::IsNullOrWhiteSpace($database)) { $database = "sellit" }

$username = Read-Host "Username (default: postgres)"
if ([string]::IsNullOrWhiteSpace($username)) { $username = "postgres" }

$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$connectionString = "postgresql://${username}:${passwordPlain}@${host}:${port}/${database}?schema=public"

Write-Host ""
Write-Host "Connection string: postgresql://${username}:***@${host}:${port}/${database}" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Continue with PostgreSQL setup? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Read current schema
$schema = Get-Content $schemaPath -Raw

# Change provider
$schema = $schema -replace 'provider\s*=\s*"mongodb"', 'provider = "postgresql"'

# Change ObjectId to UUID or auto-increment (basic conversion)
# Note: This is a basic conversion. You may need to adjust field types manually.
$schema = $schema -replace '@default\(auto\(\)\)\s*@map\("_id"\)\s*@db\.ObjectId', '@default(uuid())'
$schema = $schema -replace '@db\.ObjectId', ''
$schema = $schema -replace '@map\("_id"\)', ''

# Update datasource URL
$schema = $schema -replace '(datasource\s+db\s*\{[^\}]*url\s*=\s*)env\("DATABASE_URL"\)', "`$1env(`"DATABASE_URL`")"

# Write updated schema
Set-Content -Path $schemaPath -Value $schema -NoNewline

Write-Host ""
Write-Host "✅ Schema updated for PostgreSQL" -ForegroundColor Green
Write-Host ""

# Update .env file
$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Update DATABASE_URL
    if ($envContent -match 'DATABASE_URL\s*=') {
        $envContent = $envContent -replace 'DATABASE_URL\s*=.*', "DATABASE_URL=$connectionString"
    } else {
        $envContent += "`nDATABASE_URL=$connectionString"
    }
    
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✅ Updated .env file with PostgreSQL connection" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found. Creating it..." -ForegroundColor Yellow
    "DATABASE_URL=$connectionString" | Out-File -FilePath $envPath -Encoding utf8
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review the schema file and adjust field types if needed" -ForegroundColor White
Write-Host "2. Generate Prisma Client:" -ForegroundColor White
Write-Host "   npx prisma generate" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Create database and run migrations:" -ForegroundColor White
Write-Host "   npx prisma migrate dev --name init" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Start the server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
