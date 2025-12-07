-- Add state, city, neighbourhood columns to Ad table
-- Run this SQL directly in your database if Prisma migrations are having issues

ALTER TABLE "Ad" 
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "neighbourhood" TEXT;

-- Add indexes for faster filtering by location
CREATE INDEX IF NOT EXISTS "Ad_state_idx" ON "Ad"("state");
CREATE INDEX IF NOT EXISTS "Ad_city_idx" ON "Ad"("city");
CREATE INDEX IF NOT EXISTS "Ad_state_city_idx" ON "Ad"("state", "city");

-- Note: This migration adds state, city, and neighbourhood fields to the Ad model
-- After running this, restart your backend server

