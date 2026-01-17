# Firebase Push Notifications - Quick Start

## ✅ What's Already Set Up

1. ✅ Firebase SDK installed (`firebase` package)
2. ✅ Firebase configuration file (`frontend/lib/firebase.ts`)
3. ✅ Firebase Messaging service (`frontend/lib/firebaseMessaging.ts`)
4. ✅ Service workers configured (`/public/sw.js` and `/public/firebase-messaging-sw.js`)
5. ✅ Push notifications hook updated (`frontend/hooks/usePushNotifications.ts`)
6. ✅ Firebase Provider component (`frontend/components/FirebaseProvider.tsx`)
7. ✅ Provider integrated into app (`frontend/app/providers.tsx`)

## 🚀 Next Steps (Required)

### 1. Get VAPID Key from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **olxapp-71912**
3. Click **⚙️ Settings** → **Project settings**
4. Go to **Cloud Messaging** tab
5. Under **Web Push certificates**, click **Generate key pair** (if not already generated)
6. Copy the **Key pair** value

### 2. Add to Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

**Example:**
```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI...
```

### 3. Restart Development Server

```bash
cd frontend
npm run dev
```

## 🧪 Testing

1. **Open your app** in browser
2. **Login** to your account
3. **Allow notifications** when prompted
4. **Check browser console** - you should see:
   - `Firebase Messaging initialized`
   - `FCM Token: ...` (after subscribing)

## 📝 Usage Example

The push notifications are automatically handled. Users can enable/disable via the existing `PushNotificationPrompt` component.

To manually control:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { subscribe, unsubscribe, isSubscribed, useFirebase, fcmToken } = usePushNotifications();
  
  return (
    <button onClick={isSubscribed ? unsubscribe : subscribe}>
      {isSubscribed ? 'Disable' : 'Enable'} Notifications
    </button>
  );
}
```

## 🔍 Verify It's Working

1. **Check service worker**: Open DevTools → Application → Service Workers
   - Should see `/firebase-messaging-sw.js` registered

2. **Check FCM token**: After subscribing, check console for FCM token

3. **Test notification**: Use Firebase Console → Cloud Messaging → Send test message

## ⚠️ Important Notes

- **HTTPS Required**: Push notifications require HTTPS in production (localhost works for development)
- **Browser Support**: Chrome, Firefox, Edge support FCM. Safari uses APNs.
- **Fallback**: If Firebase isn't configured, app falls back to VAPID-based notifications

## 🐛 Troubleshooting

**No FCM token?**
- Check VAPID key is set in `.env.local`
- Check browser console for errors
- Verify service worker is registered

**Notifications not showing?**
- Check notification permission is granted
- Check service worker is active
- Verify FCM token is saved to backend

---

For detailed setup, see `FIREBASE_SETUP.md`

