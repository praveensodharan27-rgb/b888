# Quick Database Setup

## For PostgreSQL with password "root123"

### 1. Create Database (Choose one method)

**Using pgAdmin (Recommended):**
- Open pgAdmin
- Right-click "Databases" → Create → Database
- Name: `sellit` → Save

**Using Command Line:**
```bash
# If psql is in PATH:
psql -U postgres -c "CREATE DATABASE sellit;"
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'root123';"

# Or use full path:
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE sellit;"
```

### 2. Update backend/.env

Make sure this line exists:
```env
DATABASE_URL="postgresql://postgres:root123@localhost:5432/sellit?schema=public"
```

### 3. Run Migrations

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 4. Test Connection

```bash
cd backend
npm run check-db
```

This will verify your database connection and show if tables are created.

### 5. Start Backend

```bash
cd backend
npm run dev
```

The server should start on http://localhost:5000

## If You Get Errors

1. **"Authentication failed"** → Check username/password in DATABASE_URL
2. **"Database does not exist"** → Create database first (step 1)
3. **"Connection refused"** → Make sure PostgreSQL service is running
4. **"psql not found"** → Use pgAdmin or add PostgreSQL to PATH

## Verify PostgreSQL is Running

- Open Services (Win+R → services.msc)
- Look for "postgresql-x64-XX" service
- Make sure it's "Running"

