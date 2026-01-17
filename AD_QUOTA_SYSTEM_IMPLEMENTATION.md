# Ad Quota System - Implementation Summary

## ✅ Completed

### 1. Backend API Updates
- ✅ Updated `/ads/check-limit` to return structured `userAdQuota` data
- ✅ Packages sorted by oldest purchased first (`createdAt ASC`)
- ✅ Added socket event emission for real-time quota updates
- ✅ Quota decrement logic working (free ads first, then packages)

### 2. Socket Integration
- ✅ Added `emitAdQuotaUpdate` function in `backend/socket/socket.js`
- ✅ Emits `AD_QUOTA_UPDATED` event after ad creation
- ✅ Frontend socket client available in `frontend/lib/socket.ts`

## 🔄 In Progress / TODO

### 3. Frontend - Ads Posting Page
**Required Updates:**
- [ ] Add socket listener for `AD_QUOTA_UPDATED` event
- [ ] Show package selector when free ads exhausted
- [ ] Auto-select oldest package when free ads exhausted
- [ ] Display all packages with remaining counts
- [ ] Real-time update quota display on socket event

**Code Location:** `frontend/app/post-ad/page.tsx`

**Implementation Steps:**
1. Import `getSocket` from `@/lib/socket`
2. Add `useEffect` to listen for `AD_QUOTA_UPDATED`
3. Update `adLimitStatus` state when socket event received
4. Add package selector dropdown (show when free ads = 0)
5. Auto-select oldest package with remaining ads

### 4. Frontend - Profile Page
**Required Updates:**
- [ ] Display detailed package information
- [ ] Show purchase date/time for each package
- [ ] Show expiry date/time
- [ ] Real-time update on socket event
- [ ] Display usage history

**Code Location:** `frontend/app/profile/page.tsx`

### 5. History Tracking
**Required Updates:**
- [ ] Create `AdUsageHistory` model in Prisma schema
- [ ] Log each ad post with type (FREE/PACKAGE), date, time
- [ ] Add API endpoint to fetch usage history
- [ ] Display history on profile page

**Schema Example:**
```prisma
model AdUsageHistory {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  adId      String   @db.ObjectId
  type      String   // "FREE" or "PACKAGE"
  packageId String?  @db.ObjectId
  date      DateTime @default(now())
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  ad        Ad       @relation(fields: [adId], references: [id])
  
  @@index([userId])
  @@map("ad_usage_history")
}
```

## 📋 Data Structure

### Backend Response Format
```json
{
  "success": true,
  "userAdQuota": {
    "monthlyFreeAds": {
      "total": 2,
      "used": 1,
      "remaining": 1,
      "resetAt": "2025-02-01T00:00:00.000Z"
    },
    "packages": [
      {
        "packageId": "BUS_7",
        "packageName": "Seller Plus Package",
        "packageType": "SELLER_PLUS",
        "totalAds": 7,
        "usedAds": 3,
        "adsRemaining": 4,
        "purchasedAt": "2025-01-25T10:30:00Z",
        "expiresAt": "2025-02-25T23:59:59Z"
      }
    ]
  }
}
```

## 🎯 Priority Logic

1. **Free Ads (Monthly)** - Used FIRST
2. **Business Package Ads** - Used SECOND (oldest package first)
3. **Payment Required** - When both exhausted

## 🔔 Real-time Updates

**Socket Event:** `AD_QUOTA_UPDATED`
**Payload:** Same as `userAdQuota` structure
**Emitted:** After successful ad creation

**Frontend Listener:**
```typescript
useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  socket.on('AD_QUOTA_UPDATED', (quotaData) => {
    // Update React Query cache
    queryClient.setQueryData(['ad-limit-status'], (old: any) => ({
      ...old,
      userAdQuota: quotaData
    }));
    
    // Refetch to ensure consistency
    queryClient.refetchQueries({ queryKey: ['ad-limit-status'] });
  });

  return () => {
    socket.off('AD_QUOTA_UPDATED');
  };
}, [queryClient]);
```

## 📝 Next Steps

1. **Immediate:** Add socket listener to post-ad page
2. **Immediate:** Add package selector UI
3. **Next:** Update profile page with detailed info
4. **Next:** Implement history tracking
5. **Future:** Admin dashboard for quota analytics

