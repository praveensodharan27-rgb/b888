# Quick Google OAuth Setup Guide

## Important: You Need OAuth Credentials, Not API Key

The key you provided (`AIzaSyBqX_pAIK_mFm9hU8LKSJ4H62VgMjA5LFA`) is a **Google API Key**, which is different from **OAuth 2.0 credentials** needed for social login.

## How to Get Google OAuth Credentials

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create or Select a Project
- Create a new project or select an existing one

### Step 3: Enable OAuth Consent Screen
1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account)
3. Fill in:
   - App name: "SellIt" (or your app name)
   - User support email: Your email
   - Developer contact: Your email
4. Click **"Save and Continue"**
5. Skip "Scopes" for now, click **"Save and Continue"**
6. Add test users if needed, click **"Save and Continue"**
7. Review and go back to dashboard

### Step 4: Create OAuth 2.0 Credentials
1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. If prompted, configure OAuth consent screen (do Step 3 first)
4. Choose **"Web application"** as application type
5. Name it: "SellIt Web Client" (or any name)
6. Add **Authorized redirect URIs**:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
   (For production, also add: `https://yourdomain.com/api/auth/google/callback`)
7. Click **"CREATE"**
8. **Copy the Client ID and Client Secret** (you'll see them in a popup)

### Step 5: Add to .env File

Add these to your `backend/.env` file:

```env
# Google OAuth (NOT API Key)
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Optional: Keep your API key for other Google services
GOOGLE_API_KEY=AIzaSyBqX_pAIK_mFm9hU8LKSJ4H62VgMjA5LFA
```

## What's the Difference?

- **API Key**: Used for accessing Google APIs (Maps, Translate, etc.)
- **OAuth Client ID/Secret**: Used for user authentication/login

For social login, you need **OAuth Client ID and Secret**, not the API key.

## After Setup

1. Restart the backend server
2. Try logging in with Google on http://localhost:3000/login
3. You should be redirected to Google for authentication

## Troubleshooting

**"Error 400: redirect_uri_mismatch"**
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:5000/api/auth/google/callback`
- No trailing slashes!

**"OAuth client not found"**
- Double-check the Client ID and Secret are correct
- Make sure you copied the full Client ID (ends with `.apps.googleusercontent.com`)

