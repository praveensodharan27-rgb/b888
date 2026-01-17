# Fix RefererNotAllowedMapError - Google Maps API Key Configuration

## 🔴 Error: RefererNotAllowedMapError

This error occurs when your Google Maps API key has HTTP referrer restrictions that are blocking your domain.

## ✅ Step-by-Step Fix

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project

### 2. Navigate to API Credentials
- Go to **APIs & Services** → **Credentials**
- Find your API key: `AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w`
- Click on the API key to edit it

### 3. Configure HTTP Referrer Restrictions

Under **"Application restrictions"**:
- Select **"HTTP referrers (web sites)"**

Add these referrers (one per line):

```
http://localhost:3000/*
http://localhost:*/*
http://127.0.0.1:3000/*
http://127.0.0.1:*/*
https://yourdomain.com/*
https://*.yourdomain.com/*
```

**Important Notes:**
- Use `/*` at the end to allow all paths
- Use `*` for port wildcard (allows any port)
- Add your production domain when ready
- Use `https://` for production domains

### 4. Enable Required APIs

Go to **APIs & Services** → **Library** and enable:

1. ✅ **Maps JavaScript API**
2. ✅ **Places API (New)** - Important: Use the NEW Places API
3. ✅ **Geocoding API**

**Do NOT enable:**
- ❌ Places API (Legacy) - Use the NEW one instead

### 5. Enable Billing

- Go to **Billing** in Google Cloud Console
- Link a billing account to your project
- Google Maps requires billing to be enabled (even for free tier)

### 6. Save and Wait

- Click **Save** on the API key configuration
- **Wait 5-10 minutes** for changes to propagate
- Clear browser cache and restart servers

## 🔧 Verify Configuration

After making changes, verify:

1. **API Key Restrictions:**
   - Application restrictions: HTTP referrers (web sites)
   - All localhost and production domains added

2. **APIs Enabled:**
   - Maps JavaScript API ✅
   - Places API (New) ✅
   - Geocoding API ✅

3. **Billing:**
   - Billing account linked ✅
   - Billing enabled ✅

## 🧪 Test After Fix

1. Clear browser cache
2. Restart frontend server: `cd frontend && npm run dev`
3. Open browser console
4. Navigate to post-ad page
5. Check for:
   - ✅ "Google Places API loaded successfully"
   - ✅ "Autocomplete initialized successfully"
   - ❌ No "RefererNotAllowedMapError"

## 📝 Current API Key

```
AIzaSyBbfxACAyCztP8_pNaoDSsMfqN_N66E58w
```

## 🚨 Common Mistakes

1. **Wrong API enabled:** Using Places API (Legacy) instead of Places API (New)
2. **Missing wildcards:** Forgetting `/*` at the end of referrers
3. **Wrong protocol:** Using `http://` for production (should be `https://`)
4. **Not waiting:** Changes take 5-10 minutes to propagate
5. **Billing not enabled:** Required even for free tier usage

## 📞 Need Help?

If still getting errors after following these steps:
1. Check browser console for exact error message
2. Verify API key is correct in `.env` files
3. Check Google Cloud Console → APIs & Services → Dashboard for API usage
4. Verify billing account is active





