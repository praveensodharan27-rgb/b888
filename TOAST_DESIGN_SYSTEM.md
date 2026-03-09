# Toast Design System

Modern, clean, user-friendly toast notifications for the SellIt marketplace app (OLX-like).

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Minimal** | Clean layout, no clutter |
| **Rounded** | 12px (rounded-xl) corners |
| **Soft shadow** | `0 10px 40px -10px rgba(0,0,0,0.15)` |
| **Smooth animation** | 250–300ms slide + fade |
| **Mobile-first** | Touch-friendly, swipe to dismiss |
| **3s auto-dismiss** | Configurable duration |
| **High contrast** | WCAG-friendly text |

---

## Color System

| Type | Color | Usage |
|------|-------|-------|
| **Success** | Emerald (#059669) | Confirmations, success states |
| **Error** | Red (#dc2626) | Failures, policy violations |
| **Warning** | Amber (#ea580c) | Validation, cautions |
| **Info** | Blue (#2563eb) | Informational, in-progress |

---

## Position

| Viewport | Position |
|----------|----------|
| **Mobile** (<640px) | Bottom center, above safe area |
| **Desktop** (≥640px) | Top right |

---

## Predefined Messages

### 1. Ad Posted Successfully
- **Title:** Success  
- **Message:** Your ad is live 🎉 More buyers will see it now.  
- **Type:** success  

### 2. Ad Under Review
- **Title:** Under Review  
- **Message:** Your ad is being reviewed. We'll notify you soon.  
- **Type:** info  

### 3. Ad Rejected (Policy)
- **Title:** Rejected  
- **Message:** This ad violates our content policy. Please update and retry.  
- **Type:** error  

### 4. Image Upload Failed
- **Title:** Upload Failed  
- **Message:** Could not upload image. Please try again.  
- **Type:** error  

### 5. Nudity Detected
- **Title:** Not Allowed  
- **Message:** Adult content is not permitted. Please upload another image.  
- **Type:** error  

### 6. Network Error
- **Title:** Connection Error  
- **Message:** No internet. Check your connection.  
- **Type:** error  

### 7. Login Success
- **Title:** Welcome  
- **Message:** Login successful. Happy selling!  
- **Type:** success  

### 8. Form Validation Error
- **Title:** Missing Info  
- **Message:** Please fill all required fields.  
- **Type:** warning  

### 9. Premium Activated
- **Title:** Premium Active  
- **Message:** Your ad is boosted 🚀 Enjoy more visibility!  
- **Type:** success  

### 10. Draft Saved
- **Title:** Saved  
- **Message:** Your draft is saved successfully.  
- **Type:** success  

---

## Usage

### Predefined Messages (recommended)

```tsx
import toast from '@/lib/toast';

// Ad flows
toast.adPostedSuccess();
toast.adUnderReview();
toast.adRejected();
toast.premiumActivated();
toast.draftSaved();

// Errors
toast.imageUploadFailed();
toast.nudityDetected();
toast.networkError();
toast.formValidationError();

// Auth
toast.loginSuccess();
```

### Custom Messages

```tsx
import toast from '@/lib/toast';

// With title + message
toast.success('Success', 'Your changes were saved.');
toast.error('Error', 'Something went wrong.');
toast.warning('Caution', 'This action cannot be undone.');
toast.info('Tip', 'You can edit this later.');

// Single message (backward compatible)
toast.success('Saved successfully!');
toast.error('Upload failed. Try again.');
```

### With Options

```tsx
toast.adPostedSuccess({
  duration: 5000,
  actionLabel: 'View Ad',
  onAction: () => router.push('/my-ads'),
});
```

---

## UI Layout

```
┌─────────────────────────────────────────────┐
│ [icon]  Title                           [×]  │
│         Message text here.                   │
│         [Action button]                      │
└─────────────────────────────────────────────┘
```

- **Icon:** Colored circle (success/error/warning/info)
- **Title:** 14px, font-medium, truncated
- **Message:** 14px, 1.4 line-height, wraps
- **Action:** Optional, underlined link style
- **Dismiss:** × button, always visible

---

## Animation

| State | Animation |
|-------|-----------|
| **Enter (mobile)** | translateY(16px) → 0, opacity 0 → 1 |
| **Enter (desktop)** | translateX(24px) → 0, opacity 0 → 1 |
| **Exit** | opacity 1 → 0, 200ms |
| **Swipe** | Horizontal swipe >80px dismisses |

---

## Migration from react-hot-toast

Replace:

```tsx
import toast from 'react-hot-toast';
toast.success('Ad posted successfully!');
```

With:

```tsx
import toast from '@/lib/toast';
toast.adPostedSuccess();
// or
toast.success('Success', 'Ad posted successfully!');
```

Backward compatibility: `toast.success('message')` still works (single-arg).

---

## Best UX Practices

1. **Be concise** – One clear idea per toast.
2. **Be positive** – Use “Saved” not “Save failed to fail”.
3. **Be actionable** – When useful, add “Retry” or “View”.
4. **Avoid stacking** – Prefer replacing over stacking many toasts.
5. **Respect duration** – Errors 4–5s, success 3s.
6. **Use the right type** – success / error / warning / info.
7. **Avoid jargon** – “Connection error” > “ECONNREFUSED”.
8. **One emoji max** – Use sparingly for success states.

---

## Files

| File | Purpose |
|------|---------|
| `lib/toast.ts` | API, messages, types |
| `components/ui/Toast.tsx` | Toast UI component |
| `components/AppToast.tsx` | Toaster with responsive position |
| `app/globals.css` | Toast animations |
