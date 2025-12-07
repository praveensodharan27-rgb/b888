# Google Gemini Integration Setup

## Overview
This application uses Google Gemini API for AI-powered text generation, specifically for auto-generating product descriptions.

## Setup Instructions

### 1. Get Your Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Add API Key to Environment Variables
Add the following to your `backend/.env` file:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

Replace `your-gemini-api-key-here` with your actual Gemini API key.

### 3. Install Dependencies
The `@google/generative-ai` package should already be installed. If not, run:

```bash
cd backend
npm install @google/generative-ai
```

### 4. Restart the Server
After adding the API key, restart your backend server:

```bash
npm run dev
```

## Features
- **Auto-generate product descriptions**: Users can click the "Auto Generate" button in the post-ad form to automatically generate compelling product descriptions using Google Gemini Pro.

## API Endpoint
- `POST /api/ai/generate-description` - Generates product descriptions based on ad details

## Notes
- The API key is required for the AI description generation feature to work
- In development mode, if the API key is not configured, the feature will show an error message
- Make sure to keep your API key secure and never commit it to version control

