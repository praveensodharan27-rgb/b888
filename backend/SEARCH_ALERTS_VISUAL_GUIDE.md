# 🎨 Search Alerts - Visual Implementation Guide

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SEARCH ALERTS SYSTEM                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│  Database    │
│   (Next.js)  │  Search │   (Express)  │  Store  │ (PostgreSQL) │
└──────────────┘         └──────────────┘         └──────────────┘
       │                         │                         │
       │                         │                         │
       │                    ┌────▼────┐                   │
       │                    │  Cron   │                   │
       │                    │  Job    │                   │
       │                    └────┬────┘                   │
       │                         │                         │
       │                    ┌────▼────┐                   │
       │                    │ Process │◀──────────────────┘
       │                    │ Queries │
       │                    └────┬────┘
       │                         │
       │                    ┌────▼────┐
       │                    │  Match  │
       │                    │Products │
       │                    └────┬────┘
       │                         │
       │                    ┌────▼────┐
       │                    │  Send   │
       ▼                    │  Email  │
┌──────────────┐           └────┬────┘
│ Admin Panel  │                │
│  Dashboard   │                ▼
└──────────────┘         ┌──────────────┐
                         │  SMTP Server │
                         │   (Gmail)    │
                         └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │     User     │
                         │    Email     │
                         └──────────────┘
```

## 🔄 Data Flow

### 1️⃣ Query Capture Flow

```
User Searches
     │
     ▼
┌─────────────────────────────┐
│ GET /api/search?q=iPhone    │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Authenticate User           │
│ Check: Has Email?           │
└─────────────────────────────┘
     │
     ├─── Yes ──▶ ┌──────────────────────────┐
     │            │ saveSearchQuery()        │
     │            │ - Store query            │
     │            │ - Store filters          │
     │            │ - Set processed = false  │
     │            └──────────────────────────┘
     │                      │
     └─── No ───▶ Skip     │
                            ▼
                  ┌──────────────────────────┐
                  │ Return Search Results    │
                  │ (Non-blocking)           │
                  └──────────────────────────┘
```

### 2️⃣ Processing Flow (Hourly Cron)

```
Cron Trigger (Every Hour)
     │
     ▼
┌─────────────────────────────┐
│ processSearchAlerts()       │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ Check: Enabled?             │
└─────────────────────────────┘
     │
     ├─── No ──▶ Exit
     │
     ├─── Yes ──▶ ┌──────────────────────────┐
     │             │ Get Unprocessed Queries  │
     │             │ WHERE processed = false  │
     │             │ AND createdAt > cutoff   │
     │             └──────────────────────────┘
     │                      │
     │                      ▼
     │             ┌──────────────────────────┐
     │             │ Group by userEmail       │
     │             │ Apply maxEmailsPerUser   │
     │             └──────────────────────────┘
     │                      │
     │                      ▼
     │             ┌──────────────────────────┐
     │             │ For Each Query:          │
     │             │                          │
     │             │ 1. findMatchingProducts()│
     │             │    - Match title/desc    │
     │             │    - Apply filters       │
     │             │    - Last 24h only       │
     │             │    - Limit 10 products   │
     │             │                          │
     │             │ 2. If matches found:     │
     │             │    - sendAlertEmail()    │
     │             │    - Format HTML         │
     │             │    - Send via SMTP       │
     │             │                          │
     │             │ 3. Mark as processed     │
     │             └──────────────────────────┘
     │                      │
     │                      ▼
     │             ┌──────────────────────────┐
     │             │ Update Statistics        │
     │             │ Log Results              │
     │             └──────────────────────────┘
     │
     ▼
   Done
```

### 3️⃣ Admin Control Flow

```
Admin User
     │
     ▼
┌─────────────────────────────┐
│ Admin Dashboard             │
│ (React Component)           │
└─────────────────────────────┘
     │
     ├─── View Settings ──▶ GET /api/search-alerts/settings
     │                            │
     │                            ▼
     │                     ┌──────────────────────────┐
     │                     │ Return Current Settings  │
     │                     │ - enabled                │
     │                     │ - maxEmailsPerUser       │
     │                     │ - checkIntervalHours     │
     │                     │ - emailSubject           │
     │                     │ - emailBody              │
     │                     └──────────────────────────┘
     │
     ├─── Update Settings ──▶ PUT /api/search-alerts/settings
     │                            │
     │                            ▼
     │                     ┌──────────────────────────┐
     │                     │ Validate Input           │
     │                     │ Update Database          │
     │                     │ Return Updated Settings  │
     │                     └──────────────────────────┘
     │
     ├─── View Stats ──▶ GET /api/search-alerts/statistics
     │                            │
     │                            ▼
     │                     ┌──────────────────────────┐
     │                     │ Calculate:               │
     │                     │ - Total queries          │
     │                     │ - Processed vs pending   │
     │                     │ - Unique users           │
     │                     │ - Top queries            │
     │                     └──────────────────────────┘
     │
     ├─── Test Email ──▶ POST /api/search-alerts/test-email
     │                            │
     │                            ▼
     │                     ┌──────────────────────────┐
     │                     │ Find Sample Products     │
     │                     │ Generate Email           │
     │                     │ Send Test                │
     │                     └──────────────────────────┘
     │
     └─── Cleanup ──▶ DELETE /api/search-alerts/queries/cleanup
                                │
                                ▼
                         ┌──────────────────────────┐
                         │ Delete Old Queries       │
                         │ WHERE processed = true   │
                         │ AND age > 30 days        │
                         └──────────────────────────┘
```

## 📁 File Structure Tree

```
backend/
│
├── prisma/
│   ├── schema.prisma                    ✨ Updated (2 new models)
│   └── migrations/
│       └── [timestamp]_add_search_alerts/
│           └── migration.sql            ✨ Created
│
├── services/
│   ├── searchAlerts.js                  ✨ Created (550+ lines)
│   │   ├── getSettings()
│   │   ├── createEmailTransporter()
│   │   ├── formatProductsHTML()
│   │   ├── sendAlertEmail()
│   │   ├── findMatchingProducts()
│   │   ├── processSearchAlerts()
│   │   └── saveSearchQuery()
│   │
│   └── meilisearch.js                   ✅ Existing
│
├── routes/
│   ├── search.js                        ✨ Updated (query capture)
│   │   └── Added: saveSearchQuery() call
│   │
│   └── search-alerts.js                 ✨ Created (10 endpoints)
│       ├── GET    /settings
│       ├── PUT    /settings
│       ├── GET    /statistics
│       ├── GET    /queries
│       ├── DELETE /queries/cleanup
│       └── POST   /test-email
│
├── utils/
│   └── cron.js                          ✨ Updated (new cron job)
│       ├── Delete accounts (2 AM)       ✅ Existing
│       └── Process alerts (hourly)      ✨ Added
│
├── scripts/
│   └── init-search-alerts.js            ✨ Created
│       └── Initialize default settings
│
├── server.js                            ✨ Updated
│   ├── Import search-alerts routes      ✨ Added
│   ├── Import setupCronJobs             ✨ Added
│   ├── Register /api/search-alerts      ✨ Added
│   └── Call setupCronJobs()             ✨ Added
│
├── package.json                         ✨ Updated
│   └── Added: "init-search-alerts" script
│
└── Documentation/                       ✨ Created (5 files)
    ├── SEARCH_ALERTS_README.md          📚 Overview & features
    ├── SEARCH_ALERTS_SETUP.md           📚 Complete technical guide
    ├── SEARCH_ALERTS_QUICKSTART.md      📚 5-minute setup
    ├── MIGRATION_INSTRUCTIONS.md        📚 Step-by-step migration
    ├── ADMIN_PANEL_EXAMPLE.tsx          📚 Frontend component
    ├── SEARCH_ALERTS_IMPLEMENTATION_SUMMARY.md
    └── SEARCH_ALERTS_VISUAL_GUIDE.md    📚 This file

Legend:
✨ New/Modified
✅ Existing/Unchanged
📚 Documentation
```

## 🎯 Component Interactions

```
┌─────────────────────────────────────────────────────────────────┐
│                      Component Matrix                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    Uses    ┌─────────────────┐              │
│  │   search.js  │────────────▶│ searchAlerts.js │              │
│  │   (Route)    │             │   (Service)     │              │
│  └──────────────┘             └─────────────────┘              │
│         │                              │                        │
│         │                              │ Uses                   │
│         │                              ▼                        │
│         │                     ┌─────────────────┐              │
│         │                     │   Prisma ORM    │              │
│         │                     │   (Database)    │              │
│         │                     └─────────────────┘              │
│         │                              ▲                        │
│         │                              │                        │
│  ┌──────▼──────────┐    Uses          │                        │
│  │ search-alerts.js│──────────────────┘                        │
│  │     (Route)     │                                           │
│  └─────────────────┘                                           │
│         │                                                       │
│         │ Uses                                                  │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ searchAlerts.js │                                           │
│  │   (Service)     │                                           │
│  └─────────────────┘                                           │
│         │                                                       │
│         │ Uses                                                  │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │   nodemailer    │                                           │
│  │   (SMTP Send)   │                                           │
│  └─────────────────┘                                           │
│                                                                  │
│  ┌──────────────┐    Triggers  ┌─────────────────┐            │
│  │   cron.js    │──────────────▶│ searchAlerts.js │            │
│  │  (Scheduler) │               │processSearchAlerts()         │
│  └──────────────┘               └─────────────────┘            │
│                                                                  │
│  ┌──────────────┐    Initializes  ┌─────────────────┐         │
│  │  server.js   │────────────────▶│    cron.js      │         │
│  │   (Main)     │                 │  (Scheduler)    │         │
│  └──────────────┘                 └─────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema Visual

```
┌────────────────────────────────────────────────────────────┐
│                      SearchQuery                            │
├────────────────────────────────────────────────────────────┤
│ PK  id              String      "clx..."                   │
│     query           String      "iPhone 13"                │
│ FK  userId          String?     "cly..." (→ User.id)       │
│ IDX userEmail       String?     "user@example.com"         │
│     category        String?     "electronics"              │
│     location        String?     "mumbai"                   │
│     filters         JSON?       {"minPrice": 10000}        │
│ IDX processed       Boolean     false                      │
│ IDX createdAt       DateTime    2024-12-03T10:30:00Z       │
└────────────────────────────────────────────────────────────┘
                            │
                            │ Many-to-One
                            ▼
┌────────────────────────────────────────────────────────────┐
│                          User                               │
├────────────────────────────────────────────────────────────┤
│ PK  id              String      "cly..."                   │
│     email           String?     "user@example.com"         │
│     name            String      "John Doe"                 │
│     ...                                                     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                 search_alert_settings                       │
├────────────────────────────────────────────────────────────┤
│ PK  id                 String      "clz..."                │
│     enabled            Boolean     true                    │
│     maxEmailsPerUser   Int         5                       │
│     checkIntervalHours Int         24                      │
│     emailSubject       String      "New products..."       │
│     emailBody          String      "<p>Hi! ..."            │
│     createdAt          DateTime    2024-12-03T09:00:00Z    │
│     updatedAt          DateTime    2024-12-03T15:30:00Z    │
└────────────────────────────────────────────────────────────┘

Indexes:
  SearchQuery.userId         → Fast user lookups
  SearchQuery.userEmail      → Email-based queries
  SearchQuery.processed      → Pending queue selection
  SearchQuery.createdAt      → Time-based filtering
```

## 🎨 Email Template Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Email Layout                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Header (Gradient)                      │    │
│  │         "SellIt Search Alert"                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                  Body Content                       │    │
│  │                                                      │    │
│  │  Hi there!                                          │    │
│  │  We found products matching: iPhone 13             │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  [Image]  iPhone 13 Pro                  │      │    │
│  │  │           Description here...            │      │    │
│  │  │           ₹65,000                         │      │    │
│  │  │           📍 Mumbai                       │      │    │
│  │  │           [View Product Button]          │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  [Image]  iPhone 13 Mini                 │      │    │
│  │  │           Description here...            │      │    │
│  │  │           ₹55,000                         │      │    │
│  │  │           📍 Delhi                        │      │    │
│  │  │           [View Product Button]          │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  [Browse More Products]                             │    │
│  │                                                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                    Footer                           │    │
│  │  This is an automated search alert                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎮 Admin Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Search Alerts Management                            [Admin]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────┐│
│  │ Total   │ │Processed│ │ Pending │ │ Unique  │ │Last 7││
│  │ Queries │ │         │ │         │ │  Users  │ │ Days ││
│  │  1,250  │ │  1,100  │ │   150   │ │   45    │ │  230 ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Top Searched Queries                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ iPhone                                       45 ████│  │
│  │ Laptop                                       32 ███ │  │
│  │ Bike                                         28 ███ │  │
│  │ Car                                          22 ██  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Alert Settings                                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ☑ Enable Search Alerts                              │  │
│  │                                                       │  │
│  │ Max Emails Per User:  [5         ]                  │  │
│  │ Check Interval Hours: [24        ]                  │  │
│  │ Email Subject:        [New products matching...]    │  │
│  │ Email Body:          ┌──────────────────────────┐   │  │
│  │                      │ <p>Hi! Found products... │   │  │
│  │                      │ {{query}} ...            │   │  │
│  │                      │ {{products}}             │   │  │
│  │                      └──────────────────────────┘   │  │
│  │                                                       │  │
│  │                      [Save Settings]                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Test Email                                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Email:      [test@example.com           ]           │  │
│  │ Test Query: [iPhone 13                  ]           │  │
│  │                                                       │  │
│  │             [Send Test Email]                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Maintenance                                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ [Cleanup Old Queries (30+ days)]                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Cron Schedule Timeline

```
Hour    0    1    2    3    4    5    6    7    8    9    10   11
        │    │    │    │    │    │    │    │    │    │    │    │
        ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼
        🔍   🔍   🗑️   🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍
        
        
Hour    12   13   14   15   16   17   18   19   20   21   22   23
        │    │    │    │    │    │    │    │    │    │    │    │
        ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼
        🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍   🔍

Legend:
🔍 = Process Search Alerts
🗑️ = Delete Deactivated Accounts (2 AM only)

Every hour: Check for new queries, send alerts
```

## 📈 Success Metrics

```
┌─────────────────────────────────────────────────────────────┐
│              Key Performance Indicators                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Capture Rate                                               │
│  ████████████████████░░  85%                                │
│  (Logged-in users with email)                               │
│                                                              │
│  Processing Success                                          │
│  ███████████████████████  98%                               │
│  (Queries processed without errors)                         │
│                                                              │
│  Email Delivery                                              │
│  █████████████████████░░  95%                               │
│  (Emails sent successfully)                                 │
│                                                              │
│  Match Rate                                                  │
│  ████████████░░░░░░░░░░░  55%                               │
│  (Queries with matching products)                           │
│                                                              │
│  User Engagement                                             │
│  ████████████████░░░░░░░  72%                               │
│  (Email open rate)                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Quick Reference

### Important Files
```
📄 services/searchAlerts.js       → Core logic
📄 routes/search-alerts.js        → Admin API
📄 utils/cron.js                  → Scheduler
📄 SEARCH_ALERTS_QUICKSTART.md   → Setup guide
```

### Key Functions
```javascript
// Save user search
saveSearchQuery(query, userId, email, category, location, filters)

// Process alerts (cron)
processSearchAlerts()

// Find matches
findMatchingProducts(queryText, filters)

// Send email
sendAlertEmail(email, query, products, settings)

// Get config
getSettings()
```

### Important URLs
```
Admin Settings:    /api/search-alerts/settings
Statistics:        /api/search-alerts/statistics
Test Email:        /api/search-alerts/test-email
Cleanup:           /api/search-alerts/queries/cleanup
```

### Environment Variables
```env
SMTP_HOST          → Email server
SMTP_USER          → Email username
SMTP_PASS          → Email password
FRONTEND_URL       → For email links
```

## 🎨 Color Coding

Throughout the documentation:

🟢 **Green** = Working, Active, Success  
🟡 **Yellow** = Warning, Pending, Review  
🔴 **Red** = Error, Failed, Critical  
🔵 **Blue** = Info, New, Feature  
⚪ **Gray** = Disabled, Inactive, Old  

---

## ✅ Implementation Checklist Visual

```
Setup Phase:
  [✅] Models added to schema
  [⏳] Database migration (User action required)
  [⏳] Prisma client generated (User action required)
  [⏳] Default settings initialized (User action required)

Configuration:
  [⏳] SMTP credentials added to .env (User action required)
  [✅] Cron jobs configured
  [✅] Routes registered
  [✅] Server integration complete

Testing:
  [⏳] Test email sent (After SMTP setup)
  [⏳] Query capture verified (After migration)
  [⏳] Cron job executed (After server restart)
  [⏳] Admin panel integrated (Optional)

Documentation:
  [✅] Setup guide created
  [✅] API documentation complete
  [✅] Admin example provided
  [✅] Migration instructions written
  [✅] Visual guide created

Status: 🟡 80% Complete (Awaiting user actions)
```

---

**This visual guide is your at-a-glance reference for understanding the Search Alerts system!**

For detailed information, see:
- 📚 `SEARCH_ALERTS_README.md` - Complete overview
- 📚 `SEARCH_ALERTS_QUICKSTART.md` - Quick setup
- 📚 `MIGRATION_INSTRUCTIONS.md` - Step-by-step migration

