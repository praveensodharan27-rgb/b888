-- Create SearchQuery table
CREATE TABLE IF NOT EXISTS "SearchQuery" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "category" TEXT,
    "location" TEXT,
    "filters" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- Create search_alert_settings table
CREATE TABLE IF NOT EXISTS "search_alert_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxEmailsPerUser" INTEGER NOT NULL DEFAULT 5,
    "checkIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "emailSubject" TEXT NOT NULL DEFAULT 'New products matching your search!',
    "emailBody" TEXT NOT NULL DEFAULT '<p>Hi there!</p><p>We found some products matching your recent search: <strong>{{query}}</strong></p>{{products}}<p>Happy shopping!</p>',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_alert_settings_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SearchQuery
CREATE INDEX IF NOT EXISTS "SearchQuery_userId_idx" ON "SearchQuery"("userId");
CREATE INDEX IF NOT EXISTS "SearchQuery_userEmail_idx" ON "SearchQuery"("userEmail");
CREATE INDEX IF NOT EXISTS "SearchQuery_processed_idx" ON "SearchQuery"("processed");
CREATE INDEX IF NOT EXISTS "SearchQuery_createdAt_idx" ON "SearchQuery"("createdAt");

-- Insert default settings
INSERT INTO "search_alert_settings" ("id", "enabled", "maxEmailsPerUser", "checkIntervalHours", "emailSubject", "emailBody", "createdAt", "updatedAt")
VALUES (
    'default_settings_001',
    true,
    5,
    24,
    'New products matching your search!',
    '<p>Hi there!</p><p>We found some exciting products matching your recent search: <strong>{{query}}</strong></p><p>Here are {{count}} products you might be interested in:</p>{{products}}<p style="margin-top: 30px;"><a href="http://localhost:3000" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Browse More Products</a></p><p style="margin-top: 20px; color: #666; font-size: 14px;">Happy shopping on SellIt!</p>',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Verify tables were created
SELECT 'SearchQuery table created' as status WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'SearchQuery'
);

SELECT 'search_alert_settings table created' as status WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'search_alert_settings'
);

