# OpenAI Integration Setup

This application uses OpenAI API for AI-powered text generation, specifically for auto-generating product descriptions.

## Setup Instructions

### 1. Get Your OpenAI API Key

If you don't have an OpenAI API key yet:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section (https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Copy the key immediately (you won't be able to see it again)
6. Make sure you have credits/billing set up in your OpenAI account

**Important**: 
- OpenAI API keys should start with `sk-` (e.g., `sk-proj-...` or `sk-...`)
- The key you provided should be a valid OpenAI API key from https://platform.openai.com/api-keys
- Make sure your OpenAI account has billing enabled and sufficient credits

### 2. Add API Key to Environment Variables

Add the following to your `.env` file in the `backend` directory:

```env
OPENAI_API_KEY=your-actual-openai-api-key-here
```

**Replace `your-actual-openai-api-key-here` with your actual OpenAI API key from step 1.**

Example:
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789...
```

**Note**: Make sure:
- The key starts with `sk-`
- There are no extra spaces or quotes around the key
- The `.env` file is in the `backend` directory
- You restart the server after adding the key

### 3. Restart the Server

After adding the API key, restart your backend server:

```bash
npm run dev
```

## Features

- **Auto-generate product descriptions**: Users can click the "Auto Generate" button in the post-ad form to automatically generate compelling product descriptions using OpenAI GPT-3.5-turbo.

## API Endpoint

- **POST** `/api/ai/generate-description` - Generate product description
  - Requires authentication
  - Body: `{ title, price, condition, category, subcategory, location }`
  - Returns: `{ success: true, description: "..." }`

## Model Used

- **Model**: `gpt-3.5-turbo`
- **Max Tokens**: 300
- **Temperature**: 0.7

## Notes

- The API key is required for the feature to work
- Make sure your OpenAI account has sufficient credits
- The generated descriptions are between 100-200 words

