-- Add neighbourhood column to Location table
-- Run this SQL directly in your database if Prisma migrations are having issues

ALTER TABLE "Location" 
ADD COLUMN IF NOT EXISTS "neighbourhood" TEXT;

-- Add index on state and city for faster queries
CREATE INDEX IF NOT EXISTS "Location_state_city_idx" ON "Location"("state", "city");

-- Note: This migration adds the neighbourhood field to the Location model
-- After running this, restart your backend server

