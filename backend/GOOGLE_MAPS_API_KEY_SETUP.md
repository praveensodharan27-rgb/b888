# Google Maps API Key Setup for Backend Geocoding

## Problem
When using Google Geocoding API from the backend, you get this error:
```
API keys with referer restrictions cannot be used with this API.
```

## Solution
You need **TWO separate API keys**:
1. **Browser Key** (with referrer restrictions) - for frontend
2. **Server Key** (with IP restrictions or no restrictions) - for backend

## Step-by-Step Setup

### Step 1: Create Server-Side API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **API key**
5. Name it: **"Server-side Geocoding API Key"**
6. Click **RESTRICT KEY**

### Step 2: Configure Server Key Restrictions

**IMPORTANT**: For server-side keys, use **IP restrictions**, NOT referrer restrictions.

1. Under **Application restrictions**, select **IP addresses (web servers, cron jobs, etc.)**
2. Add your server IP addresses:
   - Your production server IP
   - `0.0.0.0/0` for development (or your local IP)
   - Your EC2/cloud server IP if using AWS/GCP

3. Under **API restrictions**, select **Restrict key**
4. Enable these APIs:
   - ✅ **Geocoding API** (Required)
   - ✅ **Maps JavaScript API** (if needed)
   - ✅ **Places API** (if needed)

5. Click **SAVE**

### Step 3: Update Environment Variables

Add the server-side key to your `.env` file:

```env
# Browser API Key (for frontend - with referrer restrictions)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_key_here

# Server API Key (for backend - with IP restrictions or no restrictions)
GOOGLE_MAPS_API_KEY=your_server_key_here
```

### Step 4: Verify Setup

1. **Browser Key** should have:
   - ✅ Referrer restrictions (HTTP referrers)
   - ✅ Maps JavaScript API enabled
   - ✅ Places API enabled

2. **Server Key** should have:
   - ✅ IP restrictions (NOT referrer restrictions)
   - ✅ Geocoding API enabled
   - ✅ Can be used from backend server

## Alternative: Use IP Restrictions for Server Key

If you can't use IP restrictions, you can:
1. Create a server key with **NO restrictions** (less secure, only for development)
2. Or use **API restrictions only** (restrict which APIs can be used)

## Testing

After setup, test the geocoding endpoint:
```bash
curl -X POST http://localhost:5000/api/geocoding/detect-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"latitude": 9.9312, "longitude": 76.2673}'
```

You should get a successful response without the "referer restrictions" error.

## Security Notes

⚠️ **Important**:
- Never expose server-side API key in frontend code
- Use IP restrictions for server keys in production
- Monitor API usage in Google Cloud Console
- Set up billing alerts to prevent unexpected charges

## Troubleshooting

### Error: "API keys with referer restrictions cannot be used with this API"
- **Cause**: Using browser key (with referrer restrictions) in backend
- **Fix**: Use server key (with IP restrictions) in backend

### Error: "This API key is not authorized"
- **Cause**: Geocoding API not enabled for the key
- **Fix**: Enable Geocoding API in Google Cloud Console

### Error: "Request denied"
- **Cause**: IP address not in allowed list
- **Fix**: Add your server IP to the IP restrictions list
