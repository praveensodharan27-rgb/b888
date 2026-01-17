# PowerShell Commands for MongoDB

## ⚠️ Important: PowerShell Syntax

PowerShell **does NOT** use `&&` for chaining commands. Use `;` instead or run commands separately.

## ✅ Correct PowerShell Syntax

### Option 1: Use semicolon (;)
```powershell
cd d:\sellit\backend; npm run update-mongodb-db
```

### Option 2: Run commands separately (Recommended)
```powershell
cd d:\sellit\backend
npm run update-mongodb-db
```

## 🚀 Quick Commands

### Complete MongoDB Database Update
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

**First, navigate to backend:**
```powershell
cd d:\sellit\backend
```

**Then run any command:**
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

## 🔧 PowerShell Command Chaining

### ❌ Wrong (Bash syntax - doesn't work in PowerShell)
```powershell
cd d:\sellit\backend && npm run update-mongodb-db
```

### ✅ Correct (PowerShell syntax)
```powershell
# Option 1: Use semicolon
cd d:\sellit\backend; npm run update-mongodb-db

# Option 2: Separate commands (Recommended)
cd d:\sellit\backend
npm run update-mongodb-db
```

## 🎯 Quick Reference

**Always start with:**
```powershell
cd d:\sellit\backend
```

**Then run your command:**
```powershell
npm run [command-name]
```

## 💡 PowerShell Tips

1. **Use semicolon (;) for chaining:**
   ```powershell
   cd d:\sellit\backend; npm run update-mongodb-db
   ```

2. **Or run separately (easier to read):**
   ```powershell
   cd d:\sellit\backend
   npm run update-mongodb-db
   ```

3. **Check current directory:**
   ```powershell
   pwd
   # or
   Get-Location
   ```

4. **List files in current directory:**
   ```powershell
   ls
   # or
   Get-ChildItem
   ```
