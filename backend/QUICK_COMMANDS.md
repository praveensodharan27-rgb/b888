# Quick MongoDB Commands

## ⚠️ Important: Always run from `backend` directory!

All npm commands must be run from the `backend` folder:

```powershell
cd d:\sellit\backend
```

## 🚀 Quick Commands

### Complete MongoDB Database Update (Recommended)
```powershell
cd d:\sellit\backend
npm run update-mongodb-db
```

### Update Database Fields Only
```powershell
cd d:\sellit\backend
npm run update-db-fields
```

### Update MongoDB Connection Strings
```powershell
cd d:\sellit\backend
npm run update-mongodb
```

### Test MongoDB Connection
```powershell
cd d:\sellit\backend
npm run test-mongodb
```

### Generate Prisma Client
```powershell
cd d:\sellit\backend
npm run prisma:generate
```

## 📋 All Available Commands

From `d:\sellit\backend` directory:

```powershell
# MongoDB Setup
npm run update-mongodb-db        # Complete database update
npm run update-db-fields         # Update all database fields
npm run update-mongodb           # Update connection strings
npm run test-mongodb             # Test connection
npm run setup-mongodb            # Setup MongoDB
npm run setup-db                 # Setup database
npm run setup-db-full            # Complete database setup

# Prisma
npm run prisma:generate          # Generate Prisma Client
npm run prisma:studio            # Open Prisma Studio

# Database Management
npm run db-manager               # Interactive database manager
npm run db-full                  # Full database management
npm run verify-migration         # Verify migration

# Seeding
npm run seed-all-categories      # Seed categories
npm run seed-locations           # Seed locations
npm run create-admin            # Create admin user

# Server
npm run dev                      # Start development server
npm run start                    # Start production server
```

## 🔧 Troubleshooting

### Error: Could not read package.json
**Solution:** Make sure you're in the `backend` directory:
```powershell
cd d:\sellit\backend
```

### Error: Cannot find module '@prisma/client'
**Solution:** Generate Prisma Client first:
```powershell
cd d:\sellit\backend
npm run prisma:generate
```

### Error: Connection timeout
**Solution:** Check MongoDB connection:
```powershell
cd d:\sellit\backend
npm run test-mongodb
```

## 📝 Quick Reference

**Always start with:**
```powershell
cd d:\sellit\backend
```

**Then run your command:**
```powershell
npm run [command-name]
```
