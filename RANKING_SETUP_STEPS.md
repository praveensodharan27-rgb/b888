# 🚀 Ranking System Setup - Step by Step

## ⚡ Quick Setup (4 Commands)

```bash
cd backend

# Step 1: Generate Prisma client with new fields
npx prisma generate

# Step 2: Add ranking fields to existing ads
npm run add-ranking-fields

# Step 3: Initialize Meilisearch with ranking settings
npm run init-ranking

# Step 4: Reindex all ads to Meilisearch
npm run reindex-meilisearch
```

---

## 📋 Detailed Steps

### Step 1: Generate Prisma Client

The schema has been updated with new fields:
- `rankingScore`
- `planType`
- `planPriority`
- `isTopAdActive`
- `isFeaturedActive`
- `isBumpActive`
- `latitude`
- `longitude`
- `adExpiryDate`

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client
```

---

### Step 2: Add Fields to Existing Ads

This script:
- Maps `packageType` to `planType`
- Maps `premiumType` to feature flags
- Calculates `rankingScore` for each ad
- Updates all ads in MongoDB

```bash
npm run add-ranking-fields
```

**Expected Output:**
```
🔄 Adding ranking system fields to all ads...
📊 Found 8 ads
⚙️  Calculating and updating fields...
   Progress: 10/8 updated...
✅ Successfully updated 8 ads!

📊 Ranking Score Distribution:
   High (100+): 0 ads
   Medium (50-99): 0 ads
   Low (0-49): 8 ads

✅ Migration complete!
```

---

### Step 3: Initialize Meilisearch

Configure Meilisearch index with ranking settings:

```bash
npm run init-ranking
```

**Expected Output:**
```
🎯 Initializing Meilisearch with Advanced Ranking System...
✅ Connected to Meilisearch: available
✅ Ranking system configured successfully

📊 Ranking Formula:
   rankingScore = planPriority + featureBoosts + freshnessBonus

🏆 Example Rankings:
   1. Enterprise Top Ad: 150 points
   2. Professional Top + Featured: 160 points
   ...
```

---

### Step 4: Reindex to Meilisearch

Index all ads with ranking scores:

```bash
npm run reindex-meilisearch
```

**Expected Output:**
```
Starting full reindex of all ads
Reindex progress: 8 indexed
Full reindex complete: 8 ads
```

---

## ✅ Verification

### Test Ranking Order

```bash
npm run test-ranking
```

**Expected Output:**
```
🎯 Ad Ranking System Test
═══════════════════════════════════════════════════════════

📊 Individual Ad Scores:
1. Enterprise Top Ad
   Plan: ENTERPRISE (100 pts)
   Features:
     - Top Ad: +40
     - Freshness: +10
   ⭐ Total Score: 150 points

...

🏆 Final Ranking Order (Highest to Lowest):
1. Professional Top + Featured [TOP, FEATURED]
   Score: 160 points | Plan: PROFESSIONAL

2. Enterprise Top Ad [TOP]
   Score: 150 points | Plan: ENTERPRISE

...

✅ Position 1: Professional Top + Featured
✅ Position 2: Enterprise Top Ad
...

🎉 All tests passed! Ranking system is working correctly.
```

---

### Test Home Feed API

```bash
# Without location
curl "http://localhost:5000/api/home-feed?page=1&limit=5"

# With location
curl "http://localhost:5000/api/home-feed?userLat=19.0760&userLng=72.8777&page=1&limit=5"
```

**Check:**
- First ad should have highest `rankingScore`
- Paid ads should appear before free ads
- If location provided, `distanceText` should be present

---

## 🐛 Troubleshooting

### Error: "Unknown argument rankingScore"

**Solution:** You skipped Step 1!
```bash
npx prisma generate
```

### Error: "rankingScore is not sortable"

**Solution:** You skipped Step 3!
```bash
npm run init-ranking
```

### Ads Not in Correct Order

**Solution:** Recalculate scores
```bash
npm run add-ranking-fields
npm run reindex-meilisearch
```

---

## 📊 Field Mapping

### packageType → planType

| Old (packageType) | New (planType) | Priority |
|-------------------|----------------|----------|
| SELLER_PRIME | ENTERPRISE | 100 |
| SELLER_PLUS | PROFESSIONAL | 80 |
| MAX_VISIBILITY | STARTER | 60 |
| NORMAL | FREE | 10 |

### premiumType → Feature Flags

| Old (premiumType) | New (Feature Flag) | Boost |
|-------------------|-------------------|-------|
| TOP | isTopAdActive | +40 |
| FEATURED | isFeaturedActive | +30 |
| BUMP_UP | isBumpActive | +15 |

---

## ✅ Complete Checklist

- [ ] Run `npx prisma generate`
- [ ] Run `npm run add-ranking-fields`
- [ ] Run `npm run init-ranking`
- [ ] Run `npm run reindex-meilisearch`
- [ ] Run `npm run test-ranking`
- [ ] Test home feed API
- [ ] Verify ad order
- [ ] Check badges display
- [ ] Test with location
- [ ] Test without location

---

## 🎉 After Setup

Your ranking system is now active! 🚀

**Verify it's working:**
1. Visit `http://localhost:3000`
2. Check if paid ads appear first
3. Grant location permission
4. Check if nearest ads appear first
5. Verify badges display correctly

---

## 📚 Next Steps

1. **Test the ranking order** - Verify paid ads appear first
2. **Add test data** - Create ads with different plans
3. **Monitor performance** - Check API response times
4. **Gather feedback** - See how users interact

---

**Status:** ✅ Ready to Setup
**Time:** ~5 minutes
**Difficulty:** Easy
