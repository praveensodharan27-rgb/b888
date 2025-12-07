// Google Cloud Translation API integration
// Requires NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY in .env.local

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
const API_URL = 'https://translation.googleapis.com/language/translate/v2';

export interface TranslationResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

/**
 * Translate text using Google Cloud Translation API
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<string> {
  if (!API_KEY) {
    console.warn('Google Translate API key not configured');
    return text; // Return original text if API key is not set
  }

  if (!text || text.trim() === '') {
    return text;
  }

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Translate API error:', error);
      return text; // Return original text on error
    }

    const data: TranslationResponse = await response.json();
    return data.data.translations[0]?.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text on error
  }
}

/**
 * Translate multiple texts in a single API call
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<string[]> {
  if (!API_KEY) {
    console.warn('Google Translate API key not configured');
    return texts; // Return original texts if API key is not set
  }

  if (texts.length === 0) {
    return texts;
  }

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts.filter(t => t && t.trim() !== ''),
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Google Translate API error:', error);
      return texts; // Return original texts on error
    }

    const data: TranslationResponse = await response.json();
    const translations = data.data.translations.map(t => t.translatedText);
    
    // Map translations back to original array (preserving empty strings)
    let translationIndex = 0;
    return texts.map(text => {
      if (!text || text.trim() === '') {
        return text;
      }
      return translations[translationIndex++] || text;
    });
  } catch (error) {
    console.error('Translation error:', error);
    return texts; // Return original texts on error
  }
}

/**
 * Language code mapping for Google Cloud Translation API
 */
export const GOOGLE_LANGUAGE_CODES: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  ta: 'ta',
  te: 'te',
  bn: 'bn',
  mr: 'mr',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  or: 'or',
  as: 'as',
};

/**
 * Get Google Cloud Translation language code
 */
export function getGoogleLanguageCode(langCode: string): string {
  return GOOGLE_LANGUAGE_CODES[langCode] || 'en';
}

