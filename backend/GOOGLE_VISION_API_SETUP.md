# Google Vision API Setup - Image Validation & Nudity Detection

## ✅ API Key Updated

**New API Key**: `AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w`

**Environment Variable**: `GOOGLE_CLOUD_VISION_API_KEY`

**Status**: ✅ Configured in `.env` file

---

## 🛡️ Image Validation Features

### 1. **Format Validation** (in `middleware/upload.js`)
- ✅ File extension check: `.jpg`, `.jpeg`, `.png`, `.webp`
- ✅ MIME type validation
- ✅ File size limit: 5MB max
- ✅ Magic bytes validation (ensures file is actually an image, not just renamed)

### 2. **Content Moderation** (in `services/contentModeration.js`)
- ✅ **Nudity Detection**: Uses Google Vision API SafeSearch
- ✅ **Violence Detection**: Detects violent/gory content
- ✅ **Racy Content Detection**: Detects suggestive/sexual imagery
- ✅ **Medical Content Detection**: Detects medical imagery
- ✅ **Spoof Detection**: Detects manipulated images

---

## 🔍 How It Works

### When User Uploads Images:

1. **Upload Validation** (`middleware/upload.js`):
   ```
   User uploads image
   ↓
   Check file extension (.jpg, .jpeg, .png, .webp)
   ↓
   Check MIME type
   ↓
   Check file size (max 5MB)
   ↓
   Validate magic bytes (ensure it's a real image)
   ↓
   If all valid → Process image
   If invalid → Reject with error message
   ```

2. **Content Moderation** (`services/contentModeration.js`):
   ```
   Ad created with images
   ↓
   Status: PENDING
   ↓
   Background moderation runs:
   ├─ For each image:
   │  ├─ Convert to base64 or use URL
   │  ├─ Call Google Vision API SafeSearch
   │  ├─ Get safety scores:
   │  │  ├─ Adult: VERY_UNLIKELY to VERY_LIKELY
   │  │  ├─ Violence: VERY_UNLIKELY to VERY_LIKELY
   │  │  ├─ Racy: VERY_UNLIKELY to VERY_LIKELY
   │  │  ├─ Medical: VERY_UNLIKELY to VERY_LIKELY
   │  │  └─ Spoof: VERY_UNLIKELY to VERY_LIKELY
   │  └─ Decision:
   │     ├─ LIKELY/VERY_LIKELY → UNSAFE ❌
   │     └─ Otherwise → SAFE ✅
   └─ Text moderation (keyword-based)
   ↓
   After 5 minutes:
   ├─ All safe? → APPROVE ✅
   └─ Unsafe? → DISABLED ❌
   ```

---

## 📊 Safety Levels

### Safe Content (APPROVED):
- `VERY_UNLIKELY` ✅
- `UNLIKELY` ✅
- `POSSIBLE` ✅

### Unsafe Content (REJECTED):
- `LIKELY` ❌
- `VERY_LIKELY` ❌

---

## 🎯 What Gets Detected

### ✅ Safe Images (Approved):
- Product photos (electronics, furniture, vehicles)
- Clothing on models (appropriate)
- Food items
- Professional photos
- Normal everyday items

### ❌ Unsafe Images (Rejected):
- Nudity (partial or full)
- Sexual content (explicit)
- Suggestive poses
- Adult entertainment
- Gore or violence
- Disturbing imagery

---

## ⚙️ Configuration

### Environment Variables (in `.env`):
```env
# Google Vision API Key
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w

# Enable/disable moderation (default: enabled)
CONTENT_MODERATION_ENABLED=true

# Fail-closed mode (reject when moderation unavailable)
CONTENT_MODERATION_FAIL_CLOSED=true
```

### Alternative Environment Variable Names (also supported):
- `GOOGLE_VISION_API_KEY`
- `GOOGLE_CLOUD_VISION_KEY`

---

## 🔄 Moderation Flow

### Complete Process:
```
1. User posts ad with images
   ↓
2. Images validated (format, size, magic bytes)
   ↓
3. Ad saved as PENDING
   ↓
4. Background moderation runs:
   ├─ Image moderation (Google Vision SafeSearch)
   └─ Text moderation (keyword-based)
   ↓
5. Results saved to moderationFlags
   ↓
6. Wait 5 minutes...
   ↓
7. Auto-approval cron processes:
   ├─ All safe? → Status: APPROVED ✅
   └─ Unsafe? → Status: DISABLED ❌
   ↓
8. User receives notification
```

---

## 📝 User Messages

### On Posting:
```
✅ Ad Submitted!

Your ad is being reviewed and will be posted after 5 minutes 
if it passes our content moderation.

We check for:
• Inappropriate language
• Nudity or adult content
• Violence or disturbing imagery

You'll receive a notification when it's live.
```

### After 5 Min - Approved:
```
✅ Ad Approved!

Your ad "[Title]" has passed moderation and is now live!
```

### After 5 Min - Rejected:
```
❌ Ad Rejected

Your ad "[Title]" was rejected.

Reason: Adult/nudity content detected in images. 
Your ad contains inappropriate content that violates 
our content policy.

You can edit and resubmit your ad with appropriate content.
```

---

## 🧪 Testing

### Test Image Validation:
1. Try uploading invalid file types → Should be rejected
2. Try uploading files > 5MB → Should be rejected
3. Try uploading corrupted images → Should be rejected

### Test Nudity Detection:
1. Upload normal product photo → Should be approved
2. Upload inappropriate content → Should be rejected

### Check Server Logs:
Look for `[MODERATION]` messages in backend logs:
- `✅ [MODERATION] Google Cloud Vision API initialized with API key`
- `🔍 [MODERATION] Safe search levels: ...`
- `✅ [MODERATION] Content is SAFE`
- `❌ [MODERATION] Content is UNSAFE`

---

## 💰 Cost

### Google Cloud Vision Pricing:
- **First 1,000 images/month**: FREE
- **1,001 - 5,000,000**: $1.50 per 1,000 images
- **5M+**: $0.60 per 1,000 images

### Estimated Monthly Cost:
- If < 1,000 ads/month: **$0.00** (FREE!)
- If 10,000 ads/month: **~$13.50/month**
- If 100,000 ads/month: **~$135/month**

---

## ✅ Status

- ✅ API Key: Updated
- ✅ Image Validation: Active
- ✅ Nudity Detection: Active
- ✅ Content Moderation: Enabled
- ✅ Fail-Closed Mode: Enabled (rejects when unavailable)

---

## 🚀 Next Steps

1. **Restart Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Verify in Logs**:
   Look for: `✅ [MODERATION] Google Cloud Vision API initialized with API key`

3. **Test with Real Ad**:
   - Post an ad with images
   - Check server logs for moderation messages
   - Verify ad status after 5 minutes

---

## 📚 Related Files

- `backend/services/contentModeration.js` - Main moderation service
- `backend/middleware/upload.js` - Image upload validation
- `backend/routes/ads.js` - Ad creation with moderation
- `backend/services/autoApproval.js` - Auto-approval cron job

---

**Last Updated**: API key updated to `AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w`
