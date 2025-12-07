# PostgreSQL Setup Instructions

## Step 1: Install PostgreSQL (if not installed)

Download from: https://www.postgresql.org/download/windows/

During installation:
- Remember the password you set for the `postgres` user
- Note the installation directory (usually `C:\Program Files\PostgreSQL\XX\`)

## Step 2: Add PostgreSQL to PATH (Optional but Recommended)

1. Find your PostgreSQL installation directory (e.g., `C:\Program Files\PostgreSQL\15\bin`)
2. Add it to Windows PATH:
   - Right-click "This PC" → Properties
   - Advanced System Settings → Environment Variables
   - Edit "Path" under System Variables
   - Add: `C:\Program Files\PostgreSQL\15\bin` (replace 15 with your version)

## Step 3: Create Database

### Method A: Using pgAdmin (Easiest)

1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your server (enter password if prompted)
3. Right-click "Databases" → Create → Database
4. Name: `sellit`
5. Click Save

### Method B: Using Command Prompt

1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory:
   ```cmd
   cd "C:\Program Files\PostgreSQL\15\bin"
   ```
3. Create database:
   ```cmd
   psql -U postgres -c "CREATE DATABASE sellit;"
   ```
4. Set password (if needed):
   ```cmd
   psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'root123';"
   ```

### Method C: Using psql Interactive

1. Open Command Prompt
2. Navigate to PostgreSQL bin:
   ```cmd
   cd "C:\Program Files\PostgreSQL\15\bin"
   ```
3. Connect:
   ```cmd
   psql -U postgres
   ```
4. Run SQL commands:
   ```sql
   CREATE DATABASE sellit;
   ALTER USER postgres WITH PASSWORD 'root123';
   \q
   ```

## Step 4: Update Backend Configuration

Edit `backend/.env` file:

```env
DATABASE_URL="postgresql://postgres:root123@localhost:5432/sellit?schema=public"
```

**Important:** 
- Replace `postgres` with your actual PostgreSQL username if different
- Replace `root123` with your actual password if different
- Replace `5432` with your PostgreSQL port if different (default is 5432)

## Step 5: Run Database Migrations

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

This will create all the tables in your database.

## Step 6: Verify Setup

Test the connection:

```bash
cd backend
npm run prisma:studio
```

This opens a web interface to view your database.

## Troubleshooting

### "psql is not recognized"
- Add PostgreSQL bin directory to PATH (see Step 2)
- Or use full path: `"C:\Program Files\PostgreSQL\15\bin\psql.exe"`

### "Authentication failed"
- Check username and password in DATABASE_URL
- Verify PostgreSQL service is running (Services → postgresql-x64-XX)

### "Connection refused"
- Ensure PostgreSQL service is running
- Check if port 5432 is correct
- Verify firewall settings

### "Database does not exist"
- Create the database first (see Step 3)
- Check database name spelling

## Quick Test Connection

After setup, test with:

```bash
cd backend
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => console.log('Connected!')).catch(e => console.error('Error:', e.message));"
```

