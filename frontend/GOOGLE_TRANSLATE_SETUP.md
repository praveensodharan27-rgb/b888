# Google Cloud Translation API Setup

This guide will help you set up Google Cloud Translation API to translate all page content automatically.

## Prerequisites

1. A Google Cloud account
2. A Google Cloud project with billing enabled
3. Google Cloud Translation API enabled

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for your project (required for Translation API)

### 2. Enable Translation API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Cloud Translation API"
3. Click on it and click **Enable**

### 3. Create an API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the API key
4. (Optional) Restrict the API key to Cloud Translation API for security

### 4. Add API Key to Your Project

Add the API key to your `frontend/.env.local` file:

```env
NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY=your-api-key-here
```

### 5. Restart Your Development Server

After adding the API key, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

1. **Automatic Translation**: When a user selects a language from the dropdown, the `GoogleTranslateProvider` component automatically translates all page content using Google Cloud Translation API.

2. **Smart Translation**: The system:
   - Skips script, style, and other non-translatable elements
   - Respects `data-no-translate` attribute on elements
   - Caches translations for better performance
   - Restores original content when switching back to English

3. **Page-wide Translation**: All text content on the page is translated, including:
   - Navigation menus
   - Page content
   - Buttons and labels
   - Dynamic content

## Usage

The translation happens automatically when:
- A user selects a language from the language selector
- The page loads with a saved language preference (non-English)

## Cost Considerations

Google Cloud Translation API pricing:
- First 500,000 characters per month: **FREE**
- After that: $20 per 1 million characters

For most websites, the free tier should be sufficient.

## Security

**Important**: The API key is exposed in the frontend. To secure it:

1. **Restrict the API key** in Google Cloud Console:
   - Go to **APIs & Services** > **Credentials**
   - Click on your API key
   - Under **API restrictions**, select "Restrict key"
   - Choose "Cloud Translation API"
   - Under **Application restrictions**, you can restrict by HTTP referrer

2. **Use a backend proxy** (recommended for production):
   - Create an API endpoint on your backend
   - Store the API key on the server
   - Make translation requests through your backend

## Troubleshooting

### Translation not working?

1. Check if the API key is set in `.env.local`
2. Verify the API key is valid in Google Cloud Console
3. Check browser console for errors
4. Ensure Translation API is enabled in your Google Cloud project
5. Verify billing is enabled

### API quota exceeded?

- Check your usage in Google Cloud Console
- Consider implementing caching to reduce API calls
- Upgrade your quota if needed

## Disabling Translation

If you want to disable Google Cloud Translation and use only the built-in translations:

1. Remove or comment out `GoogleTranslateProvider` from `app/layout.tsx`
2. The built-in translation system will continue to work for components using the `useTranslation` hook

