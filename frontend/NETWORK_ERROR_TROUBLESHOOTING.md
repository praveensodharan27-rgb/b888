# NetworkError when attempting to fetch resource

This console error usually means a request failed before getting a response (no server, CORS, or connection issue).

## Common causes and fixes

### 1. Backend API not running
- **Symptom:** Error when loading ads, login, or any API data.
- **Fix:** Start the backend server (e.g. `cd backend && npm run dev` or `node server.js`). Default API URL is `http://localhost:5000/api`.

### 2. Wrong API URL
- **Symptom:** All API calls fail.
- **Fix:** In `.env.local` set:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5000/api
  ```
  For production, use your real API base (e.g. `https://api.yoursite.com/api`). Restart the Next dev server after changing env.

### 3. Next.js chunk / HMR fetch failed
- **Symptom:** Error right after saving a file or navigating.
- **Fix:** Hard refresh (Ctrl+Shift+R) or restart `npm run dev`. If it keeps happening, delete `.next` and run `npm run dev` again.

### 4. CORS or firewall
- **Symptom:** Works in one browser/network, fails in another.
- **Fix:** Ensure the backend allows your frontend origin in CORS (e.g. `http://localhost:3000` for dev). Check firewall/antivirus isn’t blocking localhost.

### 5. Offline or unstable connection
- **Symptom:** Intermittent errors.
- **Fix:** Check WiFi/network. The app already shows a single console warning for network errors instead of multiple stack traces.

## What we do in the app

- **API errors:** Handled in `lib/api.ts` (timeout, no response). A throttled console hint is logged.
- **Unhandled network errors:** In `app/layout.tsx`, we catch `NetworkError` / “Failed to fetch” and log one short message so the console stays clear.

If the error persists, open DevTools → Network tab, reproduce the issue, and check which request fails (URL and status).
