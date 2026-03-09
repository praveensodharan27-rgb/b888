# 🚀 Ranking System Setup - Alternative Method (No Server Restart)

## Problem
The `rankingScore` field doesn't exist in your database yet, and the backend server is currently running (which locks Prisma client generation).

## Solution Options

### Option 1: Quick Fix (Restart Server - Recommended)

1. **Stop the backend server** (Terminal 22 - press Ctrl+C)

2. **Generate Prisma client:**
```bash
cd backend
npx prisma generate --schema=prisma/schema.mongodb.prisma
```

3. **Add ranking fields to database:**
```bash
npm run add-ranking-fields
```

4. **Initialize Meilisearch:**
```bash
npm run init-ranking
```

5. **Restart backend server:**
```bash
npm run dev
```

6. **Reindex to Meilisearch:**
```bash
npm run reindex-meilisearch
```

---

### Option 2: Manual MongoDB Update (No Restart)

If you can't stop the server, manually add fields using MongoDB:

```bash
cd backend
node scripts/manual-add-ranking-fields.js
```

Let me create this script for you...

