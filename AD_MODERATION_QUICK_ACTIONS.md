# ⚡ Ad Moderation - Quick Actions

## ✅ Ad Rejected Successfully!

The inappropriate ad has been **manually rejected** and the user has been notified.

**Ad ID**: cmipqbs3z0001wh6mb827gnp5  
**Status**: REJECTED ❌  
**Reason**: Inappropriate content - nudity detected in images  
**User**: Notified ✅

---

## 🛠️ Quick Commands

### Reject a Specific Ad
```powershell
cd D:\sellit\backend
node scripts/reject-ad.js <ad-id> "Reason for rejection"
```

**Example:**
```powershell
node scripts/reject-ad.js cmipqbs3z0001wh6mb827gnp5 "Inappropriate images"
```

### Moderate All Existing Ads
```powershell
cd D:\sellit\backend
npm run moderate-all-ads
```

This will:
- Find all unmoderated ads
- Run AI moderation on each
- Auto-approve or reject based on content
- Notify users

### Using NPM Scripts:
```powershell
# Reject ad
npm run reject-ad <ad-id> "Reason"

# Moderate all ads
npm run moderate-all-ads
```

---

## 🎯 Admin Panel Actions

### Via Admin Panel (Recommended):
1. Go to http://localhost:3000/admin
2. Click "Ads" tab
3. Find the ad
4. Click "Reject" button
5. Enter reason
6. User is notified automatically

### Via Moderation Panel:
1. Go to http://localhost:3000/admin/moderation
2. View flagged ads
3. Click "Reject" on inappropriate ad
4. Enter reason

---

## 🔍 Finding Inappropriate Ads

### Method 1: Admin Panel
```
1. Login as admin
2. Go to /admin
3. Click "Ads" tab
4. Filter by status: "APPROVED"
5. Manually review ads
6. Reject inappropriate ones
```

### Method 2: Moderation Dashboard
```
1. Go to /admin/moderation
2. Check "Flagged Ads" tab
3. Review auto-rejected ads
4. Confirm or override decisions
```

### Method 3: Database Query
```sql
-- Find ads without moderation
SELECT id, title, status, "moderationStatus"
FROM "Ad"
WHERE "moderationStatus" IS NULL
ORDER BY "createdAt" DESC;
```

---

## 🚨 Handling Inappropriate Content

### Immediate Actions:
1. **Reject the ad** (using script or admin panel)
2. **Notify the user** (automatic)
3. **Document the violation** (reason field)
4. **Monitor the user** (check their other ads)

### If User Repeatedly Posts Inappropriate Content:
```powershell
# Block the user
# Via admin panel: /admin → Users tab → Block User
```

### Bulk Actions:
```powershell
# Moderate all unmoderated ads
npm run moderate-all-ads

# This will process up to 100 ads at a time
```

---

## 📊 Monitoring

### Check for Unmoderated Ads:
```powershell
cd D:\sellit\backend
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.ad.count({where:{moderationStatus:null}}).then(c=>{console.log('Unmoderated ads:',c);p.\$disconnect()});"
```

### View Recent Ads:
```
Admin Panel → Ads tab → Sort by newest
```

### Check Moderation Stats:
```
Admin Panel → Moderation tab → Statistics
```

---

## 🔧 Troubleshooting

### AI Moderation Not Working?

**Issue**: Gemini API errors  
**Temporary Solution**: Manual rejection (as done above)  
**Long-term Solution**: Fix Gemini API integration or use OpenAI

**Quick Fix:**
```powershell
# Manually reject any inappropriate ad
node scripts/reject-ad.js <ad-id> "Reason"
```

### Need to Reject Multiple Ads?

Create a list and run:
```powershell
node scripts/reject-ad.js ad-id-1 "Inappropriate content"
node scripts/reject-ad.js ad-id-2 "Inappropriate content"
node scripts/reject-ad.js ad-id-3 "Inappropriate content"
```

Or use admin panel for batch actions.

---

## ✅ What Happens When Ad is Rejected

1. **Ad Status** → Changed to REJECTED
2. **User Notification** → Created automatically
3. **Ad Hidden** → No longer appears in listings
4. **User Can See** → In their "My Ads" with rejection reason
5. **Admin Can Track** → In moderation dashboard

---

## 📝 Best Practices

### 1. Review Regularly
Check admin panel daily for new ads

### 2. Clear Reasons
Always provide specific rejection reasons

### 3. Be Consistent
Apply same standards to all ads

### 4. Document Patterns
Note common violations for policy updates

### 5. Communicate
Update Terms of Service with content policy

---

## 🎯 Content Policy Guidelines

### ❌ Always Reject:
- Nudity or explicit sexual content
- Pornographic material
- Suggestive or sexual imagery
- Violence or gore
- Weapons (unless legal category)
- Illegal items or services
- Hate speech or discrimination
- Counterfeit goods

### ✅ Always Approve:
- Normal product photos
- Electronics, furniture, vehicles
- Clean, appropriate descriptions
- Professional images
- Legal items with proper documentation

### ⏳ Manual Review:
- Borderline cases
- Cultural sensitivities
- Artistic content
- Medical/educational content

---

## 📞 Quick Reference

**Reject Ad:**
```powershell
node scripts/reject-ad.js <ad-id> "Reason"
```

**Moderate All:**
```powershell
npm run moderate-all-ads
```

**Admin Panel:**
- Main: http://localhost:3000/admin
- Moderation: http://localhost:3000/admin/moderation

**Scripts Location:**
- `backend/scripts/reject-ad.js`
- `backend/scripts/moderate-existing-ads.js`

---

## ✅ Current Status

```
Inappropriate Ad:  ✅ REJECTED
User Notified:     ✅ YES
Admin Tools:       ✅ READY
Scripts Created:   ✅ COMPLETE
Manual Rejection:  ✅ WORKING
Admin Panel:       ✅ ACCESSIBLE
```

---

**The inappropriate ad has been removed from your platform!** 🎉

For future ads, use the admin panel or scripts to quickly reject inappropriate content.

**Note**: The AI moderation will be fixed in a future update, but manual rejection tools are working perfectly now!

