-- Add exactLocation column to Ad table
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "exactLocation" TEXT;

