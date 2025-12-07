# 🔍 Check & Reject Previous Ads - Complete Guide

## ✅ System Ready to Check All Existing Ads

You now have tools to scan all existing ads and reject inappropriate ones!

---

## 🛠️ Available Commands

### Check All Existing Approved Ads:
```powershell
cd D:\sellit\backend
npm run check-existing-ads
```

**This will:**
- ✅ Find all APPROVED ads
- ✅ Run Google Vision SafeSearch on images
- ✅ Run Gemini text analysis
- ✅ Automatically REJECT inappropriate ads
- ✅ Notify users with reasons
- ✅ Keep safe ads approved

---

### Reject Specific Ad:
```powershell
cd D:\sellit\backend
npm run reject-ad <ad-id> "Reason"
```

**Example:**
```powershell
npm run reject-ad cmipqbs3z0001wh6mb827gnp5 "Inappropriate content - nudity detected"
```

---

### Check Specific Ad:
```powershell
cd D:\sellit\backend
node scripts/moderate-existing-ads.js single <ad-id>
```

**Example:**
```powershell
node scripts/moderate-existing-ads.js single cmipqbs3z0001wh6mb827gnp5
```

---

## 📊 What Happens When You Run Check

### Process:
```
1. Script finds all APPROVED ads
2. For each ad:
   a. Fetch images
   b. Run Google Vision SafeSearch
   c. Run Gemini text analysis
   d. Check results:
      ├─ Inappropriate? → REJECT ❌
      │   - Update status to REJECTED
      │   - Save rejection reason
      │   - Notify user
      │   - Ad hidden from listings
      │
      └─ Clean? → Keep APPROVED ✅
          - Update moderationStatus
          - Keep ad visible
3. Summary report
```

---

## 🎯 Detection Process

### Google Vision SafeSearch:
```
For Each Image:
├─ Adult: VERY_LIKELY? → FLAGGED ❌
├─ Adult: LIKELY? → FLAGGED ❌
├─ Racy: VERY_LIKELY? → FLAGGED ❌
├─ Racy: LIKELY? → FLAGGED ❌
└─ Violence: VERY_LIKELY? → FLAGGED ❌

Any Flags? → REJECT ad
```

### Example Output:
```
[1/50] Checking: "iPhone 13 Pro"
   ID: abc123
   User: John Doe
   Images: 2
   🤖 Running AI moderation...
   ✅ SAFE - Content is appropriate

[2/50] Checking: "Adult content ad"
   ID: def456
   User: Bad User
   Images: 1
   🤖 Running AI moderation...
   ❌ INAPPROPRIATE CONTENT DETECTED!
   📝 Reason: Adult/nudity content detected
   🚩 Categories: adult_content, sexual_content
   ✅ Ad REJECTED and user notified

...

📊 FINAL RESULTS:
   ✅ Safe ads: 45
   ❌ Rejected ads: 5
   ⚠️  Errors: 0
   📈 Total processed: 50
```

---

## 🚨 Bulk Rejection Options

### Option 1: Run Full Check (Recommended)
```powershell
npm run check-existing-ads
```
- Checks ALL approved ads
- Uses AI to decide
- Rejects only if flagged
- Notifies all users

### Option 2: Manual Rejection
```powershell
# Reject specific ads you've identified
npm run reject-ad <ad-id-1> "Inappropriate content"
npm run reject-ad <ad-id-2> "Nudity detected"
npm run reject-ad <ad-id-3> "Sexual content"
```

### Option 3: Admin Panel
```
1. Go to http://localhost:3000/admin
2. Click "Ads" tab
3. Review ads manually
4. Click "Reject" on inappropriate ones
5. Enter reason
```

---

## 📝 Find Inappropriate Ads

### Method 1: Run AI Check (Best)
```powershell
npm run check-existing-ads
```
AI will find them automatically!

### Method 2: Manual Review
```
1. Login as admin
2. Go to /admin
3. Click "Ads" tab
4. Review images visually
5. Reject inappropriate ones
```

### Method 3: User Reports
```
Users can report inappropriate ads
Check reports in admin panel
Review and reject as needed
```

---

## 🎯 What Gets Rejected

### Google Vision SafeSearch Flags:
- 🚫 **Adult: LIKELY/VERY_LIKELY** - Nudity, explicit content
- 🚫 **Racy: LIKELY/VERY_LIKELY** - Sexual/suggestive imagery
- 🚫 **Violence: LIKELY/VERY_LIKELY** - Gore, violence

### Gemini Text Analysis Flags:
- 🚫 Sexual language
- 🚫 Explicit descriptions
- 🚫 Hate speech
- 🚫 Violent descriptions

---

## 💰 Cost for Bulk Check

### Google Vision Pricing:
- First 1,000 images: **FREE**
- After that: $1.50 per 1,000 images

### If You Have:
- 100 ads × 2 images avg = 200 images → **FREE**
- 1,000 ads × 2 images = 2,000 images → **$1.50**
- 10,000 ads × 2 images = 20,000 images → **$30**

**Very affordable for a one-time cleanup!**

---

## ⏱️ Processing Time

### Estimated Time:
- **Per ad**: ~3-5 seconds (text + images)
- **100 ads**: ~8 minutes
- **1,000 ads**: ~80 minutes
- **10,000 ads**: ~14 hours

**Note**: 2-second delay between ads to avoid rate limits

---

## 🧪 Test Run First

### Check Just One Ad:
```powershell
node scripts/moderate-existing-ads.js single <ad-id>
```

See how it works before running on all ads!

---

## 📊 What Happens to Users

### If Their Ad is Rejected:
```
🔔 Notification:

❌ Ad Rejected

Your ad "[Title]" has been rejected.

Reason: Adult/nudity content detected in images. Your ad 
contains inappropriate content that violates our content policy.

Guidelines:
• No nudity or explicit content
• No sexual or suggestive imagery  
• No violence or gore
• Keep content family-friendly

You can create a new ad with appropriate content.
```

### If Their Ad is Safe:
- No notification (stays approved)
- Ad remains visible
- No action needed

---

## 🎯 Recommended Approach

### Step-by-Step:

**1. Test on One Ad First:**
```powershell
node scripts/moderate-existing-ads.js single <test-ad-id>
```

**2. Review the Results:**
- Check if detection is accurate
- Verify rejection reasons are clear
- Confirm user notification works

**3. Run on All Ads:**
```powershell
npm run check-existing-ads
```

**4. Monitor Progress:**
- Watch console output
- See ads being processed
- Track safe vs rejected count

**5. Review Results:**
- Check admin panel
- Verify inappropriate ads are hidden
- Confirm users were notified

---

## 🔧 Troubleshooting

### If No Ads Found:
- Ads may already have moderationStatus set
- Check: Are there APPROVED ads in database?
- Try admin panel to see all ads

### If Too Many False Positives:
- Review SafeSearch scores
- May need to adjust threshold
- Can manually re-approve in admin panel

### If Script Takes Too Long:
- Process in batches
- Modify script to `take: 100`
- Run multiple times

---

## 📞 Quick Reference

```powershell
# Check all existing ads
npm run check-existing-ads

# Reject specific ad
npm run reject-ad <ad-id> "Reason"

# Check one ad
node scripts/moderate-existing-ads.js single <ad-id>

# View results in admin panel
http://localhost:3000/admin/moderation
```

---

## ✅ What You Get

After running the check:
- ✅ All existing ads scanned
- ✅ Inappropriate content removed
- ✅ Users notified with reasons
- ✅ Platform clean and safe
- ✅ Only appropriate content visible
- ✅ Legal compliance maintained

---

## 🎊 Result

**Your platform will be:**
- ✅ Fully moderated (all ads checked)
- ✅ Clean and safe (inappropriate ads removed)
- ✅ Professional (clear user communication)
- ✅ Compliant (content policy enforced)

**Run the check whenever you want to scan existing ads!**

---

**Command**: `npm run check-existing-ads`  
**Time**: Depends on ad count  
**Cost**: Free for first 1,000 images  
**Result**: Clean platform! 🛡️

🎉 **Your moderation tools are ready to use!**

