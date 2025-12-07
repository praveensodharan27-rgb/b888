# Google Maps Geocoding API Setup

## ⚠️ Error: "This API project is not authorized to use this API"

This error means the **Geocoding API** is not enabled for your Google Cloud project.

## 🔧 Quick Fix Guide:

### Step 1: Access Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. **Sign in** with your Google account
3. **Select your project** (or create a new one if needed)
   - If you don't know which project, check the API key details

### Step 2: Enable Geocoding API (CRITICAL)
1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. In the search bar, type: **"Geocoding API"**
3. Click on **"Geocoding API"** from the search results
4. Click the big blue **"Enable"** button
5. Wait 10-30 seconds for it to enable (you'll see a success message)

### Step 3: Verify API Key Configuration
1. Go to **APIs & Services** → **Credentials**
2. Find your API key: `AIzaSyDufUVTJcEr5UMqg8-LgoY4mCHu66-_mUA`
3. **Click on the key name** to edit it
4. Under **"API restrictions"**:
   - **Option A (Recommended for testing)**: Select **"Don't restrict key"**
   - **Option B (Production)**: Select **"Restrict key"** → Add **"Geocoding API"** to the list
5. Under **"Application restrictions"** (if set):
   - For development: Set to **"None"**
   - For production: Add your server IP or domain
6. Click **"Save"** at the bottom

### Step 4: Verify API is Enabled
1. Go to **APIs & Services** → **Enabled APIs**
2. You should see **"Geocoding API"** in the list
3. If not, go back to Step 2

### Step 5: Restart Backend Server
After enabling the API, **restart your backend server**:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd D:\sellit\backend
npm run dev
```

### Step 6: Test the Fix
1. Open your app: `http://localhost:3000`
2. Go to the Post Ad page
3. Click "Auto Detect Location"
4. The error should be gone! ✅

## Required APIs to Enable:

Make sure these APIs are enabled in your Google Cloud project:
- ✅ **Geocoding API** (Required for address ↔ coordinates conversion)
- ✅ **Maps JavaScript API** (Optional, if using maps in frontend)
- ✅ **Places API** (Optional, for place autocomplete)

## Verify API is Enabled:

1. Go to **APIs & Services** → **Enabled APIs**
2. You should see **"Geocoding API"** in the list
3. If not, follow Step 2 above

## Testing:

After enabling, test the geocoding endpoint:
- **POST** `/api/geocoding/detect-location` with `{ latitude, longitude }`
- **POST** `/api/geocoding/geocode-address` with `{ address }`

## Common Issues:

1. **"API not enabled"** → Enable Geocoding API (Step 2)
2. **"Request denied"** → Check API key restrictions (Step 3)
3. **"Quota exceeded"** → Check your billing/quota limits
4. **"Invalid key"** → Verify the API key is correct
5. **"The provided API key is expired"** → Generate a new API key (see below)

## ⚠️ Expired API Key Fix:

If you see the error: **"The provided API key is expired"**, you need to generate a new API key:

### Step 1: Create a New API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy the new API key (it will look like: `AIzaSy...`)

### Step 2: Configure the New API Key
1. Click on the new API key to edit it
2. Give it a name (e.g., "Geocoding API Key")
3. Under **"API restrictions"**:
   - Select **"Don't restrict key"** (for testing)
   - OR select **"Restrict key"** and add **"Geocoding API"**
4. Under **"Application restrictions"**:
   - Set to **"None"** (for development)
5. Click **"Save"**

### Step 3: Enable Geocoding API for the New Key
1. Make sure **Geocoding API** is enabled (Step 2 above)
2. The new API key will automatically have access if Geocoding API is enabled

### Step 4: Update Your .env File
1. Open `backend/.env`
2. Update the `GOOGLE_MAPS_API_KEY` value:
   ```env
   GOOGLE_MAPS_API_KEY=YOUR_NEW_API_KEY_HERE
   ```
3. Save the file

### Step 5: Restart Backend Server
```bash
# Stop the current server (Ctrl+C)
cd D:\sellit\backend
npm run dev
```

## API Key:
Current key in code: `AIzaSyBnFPaORmcuPd-TqYUSW6iqEJUczimguk8` (check your `.env` file)

Make sure your API key:
- ✅ Is not expired
- ✅ Has Geocoding API enabled
- ✅ Has no restrictions (or proper restrictions set)
- ✅ Is from the correct Google Cloud project

