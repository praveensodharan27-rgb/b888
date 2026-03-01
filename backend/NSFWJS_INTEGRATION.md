# NSFWJS Integration - Image Content Moderation

## ✅ NSFWJS Integrated

NSFWJS is now integrated for detecting NSFW content in ad images before posting.

---

## 🎯 Classification Rules

### NSFWJS Categories:
1. **Porn** ❌ → **BLOCKED** (Ad status: DISABLED)
2. **Hentai** ❌ → **BLOCKED** (Ad status: DISABLED)
3. **Sexy** ⚠️ → **REVIEW** (Ad status: PENDING - Manual review required)
4. **Neutral** ✅ → **ALLOWED** (Ad status: APPROVED)
5. **Drawing** ✅ → **ALLOWED** (Ad status: APPROVED)

---

## 🔄 How It Works

### When User Posts Ad:

```
1. User uploads images
   ↓
2. Images validated (format, size, magic bytes)
   ↓
3. Ad saved as PENDING
   ↓
4. Background moderation runs:
   ├─ NSFWJS Classification (Primary):
   │  ├─ Porn detected? → BLOCK ❌
   │  ├─ Hentai detected? → BLOCK ❌
   │  ├─ Sexy detected? → REVIEW ⚠️
   │  └─ Neutral/Drawing? → ALLOW ✅
   └─ Google Vision API (Fallback):
      └─ Used if NSFWJS unavailable
   ↓
5. Decision:
   ├─ Blocked (Porn/Hentai) → Status: DISABLED
   ├─ Needs Review (Sexy) → Status: PENDING
   └─ Safe (Neutral/Drawing) → Status: APPROVED
```

---

## 📊 Detection Examples

### Example 1: Normal Product Photo
```
NSFWJS Classification:
  Category: Neutral
  Confidence: 95.2%

Decision: ✅ APPROVED
Status: APPROVED
```

### Example 2: Porn Content
```
NSFWJS Classification:
  Category: Porn
  Confidence: 87.5%

Decision: ❌ BLOCKED
Status: DISABLED
Reason: "Images contain explicit adult content (Porn)"
```

### Example 3: Hentai Content
```
NSFWJS Classification:
  Category: Hentai
  Confidence: 92.1%

Decision: ❌ BLOCKED
Status: DISABLED
Reason: "Images contain explicit adult content (Hentai)"
```

### Example 4: Sexy Content
```
NSFWJS Classification:
  Category: Sexy
  Confidence: 78.3%

Decision: ⚠️ REVIEW
Status: PENDING
Action: Manual review required
```

### Example 5: Drawing/Art
```
NSFWJS Classification:
  Category: Drawing
  Confidence: 88.7%

Decision: ✅ ALLOWED
Status: APPROVED
```

---

## 🛡️ Fallback Mechanism

If NSFWJS model fails to load or is unavailable:
- Falls back to Google Vision API SafeSearch
- Logs warning but continues moderation
- Ensures content is still checked

---

## 📝 User Messages

### On Posting:
```
✅ Ad Submitted!

Your ad is being reviewed and will be posted after 
content moderation check.

We check for:
• Explicit adult content (Porn/Hentai) - Blocked
• Suggestive content (Sexy) - Manual review
• Normal content - Approved automatically
```

### After Moderation - Blocked (Porn/Hentai):
```
❌ Ad Disabled

Your ad "[Title]" was disabled.

Reason: Images contain explicit adult content (Porn/Hentai).

You can edit and resubmit your ad with appropriate content.
```

### After Moderation - Needs Review (Sexy):
```
⚠️ Ad Under Review

Your ad "[Title]" is under review.

Your ad contains suggestive content and requires manual 
approval. It will be posted after review.
```

### After Moderation - Approved:
```
✅ Ad Approved!

Your ad "[Title]" has passed moderation and is now live!
```

---

## ⚙️ Configuration

### Environment Variables:
```env
# Enable/disable moderation (default: enabled)
CONTENT_MODERATION_ENABLED=true

# Fail-closed mode (reject when unavailable)
CONTENT_MODERATION_FAIL_CLOSED=true
```

### Model Loading:
- NSFWJS model loads automatically on server startup
- Model is cached in memory for fast classification
- Falls back to Google Vision if model fails to load

---

## 🔧 Technical Details

### NSFWJS Model:
- **Library**: `nsfwjs` (v2.x)
- **Backend**: TensorFlow.js Node.js
- **Model**: Pre-trained NSFW classification model
- **Input**: Image buffer, URL, or base64 string
- **Output**: Classification with confidence scores

### Classification Threshold:
- Uses top prediction category
- Confidence score logged for debugging
- Decision based on category, not confidence

### Performance:
- Fast local classification (no API calls)
- No external dependencies (once model loaded)
- Works offline after initial model download

---

## 📊 Moderation Flags

Ad `moderationFlags` object includes:
```json
{
  "hasNudity": false,
  "hasAdultText": false,
  "needsReview": true,
  "imageDetails": [
    {
      "category": "Sexy",
      "confidence": 0.783,
      "classifications": {
        "Porn": 0.05,
        "Hentai": 0.02,
        "Sexy": 0.78,
        "Neutral": 0.12,
        "Drawing": 0.03
      },
      "source": "nsfwjs"
    }
  ],
  "textDetails": {
    "isSafe": true,
    "hasAdultContent": false,
    "keywords": []
  },
  "checkedAt": "2024-01-26T09:00:00.000Z"
}
```

---

## 🧪 Testing

### Test Normal Image:
1. Upload product photo
2. Should be classified as "Neutral"
3. Ad should be auto-approved

### Test Porn Content:
1. Upload explicit content
2. Should be classified as "Porn"
3. Ad should be disabled

### Test Sexy Content:
1. Upload suggestive content
2. Should be classified as "Sexy"
3. Ad should be pending for review

---

## ✅ Status

- ✅ NSFWJS installed and integrated
- ✅ Model loading on startup
- ✅ Classification logic implemented
- ✅ Block/Review/Allow rules applied
- ✅ Fallback to Google Vision configured
- ✅ Ad status updates based on classification
- ✅ User notifications configured

---

## 🚀 Next Steps

1. **Restart Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Verify in Logs**:
   Look for: `✅ [MODERATION] NSFWJS model loaded successfully`

3. **Test with Real Ad**:
   - Post an ad with images
   - Check server logs for NSFWJS classification
   - Verify ad status based on content type

---

## 📚 Related Files

- `backend/services/contentModeration.js` - Main moderation service with NSFWJS
- `backend/routes/ads.js` - Ad creation with moderation
- `backend/package.json` - Dependencies (nsfwjs, @tensorflow/tfjs-node)

---

**Last Updated**: NSFWJS integrated for Porn/Hentai blocking, Sexy review, Neutral/Drawing allowance
