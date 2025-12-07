# Fix Migration Error P3006

## Error
```
Error: P3006
Migration `20251126141049_make_referral_code_required` failed to apply cleanly to the shadow database.
Error: ERROR: relation "User_referralCode_key" already exists
```

## Cause

The unique index `User_referralCode_key` was already created in a previous migration (`20251126140809_add_referral_system`), but the migration `20251126141049_make_referral_code_required` is trying to create it again.

## Solution Applied

Updated the migration file to check if the index exists before creating it:

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'User_referralCode_key' 
        AND tablename = 'User'
    ) THEN
        CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode") WHERE "referralCode" IS NOT NULL;
    END IF;
END $$;
```

## How to Fix

### Option 1: Run Migration Again (Recommended)

```bash
cd backend
npx prisma migrate dev
```

The migration should now work because it checks if the index exists first.

### Option 2: Mark Migration as Applied

If the index already exists in your database, you can mark the migration as applied:

```bash
cd backend
npx prisma migrate resolve --applied 20251126141049_make_referral_code_required
```

Then continue with other migrations:
```bash
npx prisma migrate dev
```

### Option 3: Reset Migrations (Only if safe)

If you're in development and can reset the database:

```bash
cd backend
npx prisma migrate reset
```

**Warning:** This will delete all data!

## Verification

Check if the index exists:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'User' 
AND indexname = 'User_referralCode_key';
```

## Prevention

To prevent similar issues in the future:
1. Always check if constraints/indexes exist before creating them
2. Use conditional SQL blocks (`DO $$ ... END $$;`) for idempotent migrations
3. Review migration files before applying them

---

**Status:** ✅ Fixed
**Migration File:** `backend/prisma/migrations/20251126141049_make_referral_code_required/migration.sql`
