# Push Notifications Setup Guide

This guide explains how to set up push notifications for the SellIt application.

## Prerequisites

- Node.js installed
- Backend server running
- Frontend server running

## Step 1: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

Run the following command in the backend directory:

```bash
cd backend
npx web-push generate-vapid-keys
```

This will output something like:

```
=======================================

Public Key:
BGx8...your-public-key...xyz

Private Key:
abc123...your-private-key...xyz

=======================================
```

## Step 2: Add VAPID Keys to Environment Variables

Add the following to your `backend/.env` file:

```env
VAPID_PUBLIC_KEY=BGx8...your-public-key...xyz
VAPID_PRIVATE_KEY=abc123...your-private-key...xyz
VAPID_SUBJECT=mailto:support@sellit.com
```

**Important Notes:**
- Replace the values with your actual keys from Step 1
- The `VAPID_SUBJECT` should be a valid email address or `mailto:` URL
- Keep the private key secure and never commit it to version control

## Step 3: Restart Backend Server

After adding the VAPID keys, restart your backend server:

```bash
cd backend
npm run dev
```

## Step 4: Test Push Notifications

1. **Open the application** in a supported browser (Chrome, Firefox, Edge)
2. **Log in** to your account
3. **Enable push notifications** when prompted, or go to Profile → Notification Settings
4. **Update an offer** in the admin panel to trigger a test notification

## How It Works

### Backend

- **Push Subscription Storage**: User push subscriptions are stored in the `PushSubscription` table
- **Notification Sending**: When offers are updated, the system sends:
  - Email notifications (to all users with email)
  - SMS notifications (to all users with phone)
  - Push notifications (to all users with active subscriptions)

### Frontend

- **Service Worker**: A service worker (`/sw.js`) handles incoming push notifications
- **Subscription Management**: Users can enable/disable push notifications from their profile
- **Automatic Prompt**: New users are prompted to enable push notifications after logging in

## API Endpoints

- `GET /api/push/vapid-key` - Get VAPID public key (public)
- `POST /api/push/subscribe` - Subscribe to push notifications (authenticated)
- `POST /api/push/unsubscribe` - Unsubscribe from push notifications (authenticated)

## Browser Support

Push notifications are supported in:
- Chrome (Desktop & Android)
- Firefox (Desktop & Android)
- Edge (Desktop)
- Safari (macOS & iOS) - Limited support

## Troubleshooting

### Push notifications not working?

1. **Check VAPID keys**: Ensure they're correctly set in `.env`
2. **Check browser support**: Verify your browser supports push notifications
3. **Check permissions**: Ensure notification permission is granted
4. **Check service worker**: Open DevTools → Application → Service Workers
5. **Check console**: Look for errors in the browser console

### Service worker not registering?

- Ensure the app is served over HTTPS (or localhost for development)
- Check that `/sw.js` is accessible at the root of your public directory
- Clear browser cache and reload

### Notifications not received?

- Check that the user has subscribed (Profile → Notification Settings)
- Verify the subscription is saved in the database
- Check backend logs for push notification errors
- Ensure the browser is not blocking notifications

## Security Notes

- VAPID private key must be kept secret
- Only the public key is sent to the frontend
- Subscriptions are tied to user accounts
- Invalid subscriptions are automatically removed

## Production Deployment

For production:

1. Generate production VAPID keys
2. Add them to your production environment variables
3. Ensure your domain is served over HTTPS
4. Update `VAPID_SUBJECT` with your production contact email
5. Test push notifications thoroughly before going live

