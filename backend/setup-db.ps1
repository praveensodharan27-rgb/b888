# PowerShell script to setup PostgreSQL database
# Make sure PostgreSQL is installed and running

Write-Host "Setting up PostgreSQL database for SellIt..." -ForegroundColor Green

# Try different connection strings
$connectionStrings = @(
    "postgresql://postgres:root123@localhost:5432/sellit?schema=public",
    "postgresql://root:root123@localhost:5432/sellit?schema=public",
    "postgresql://sellit:root123@localhost:5432/sellit?schema=public"
)

Write-Host "`nPlease ensure PostgreSQL is running and you have created the database." -ForegroundColor Yellow
Write-Host "You can create it using one of these methods:" -ForegroundColor Yellow
Write-Host "`n1. Using psql command line:" -ForegroundColor Cyan
Write-Host "   psql -U postgres" -ForegroundColor White
Write-Host "   CREATE DATABASE sellit;" -ForegroundColor White
Write-Host "   ALTER USER postgres WITH PASSWORD 'root123';" -ForegroundColor White
Write-Host "`n2. Using pgAdmin GUI" -ForegroundColor Cyan
Write-Host "`n3. Update the DATABASE_URL in backend/.env file with your actual credentials" -ForegroundColor Cyan

Write-Host "`nCurrent DATABASE_URL format:" -ForegroundColor Yellow
Write-Host "postgresql://USERNAME:PASSWORD@localhost:5432/sellit?schema=public" -ForegroundColor White

Write-Host "`nAfter creating the database, run:" -ForegroundColor Green
Write-Host "cd backend" -ForegroundColor White
Write-Host "npm run prisma:migrate" -ForegroundColor White

