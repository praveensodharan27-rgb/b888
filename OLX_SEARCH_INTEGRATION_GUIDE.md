# 🔌 OLX Search System - Integration Guide

## 📋 Overview

This guide shows you how to integrate the OLX search system into your existing marketplace application.

---

## 🎯 Integration Points

### 1. Navbar Search Bar

Replace your existing search input with the smart OLX search bar.

**Before:**
```tsx
<input type="text" placeholder="Search..." />
```

**After:**
```tsx
import OLXSearchBar from '@/components/search/OLXSearchBar';

<OLXSearchBar 
  placeholder="Search for products, brands, and more..."
  showButton={true}
/>
```

---

### 2. Search Results Page

Update your search/ads page to use the new components.

**File:** `app/ads/page.tsx` or `app/search/page.tsx`

```tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import OLXSearchBar from '@/components/search/OLXSearchBar';
import SearchResultsGrid from '@/components/search/SearchResultsGrid';
import { useSearch } from '@/hooks/useSearch';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const {
    results,
    total,
    page,
    totalPages,
    processingTime,
    isSearching,
    search,
    loadMore,
  } = useSearch({
    autoSearch: false,
    initialQuery: query,
  });

  useEffect(() => {
    if (query) {
      search(query, 1);
    }
  }, [query]);

  return (
    <div>
      <OLXSearchBar />
      <SearchResultsGrid
        results={results}
        total={total}
        page={page}
        totalPages={totalPages}
        isLoading={isSearching}
        onLoadMore={loadMore}
        processingTime={processingTime}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
```

---

### 3. Ad Creation/Update Hooks

Sync ads to Meilisearch when they're created or updated.

**File:** `backend/routes/ads.js` or your ad controller

```javascript
const { syncAdToMeilisearch } = require('../services/meilisearch');

// After creating an ad
router.post('/ads', async (req, res) => {
  // ... create ad logic
  const ad = await prisma.ad.create({
    data: { ... },
    include: {
      category: true,
      location: true,
      user: true,
    },
  });
  
  // Sync to Meilisearch
  await syncAdToMeilisearch(ad);
  
  res.json({ success: true, ad });
});

// After updating an ad
router.put('/ads/:id', async (req, res) => {
  // ... update ad logic
  const ad = await prisma.ad.update({
    where: { id: req.params.id },
    data: { ... },
    include: {
      category: true,
      location: true,
      user: true,
    },
  });
  
  // Sync to Meilisearch
  await syncAdToMeilisearch(ad);
  
  res.json({ success: true, ad });
});
```

---

### 4. Ad Status Change Hook

Remove ads from search when they're rejected or disabled.

```javascript
const { syncAdToMeilisearch, deleteAd } = require('../services/meilisearch');

// When ad status changes
router.patch('/ads/:id/status', async (req, res) => {
  const { status } = req.body;
  
  const ad = await prisma.ad.update({
    where: { id: req.params.id },
    data: { status },
    include: {
      category: true,
      location: true,
      user: true,
    },
  });
  
  if (status === 'APPROVED') {
    // Add to search index
    await syncAdToMeilisearch(ad);
  } else {
    // Remove from search index
    await deleteAd(ad.id);
  }
  
  res.json({ success: true, ad });
});
```

---

### 5. Plan Purchase Hook

Update ad ranking when user purchases a plan.

```javascript
const { syncAdToMeilisearch } = require('../services/meilisearch');

// After plan purchase
router.post('/premium/purchase', async (req, res) => {
  const { adId, planType } = req.body;
  
  // Update ad with new plan
  const ad = await prisma.ad.update({
    where: { id: adId },
    data: {
      planType,
      planPriority: getPlanPriority(planType),
    },
    include: {
      category: true,
      location: true,
      user: true,
    },
  });
  
  // Re-index with new priority
  await syncAdToMeilisearch(ad);
  
  res.json({ success: true, ad });
});

function getPlanPriority(planType) {
  const priorities = {
    enterprise: 4,
    pro: 3,
    basic: 2,
    normal: 1,
  };
  return priorities[planType?.toLowerCase()] || 1;
}
```

---

### 6. Promotion Activation Hook

Update search index when promotions are activated.

```javascript
const { syncAdToMeilisearch } = require('../services/meilisearch');

// Activate Top Ad
router.post('/ads/:id/promote/top', async (req, res) => {
  const ad = await prisma.ad.update({
    where: { id: req.params.id },
    data: {
      isTopAdActive: true,
    },
    include: {
      category: true,
      location: true,
      user: true,
    },
  });
  
  await syncAdToMeilisearch(ad);
  res.json({ success: true, ad });
});

// Activate Featured
router.post('/ads/:id/promote/featured', async (req, res) => {
  const ad = await prisma.ad.update({
    where: { id: req.params.id },
    data: {
      isFeaturedActive: true,
    },
    include: {
      category: true,
      location: true,
      user: true,
    },
  });
  
  await syncAdToMeilisearch(ad);
  res.json({ success: true, ad });
});
```

---

### 7. Bump Button in Ad Details

Add a bump button to ad detail pages.

```tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function BumpButton({ adId }: { adId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBump = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/search/bump/${adId}`);
      
      if (response.data.success) {
        setMessage('Ad bumped to top!');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to bump ad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBump}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Bumping...' : 'Bump to Top'}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
```

---

### 8. Expired Ads Cleanup (Cron Job)

Remove expired ads from search index automatically.

**File:** `backend/utils/cron.js` or create new cron job

```javascript
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { deleteAd } = require('../services/meilisearch');

const prisma = new PrismaClient();

// Run every hour
cron.schedule('0 * * * *', async () => {
  try {
    console.log('Cleaning expired ads from search index...');
    
    const now = new Date();
    const expiredAds = await prisma.ad.findMany({
      where: {
        adExpiryDate: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });
    
    for (const ad of expiredAds) {
      await deleteAd(ad.id);
    }
    
    console.log(`Removed ${expiredAds.length} expired ads from search index`);
  } catch (error) {
    console.error('Error cleaning expired ads:', error);
  }
});
```

---

### 9. Database Migration

Add required fields to your Ad model.

**File:** `backend/prisma/schema.prisma`

```prisma
model Ad {
  // ... existing fields
  
  // Add these fields for OLX search
  brand             String?
  model             String?
  specifications    Json?
  
  planType          String?   @default("normal")
  planPriority      Int?      @default(1)
  isTopAdActive     Boolean   @default(false)
  isFeaturedActive  Boolean   @default(false)
  isBumpActive      Boolean   @default(false)
  
  adExpiryDate      DateTime?
  bumpedAt          DateTime?
}
```

**Run migration:**
```bash
cd backend
npx prisma migrate dev --name add_olx_search_fields
npx prisma generate
```

---

### 10. Environment Variables

Add Meilisearch configuration to your `.env` file.

**File:** `backend/.env`

```env
# Meilisearch Configuration
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=your-master-key-here
MEILI_INDEX=ads

# Or for Meilisearch Cloud
# MEILI_HOST=https://your-project.meilisearch.io
# MEILI_API_KEY=your-api-key-here
```

---

## 🚀 Deployment Checklist

### Development
- [ ] Install Meilisearch locally
- [ ] Configure environment variables
- [ ] Run database migration
- [ ] Initialize Meilisearch index
- [ ] Index existing ads
- [ ] Test search functionality
- [ ] Test autocomplete
- [ ] Test bump functionality

### Production
- [ ] Set up Meilisearch Cloud account
- [ ] Update production environment variables
- [ ] Run production database migration
- [ ] Initialize production index
- [ ] Index production ads
- [ ] Set up cron job for expired ads
- [ ] Configure monitoring
- [ ] Test all features in production

---

## 🔧 Configuration Options

### Search Bar Customization

```tsx
<OLXSearchBar
  placeholder="Custom placeholder..."
  autoFocus={true}
  showButton={false}
  className="custom-class"
  onSearch={(query) => {
    // Custom search handler
    console.log('Searching for:', query);
  }}
/>
```

### Search Hook Options

```tsx
const { results, search } = useSearch({
  debounceMs: 500,        // Debounce delay (default: 300)
  autoSearch: true,       // Auto-search on query change
  initialQuery: 'iphone', // Initial search query
  category: 'Electronics',// Filter by category
  location: 'Mumbai',     // Filter by location
  minPrice: 10000,        // Minimum price
  maxPrice: 50000,        // Maximum price
  condition: 'new',       // Product condition
  sort: 'price_low',      // Sort order
  limit: 20,              // Results per page
});
```

---

## 📊 Monitoring & Analytics

### Track Search Queries

```javascript
// In your search API route
const { logSearch } = require('../utils/searchAnalytics');

router.get('/search', async (req, res) => {
  const { q, category, location } = req.query;
  
  // ... search logic
  
  // Log search query
  await logSearch({
    query: q,
    category,
    location,
    resultsCount: results.total,
    userId: req.user?.id,
  });
  
  res.json(results);
});
```

### Monitor Performance

```javascript
// In your search service
const startTime = Date.now();
const results = await searchAds(query, options);
const processingTime = Date.now() - startTime;

logger.info({
  type: 'search_performance',
  query,
  processingTime,
  resultsCount: results.total,
});
```

---

## 🐛 Common Issues & Solutions

### Issue: Search returns no results

**Solution:**
```bash
# Check if Meilisearch is running
curl http://localhost:7700/health

# Check if ads are indexed
curl http://localhost:7700/indexes/ads/stats

# Reindex all ads
npm run reindex-meilisearch
```

### Issue: Autocomplete not working

**Solution:**
1. Check minimum query length (2 chars)
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Ensure Meilisearch is running

### Issue: Bump button not working

**Solution:**
1. Verify user is authenticated
2. Check user owns the ad
3. Verify bump cooldown period
4. Check ad status is APPROVED

---

## 📚 Additional Resources

- **Complete Documentation:** `OLX_SEARCH_SYSTEM_COMPLETE.md`
- **Quick Start Guide:** `OLX_SEARCH_QUICK_START.md`
- **Files Created:** `OLX_SEARCH_FILES_CREATED.md`
- **Main README:** `OLX_SEARCH_README.md`

---

## 🎉 You're All Set!

Your OLX-style search system is now fully integrated! 🚀

**Next Steps:**
1. Test all features thoroughly
2. Monitor performance
3. Gather user feedback
4. Optimize based on usage patterns

---

**Need Help?** Check the troubleshooting section in the complete documentation.

**Status:** ✅ Integration Complete
