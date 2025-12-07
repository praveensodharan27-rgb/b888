# PostgreSQL Database Setup Guide

## Quick Setup

### Option 1: Using psql Command Line

1. Open Command Prompt or PowerShell
2. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
   (Enter password when prompted, or press Enter if no password)

3. Create the database:
   ```sql
   CREATE DATABASE sellit;
   ```

4. Set password for postgres user (if needed):
   ```sql
   ALTER USER postgres WITH PASSWORD 'root123';
   ```

5. Exit psql:
   ```sql
   \q
   ```

### Option 2: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name: `sellit`
5. Click "Save"

### Option 3: Using Command Line (One-liner)

```bash
psql -U postgres -c "CREATE DATABASE sellit;"
```

## Update Backend Configuration

Edit `backend/.env` file and set:

```env
DATABASE_URL="postgresql://postgres:root123@localhost:5432/sellit?schema=public"
```

**Note:** Replace `postgres` with your actual PostgreSQL username if different.

## Run Database Migrations

After creating the database:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

This will:
- Generate Prisma Client
- Create all database tables
- Set up relationships

## Verify Connection

Test the connection:

```bash
cd backend
npm run prisma:studio
```

This opens Prisma Studio where you can view and manage your database.

## Common Issues

### Authentication Failed
- Check if PostgreSQL is running
- Verify username and password in DATABASE_URL
- Make sure the database exists

### Connection Refused
- Ensure PostgreSQL service is running
- Check if port 5432 is correct
- Verify firewall settings

### Database Does Not Exist
- Create the database first (see steps above)
- Check database name spelling

## Default Connection Strings

- **Default postgres user:** `postgresql://postgres:root123@localhost:5432/sellit?schema=public`
- **Custom user:** `postgresql://your_username:root123@localhost:5432/sellit?schema=public`

