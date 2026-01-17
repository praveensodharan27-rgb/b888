# MongoDB Migration - Quick Start

## 🚀 Fast Migration (5 minutes)

### Step 1: Run Setup Script

```bash
cd backend
npm install mongodb@^6.3.0
node scripts/setup-mongodb.js
```

This will:
- ✅ Update your `.env` file with MongoDB connection
- ✅ Generate Prisma Client for MongoDB
- ✅ Test the connection

### Step 2: Migrate Data (if you have PostgreSQL data)

```bash
# Set PostgreSQL URL temporarily in .env
POSTGRES_DATABASE_URL=postgresql://user:pass@localhost:5432/sellit

# Run migration
npm run migrate-to-mongodb
```

### Step 3: Start Your Server

```bash
npm run dev
```

### Step 4: Test

```bash
curl http://localhost:5000/api/health
```

## ✅ Done!

Your application is now using MongoDB with:
- ✅ Same data structures
- ✅ Same API endpoints
- ✅ Same field names
- ✅ All existing data migrated

## 📖 Need More Details?

See `MONGODB_MIGRATION_GUIDE.md` for complete documentation.

## 🔧 Troubleshooting

**Connection failed?**
- Check MongoDB connection string in `.env`
- Verify MongoDB Atlas cluster is running
- Check IP whitelist in MongoDB Atlas

**Prisma errors?**
```bash
npm run prisma:generate
```

**Migration issues?**
- Verify both PostgreSQL and MongoDB connections work
- Check you have read/write permissions
- Review migration script output for specific errors
