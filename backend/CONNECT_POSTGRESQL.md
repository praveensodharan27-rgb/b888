# Connect to PostgreSQL Database

## Quick Setup

### Option 1: Use the Automated Script

Run the PowerShell script:
```powershell
cd d:\sellit\backend
powershell -ExecutionPolicy Bypass -File .\switch-to-postgresql.ps1
```

### Option 2: Manual Setup

#### Step 1: Create PostgreSQL Database

Connect to PostgreSQL:
```bash
psql -U postgres
```

Create database:
```sql
CREATE DATABASE sellit;
\q
```

#### Step 2: Update Prisma Schema

Edit `backend/prisma/schema.prisma`:

Change:
```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

To:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Step 3: Update Field Types

MongoDB uses `@db.ObjectId` which needs to be changed for PostgreSQL:

**For ID fields**, change from:
```prisma
id String @id @default(auto()) @map("_id") @db.ObjectId
```

To (UUID option):
```prisma
id String @id @default(uuid())
```

Or (Auto-increment option):
```prisma
id Int @id @default(autoincrement())
```

**For foreign key fields**, remove `@db.ObjectId`:
```prisma
userId String @db.ObjectId  // MongoDB
userId String               // PostgreSQL
```

#### Step 4: Update .env File

Add PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sellit?schema=public"
```

Example:
```env
DATABASE_URL="postgresql://postgres:root123@localhost:5432/sellit?schema=public"
```

#### Step 5: Generate Prisma Client

```bash
cd d:\sellit\backend
npx prisma generate
```

#### Step 6: Run Migrations

```bash
npx prisma migrate dev --name init
```

#### Step 7: Start Server

```bash
npm run dev
```

## Connection String Format

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Examples:
- Local: `postgresql://postgres:root123@localhost:5432/sellit?schema=public`
- Remote: `postgresql://user:pass@192.168.1.100:5432/sellit?schema=public`
- Cloud: `postgresql://user:pass@db.example.com:5432/sellit?schema=public`

## Verify Connection

Test the connection:
```bash
npx prisma db pull
```

Or check in Node.js:
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.$connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ Connection failed:', err));
```

## Troubleshooting

### Error: "relation does not exist"
- Run migrations: `npx prisma migrate dev`

### Error: "password authentication failed"
- Check username/password in connection string
- Reset PostgreSQL password: `ALTER USER postgres WITH PASSWORD 'newpassword';`

### Error: "database does not exist"
- Create database: `CREATE DATABASE sellit;`

### Error: "connection refused"
- Check PostgreSQL is running: `pg_isready`
- Check port 5432 is open
- Verify firewall settings

## Quick Test Connection

```powershell
# Test PostgreSQL connection
psql -U postgres -d sellit -c "SELECT version();"
```
