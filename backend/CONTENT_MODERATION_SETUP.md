# Content Moderation Setup Guide

This application uses Google Cloud Vision API to detect nudity and adult content in images and text when ads are posted.

## Setup Instructions

### 1. Enable Google Cloud Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"

### 2. Create Service Account and Download Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Grant the role: **Cloud Vision API User**
5. Click "Create and Continue"
6. Click "Done"
7. Click on the created service account
8. Go to "Keys" tab
9. Click "Add Key" > "Create new key"
10. Choose "JSON" format
11. Download the JSON key file

### 3. Configure Environment Variables

Add the following to your `.env` file:

```env
# Google Cloud Vision API Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# OR use API Key (simpler but less secure)
GOOGLE_CLOUD_VISION_API_KEY=your-api-key-here
```

**Option 1: Service Account (Recommended)**
- Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your downloaded JSON key file
- Set `GOOGLE_CLOUD_PROJECT_ID` to your Google Cloud project ID

**Option 2: API Key (Simpler)**
- Create an API key in Google Cloud Console
- Set `GOOGLE_CLOUD_VISION_API_KEY` to your API key
- Restrict the API key to Cloud Vision API only for security

### 4. Install Dependencies

```bash
cd backend
npm install @google-cloud/vision
```

### 5. Test the Setup

The content moderation will automatically run when ads are posted. If configured correctly, you'll see:

```
✅ Google Cloud Vision API initialized
🔍 Checking content for nudity and adult content...
✅ Content moderation passed
```

If not configured, you'll see:

```
⚠️ Google Cloud Vision API credentials not found. Content moderation disabled.
```

## How It Works

1. **Image Detection**: When an ad is posted, all images are checked using Google Cloud Vision API's SafeSearch detection
2. **Text Detection**: Title and description are checked for adult keywords
3. **Automatic Rejection**: If nudity or adult content is detected:
   - Ad is automatically rejected
   - Status is set to `REJECTED`
   - User receives an error message
   - Payment (if any) is marked for refund

## Detection Levels

The API returns likelihood levels:
- `VERY_UNLIKELY` - Safe
- `UNLIKELY` - Safe
- `POSSIBLE` - Safe (borderline)
- `LIKELY` - Unsafe (rejected)
- `VERY_LIKELY` - Unsafe (rejected)

## Cost Considerations

Google Cloud Vision API pricing:
- First 1,000 units/month: **FREE**
- 1,001-5,000,000 units: **$1.50 per 1,000 units**
- Each image = 1 unit

For a marketplace with moderate traffic, costs should be minimal.

## Troubleshooting

### Error: "API key not valid"
- Check that your API key is correct
- Ensure the API key is enabled
- Verify the API key has Cloud Vision API access

### Error: "Permission denied"
- Check service account permissions
- Ensure the service account has "Cloud Vision API User" role
- Verify the JSON key file path is correct

### Content moderation not working
- Check console logs for initialization messages
- Verify environment variables are set correctly
- Ensure `@google-cloud/vision` package is installed

## Disabling Content Moderation

If you need to disable content moderation temporarily:

1. Remove or comment out the environment variables
2. The service will log a warning and allow all content through
3. This is **NOT recommended** for production
