# Location Feature – Setup & Usage

## Quick Setup

### 1. Add API key to frontend

Create or edit `frontend/.env.local`:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Restart dev server

After changing `.env.local`, restart the Next.js dev server:

```bash
cd frontend
npm run dev
```

### 3. Enable APIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Library**
3. Enable:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**

### 4. API key restrictions (if used)

If you restrict the API key, add these HTTP referrers:

- `http://localhost:3000/*`
- `http://localhost:3001/*`
- `https://yourdomain.com/*`

---

## How to Use Location

### Navbar – change location

1. Click the **location** field in the navbar (e.g. "Mumbai" or "Select location").
2. Type a city name (e.g. "Kochi", "Delhi").
3. Pick a suggestion from the dropdown.
4. Ads will filter by that location.

### Post Ad – add location

1. Open **Post Ad**.
2. In the **Location** field, type a city or area.
3. Choose from the suggestions.
4. Or use the map to pick a point.

### GPS – detect my location

1. Click **Detect my location** (or similar) in the navbar.
2. Allow location access in the browser.
3. Your city/area is set automatically.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No autocomplete suggestions | Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `frontend/.env.local` and restart dev server |
| "RefererNotAllowedMapError" | Add your domain to API key HTTP referrer restrictions |
| Location stuck / loading | Ensure Maps JavaScript API and Places API are enabled in Google Cloud |
| Works on home, not on other pages | Should be fixed – Maps loads once globally via `GooglePlacesLoader` |
