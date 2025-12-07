-- Add table for managing auth page settings (login/signup images and text)

CREATE TABLE IF NOT EXISTS "AuthPageSettings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "page" TEXT NOT NULL UNIQUE, -- 'login' or 'signup'
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "tagline" TEXT,
  "imageUrl" TEXT,
  "backgroundColor" TEXT DEFAULT '#1e293b',
  "stats" JSONB,
  "features" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings for login page
INSERT INTO "AuthPageSettings" ("id", "page", "title", "subtitle", "tagline", "imageUrl", "backgroundColor", "stats")
VALUES (
  gen_random_uuid()::text,
  'login',
  'SellIt.',
  'Buy & Sell Anything Today',
  'Welcome Back!',
  'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=2187&auto=format&fit=crop',
  '#6b21a8',
  '{"listings": "1000+", "users": "500+", "categories": "50+"}'::jsonb
)
ON CONFLICT (page) DO NOTHING;

-- Insert default settings for signup page
INSERT INTO "AuthPageSettings" ("id", "page", "title", "subtitle", "tagline", "imageUrl", "backgroundColor", "features")
VALUES (
  gen_random_uuid()::text,
  'signup',
  'SellIt.',
  'Join thousands of buyers and sellers',
  'Start Selling Today!',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
  '#ea580c',
  '["Easy to use", "100% Secure", "Quick setup"]'::jsonb
)
ON CONFLICT (page) DO NOTHING;

