# Social Media OAuth Setup Guide

This application supports social media login/signup using Google and Facebook OAuth.

## Prerequisites

1. Google OAuth credentials (for Google login)
2. Facebook App credentials (for Facebook login)

## Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (for development)
     - `https://yourdomain.com/api/auth/google/callback` (for production)
5. Copy the Client ID and Client Secret

### 2. Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. Add "Facebook Login" product to your app
4. Configure OAuth Redirect URIs:
   - Go to "Settings" > "Basic"
   - Add authorized redirect URIs:
     - `http://localhost:5000/api/auth/facebook/callback` (for development)
     - `https://yourdomain.com/api/auth/facebook/callback` (for production)
5. Copy the App ID and App Secret

### 3. Environment Variables

Add the following to your `backend/.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Session Secret (for OAuth sessions)
SESSION_SECRET=your-random-secret-key-here

# Backend URL (for OAuth callbacks)
BACKEND_URL=http://localhost:5000

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:3000
```

### 4. Database Migration

Run the migration to add OAuth support:

```bash
cd backend
npx prisma migrate dev
```

### 5. Restart Servers

After setting up environment variables, restart both backend and frontend servers.

## How It Works

1. User clicks "Sign in with Google" or "Sign in with Facebook" on login/register page
2. User is redirected to the OAuth provider (Google/Facebook)
3. User authorizes the application
4. OAuth provider redirects back to the backend callback URL
5. Backend creates/updates user account and generates JWT token
6. User is redirected to frontend with token
7. Frontend stores token and logs user in

## Features

- **Automatic account creation**: New users are automatically created when they sign in with social media
- **Account linking**: If a user with the same email exists, the social account is linked
- **Email verification**: Social media accounts are automatically verified
- **Avatar sync**: Profile pictures from social media are automatically synced

## Troubleshooting

### OAuth not working?

1. Check that environment variables are set correctly
2. Verify redirect URIs match exactly in OAuth provider settings
3. Ensure backend server is running on the correct port
4. Check browser console and backend logs for errors

### "Invalid redirect URI" error?

- Make sure the redirect URI in your OAuth provider settings exactly matches:
  - Development: `http://localhost:5000/api/auth/google/callback`
  - Production: `https://yourdomain.com/api/auth/google/callback`

### User not being created?

- Check backend logs for errors
- Verify database migration was applied
- Ensure Prisma client is regenerated: `npx prisma generate`

