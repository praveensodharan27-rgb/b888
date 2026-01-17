# Google Maps API Setup Guide

## ⚠️ Error: "This API project is not authorized to use this API"

This error means the required Google Maps APIs are **not enabled** in your Google Cloud project.

## 🔧 Quick Fix - Enable Required APIs

### Step 1: Access Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. **Sign in** with your Google account
3. **Select your project** (or create a new one if needed)
   - If you don't know which project, check the API key details

### Step 2: Enable ALL Required APIs

You need to enable **4 APIs** for the application to work:

#### API 1: Geocoding API (Required for Backend)
1. Go to **APIs & Services** → **Library**
2. Search for: **"Geocoding API"**
3. Click on **"Geocoding API"**
4. Click **"Enable"** button
5. Wait for confirmation

#### API 2: Maps JavaScript API (Required for Frontend)
1. In the same Library page
2. Search for: **"Maps JavaScript API"**
3. Click on **"Maps JavaScript API"**
4. Click **"Enable"** button
5. Wait for confirmation

#### API 3: Places API (Required for Autocomplete)
1. In the same Library page
2. Search for: **"Places API"**
3. Click on **"Places API"**
4. Click **"Enable"** button
5. Wait for confirmation

#### API 4: Maps Embed API (Required for Map Display)
1. In the same Library page
2. Search for: **"Maps Embed API"**
3. Click on **"Maps Embed API"**
4. Click **"Enable"** button
5. Wait for confirmation

### Step 3: Verify APIs are Enabled
1. Go to **APIs & Services** → **Enabled APIs**
2. You should see all 4 APIs in the list:
   - ✅ Geocoding API
   - ✅ Maps JavaScript API
   - ✅ Places API
   - ✅ Maps Embed API

### Step 4: Configure API Key Restrictions (Optional but Recommended)

1. Go to **APIs & Services** → **Credentials**
2. Find your API key: `AIzaSyBnFPaORmcuPd-TqYUSW6iqEJUczimguk8`
3. **Click on the key name** to edit it
4. Under **"API restrictions"**:
   - **Option A (Recommended for testing)**: Select **"Don't restrict key"**
   - **Option B (Production)**: Select **"Restrict key"** → Add all 4 APIs:
     - Geocoding API
     - Maps JavaScript API
     - Places API
     - Maps Embed API
5. Under **"Application restrictions"** (if set):
   - For development: Set to **"None"**
   - For production: Add your server IP or domain
6. Click **"Save"** at the bottom

### Step 5: Enable Billing (Required)

Google Maps APIs require billing to be enabled:

1. Go to **Billing** in the left sidebar
2. If billing is not enabled:
   - Click **"Link a billing account"**
   - Add a payment method (credit card)
   - Google provides $200 free credit per month for Maps APIs
3. Wait for billing to activate (usually instant)

### Step 6: Restart Your Servers

After enabling the APIs, **restart both servers**:

**Backend:**
```bash
cd D:\sellit\backend
# Stop current server (Ctrl+C)
npm run dev
```

**Frontend:**
```bash
cd D:\sellit\frontend
# Stop current server (Ctrl+C)
npm run dev
```

### Step 7: Test the Fix

1. Open your app: `http://localhost:3000`
2. Go to the **Post Ad** page
3. Try:
   - **Type in location field** → Autocomplete should work
   - **Click "Auto Detect"** → Should detect your location
   - **Map should display** when location is selected

## 📋 Summary of Required APIs

| API Name | Used For | Required |
|----------|----------|----------|
| **Geocoding API** | Convert coordinates ↔ addresses (backend) | ✅ Yes |
| **Maps JavaScript API** | Load Google Maps library (frontend) | ✅ Yes |
| **Places API** | Location autocomplete (frontend) | ✅ Yes |
| **Maps Embed API** | Display maps in iframes (frontend) | ✅ Yes |

## 🔍 Verify API Status

To check if APIs are enabled:
1. Go to **APIs & Services** → **Enabled APIs**
2. Search for each API name
3. If not found, enable it from the Library

## ❌ Common Errors & Solutions

### Error: "This API project is not authorized to use this API"
**Solution:** Enable the specific API from the Library (Step 2)

### Error: "Request denied"
**Solution:** 
- Check API key restrictions (Step 4)
- Make sure the API is enabled
- Verify billing is enabled (Step 5)

### Error: "Quota exceeded"
**Solution:**
- Check your billing/quota limits
- Enable billing if not already done
- Wait for quota to reset (usually monthly)

### Error: "Invalid key"
**Solution:**
- Verify the API key is correct in `.env` files
- Make sure the key belongs to the correct project
- Check if the key is restricted and matches your setup

### Error: "The provided API key is expired"
**Solution:**
- Generate a new API key
- Update `.env` files with the new key
- Make sure all 4 APIs are enabled for the new key

## 📝 Environment Files

Make sure your API key is set in both:

**Backend:** `backend/.env`
```env
GOOGLE_MAPS_API_KEY=AIzaSyBnFPaORmcuPd-TqYUSW6iqEJUczimguk8
```

**Frontend:** `frontend/.env.local`
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBnFPaORmcuPd-TqYUSW6iqEJUczimguk8
```

## ✅ Quick Checklist

- [ ] Geocoding API enabled
- [ ] Maps JavaScript API enabled
- [ ] Places API enabled
- [ ] Maps Embed API enabled
- [ ] Billing enabled
- [ ] API key configured in backend/.env
- [ ] API key configured in frontend/.env.local
- [ ] Backend server restarted
- [ ] Frontend server restarted
- [ ] Tested autocomplete
- [ ] Tested auto detect
- [ ] Tested map display

## 🆘 Still Not Working?

1. **Check browser console** for specific error messages
2. **Check backend logs** for API errors
3. **Verify API key** is correct in both .env files
4. **Wait 1-2 minutes** after enabling APIs (they need time to propagate)
5. **Clear browser cache** and try again







