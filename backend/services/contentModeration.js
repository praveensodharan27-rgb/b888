const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || 'AIzaSyB2Zh4UsGrLU1LB0emRfQCa12Azg-mfLUM';
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GOOGLE_VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Moderate text content using Gemini API
 * Returns moderation results with categories
 */
async function moderateText(text) {
  try {
    if (!GEMINI_API_KEY) {
      console.warn('⚠️  Gemini API key not configured, skipping moderation');
      return {
        flagged: false,
        categories: {},
        message: 'Moderation API not configured'
      };
    }

    const prompt = `Analyze this text for inappropriate content. Check for:
- Nudity or sexual content
- Violence or gore
- Hate speech or discrimination
- Harassment or bullying
- Illegal activities
- Self-harm content

Text to analyze:
"${text}"

Respond ONLY with JSON in this exact format:
{"flagged": true/false, "categories": ["category1", "category2"], "reason": "explanation"}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Check if response has data
    if (!response || !response.data) {
      console.warn('No data in Gemini response');
      return { flagged: false, categories: [], error: 'No data' };
    }

    // Check if response has candidates
    if (!response.data.candidates || response.data.candidates.length === 0) {
      console.warn('No candidates in Gemini response');
      return { flagged: false, categories: [], error: 'No candidates' };
    }

    const candidate = response.data.candidates[0];
    
    // Check if candidate has content
    if (!candidate || !candidate.content) {
      console.warn('No content in candidate');
      return { flagged: false, categories: [], error: 'No content' };
    }

    // Check if content has parts
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
      console.warn('No parts in content');
      return { flagged: false, categories: [], error: 'No parts' };
    }

    const result = candidate.content.parts[0].text;
    
    if (!result) {
      console.warn('No text in parts');
      return { flagged: false, categories: [], error: 'No text' };
    }
    
    console.log('📝 Gemini text response:', result.substring(0, 200));
    
    // Parse JSON response - look for JSON in markdown code blocks or plain
    try {
      // Remove markdown code blocks if present
      let jsonText = result;
      if (result.includes('```json')) {
        const jsonMatch = result.match(/```json\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
      } else if (result.includes('```')) {
        const jsonMatch = result.match(/```\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
      }
      
      // Try to find JSON object
      const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonObjMatch) {
        const parsed = JSON.parse(jsonObjMatch[0]);
        console.log('✅ Parsed Gemini response:', parsed);
        return {
          flagged: parsed.flagged || false,
          categories: parsed.categories || [],
          reason: parsed.reason || '',
          model: 'gemini-2.5-flash'
        };
      }
    } catch (parseError) {
      console.warn('Could not parse JSON, analyzing text manually');
    }
    
    // Fallback: Check for key phrases in response
    const lowerResult = result.toLowerCase();
    const flagged = lowerResult.includes('not safe') ||
                    lowerResult.includes('inappropriate') || 
                    lowerResult.includes('sexual') ||
                    lowerResult.includes('nudity') ||
                    lowerResult.includes('violence') ||
                    lowerResult.includes('hate') ||
                    lowerResult.includes('"flagged": true') ||
                    lowerResult.includes('flagged: true');
    
    console.log(`🔍 Fallback analysis: flagged=${flagged}`);
    
    return {
      flagged,
      categories: flagged ? ['flagged_content'] : [],
      reason: result.substring(0, 200),
      model: 'gemini-2.5-flash'
    };
  } catch (error) {
    console.error('Text moderation error:', error.response?.data || error.message);
    // Don't fail ad creation if moderation fails
    return {
      flagged: false,
      categories: {},
      error: error.message
    };
  }
}

/**
 * Check if image URL contains inappropriate content
 * Uses Google Cloud Vision API SafeSearch to detect adult content
 */
async function moderateImage(imageUrl) {
  try {
    if (!GOOGLE_VISION_API_KEY) {
      console.warn('⚠️  Google Vision API key not configured, skipping image moderation');
      return {
        safe: true,
        message: 'Image moderation API not configured'
      };
    }

    // Fetch image and convert to base64
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    // Use Google Cloud Vision API SafeSearch
    const response = await axios.post(
      `${GOOGLE_VISION_URL}?key=${GOOGLE_VISION_API_KEY}`,
      {
        requests: [{
          image: {
            content: imageBase64
          },
          features: [{
            type: 'SAFE_SEARCH_DETECTION',
            maxResults: 1
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Check response
    if (!response.data || !response.data.responses || response.data.responses.length === 0) {
      console.warn('No response from Google Vision API');
      return {
        safe: true,
        error: 'No response from API'
      };
    }

    const safeSearchAnnotation = response.data.responses[0].safeSearchAnnotation;
    
    if (!safeSearchAnnotation) {
      console.warn('No SafeSearch annotation in response');
      return {
        safe: true,
        error: 'No SafeSearch data'
      };
    }

    console.log('🖼️  SafeSearch results:', safeSearchAnnotation);

    // SafeSearch likelihood levels: UNKNOWN, VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
    // Reject if adult or racy content is LIKELY or VERY_LIKELY
    const adult = safeSearchAnnotation.adult;
    const racy = safeSearchAnnotation.racy;
    const violence = safeSearchAnnotation.violence;

    const isUnsafe = 
      adult === 'LIKELY' || adult === 'VERY_LIKELY' ||
      racy === 'LIKELY' || racy === 'VERY_LIKELY';

    const categories = [];
    let reason = '';

    if (adult === 'LIKELY' || adult === 'VERY_LIKELY') {
      categories.push('adult_content');
      reason += 'Adult/nudity content detected. ';
    }
    if (racy === 'LIKELY' || racy === 'VERY_LIKELY') {
      categories.push('sexual_content');
      reason += 'Sexual/racy content detected. ';
    }
    if (violence === 'LIKELY' || violence === 'VERY_LIKELY') {
      categories.push('violence');
      reason += 'Violent content detected. ';
    }

    return {
      safe: !isUnsafe,
      reason: reason.trim() || 'Image is safe for general audience',
      categories: categories,
      safeSearchScores: {
        adult: adult,
        racy: racy,
        violence: violence,
        medical: safeSearchAnnotation.medical,
        spoof: safeSearchAnnotation.spoof
      }
    };
  } catch (error) {
    console.error('Image moderation error:', error.response?.data || error.message);
    // Don't fail ad creation if image moderation fails
    return {
      safe: true,
      error: error.message
    };
  }
}

/**
 * Fetch image and convert to base64
 */
async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error('Error fetching image:', error.message);
    throw error;
  }
}

/**
 * Moderate entire ad (title + description + images)
 * Returns comprehensive moderation result
 */
async function moderateAd(title, description, imageUrls = []) {
  console.log('🔍 Starting content moderation...');
  
  try {
    // Moderate text (title + description combined)
    const textToModerate = `${title}\n\n${description}`;
    const textModeration = await moderateText(textToModerate);
    
    console.log('📝 Text moderation result:', {
      flagged: textModeration.flagged,
      categories: Object.keys(textModeration.categories || {}).filter(key => textModeration.categories[key])
    });

    // Moderate images (only first 3 to save API costs)
    const imagesToCheck = imageUrls.slice(0, 3);
    const imageResults = [];
    
    for (const imageUrl of imagesToCheck) {
      // Only check HTTP/HTTPS URLs, skip local file paths
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const imageModeration = await moderateImage(imageUrl);
        imageResults.push({
          url: imageUrl,
          ...imageModeration
        });
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('🖼️  Image moderation results:', imageResults.length > 0 ? imageResults.map(r => ({
      safe: r.safe,
      reason: r.reason?.substring(0, 50)
    })) : 'No images checked');

    // Determine if ad should be rejected
    const hasInappropriateText = textModeration.flagged;
    const hasInappropriateImages = imageResults.some(img => !img.safe);
    const shouldReject = hasInappropriateText || hasInappropriateImages;

    // Build rejection reason
    let rejectionReason = '';
    const flaggedCategories = [];
    
    if (hasInappropriateText) {
      const flaggedTextCategories = Object.keys(textModeration.categories || {})
        .filter(key => textModeration.categories[key]);
      flaggedCategories.push(...flaggedTextCategories);
      rejectionReason += `Inappropriate content detected in text: ${flaggedTextCategories.join(', ')}. `;
    }
    
    if (hasInappropriateImages) {
      const unsafeImages = imageResults.filter(img => !img.safe);
      flaggedCategories.push('inappropriate_image');
      rejectionReason += `Inappropriate images detected (${unsafeImages.length} image(s)). `;
      unsafeImages.forEach(img => {
        if (img.reason) {
          rejectionReason += img.reason.substring(0, 100) + '. ';
        }
      });
    }

    const result = {
      shouldReject,
      shouldAutoApprove: !shouldReject, // Auto-approve if no issues found
      rejectionReason: rejectionReason.trim() || null,
      moderationFlags: {
        textModeration: {
          flagged: textModeration.flagged,
          categories: textModeration.categories,
          scores: textModeration.categoryScores
        },
        imageModeration: imageResults,
        flaggedCategories,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ Moderation complete:', {
      shouldReject,
      shouldAutoApprove: result.shouldAutoApprove,
      flaggedCategories
    });

    return result;
  } catch (error) {
    console.error('❌ Ad moderation error:', error);
    // On error, don't auto-approve but don't auto-reject either
    return {
      shouldReject: false,
      shouldAutoApprove: false, // Leave as PENDING for manual review
      rejectionReason: null,
      moderationFlags: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Get moderation status for ad
 */
function getModerationStatus(moderationResult) {
  if (moderationResult.shouldReject) {
    return {
      status: 'REJECTED',
      moderationStatus: 'rejected',
      autoRejected: true
    };
  } else if (moderationResult.shouldAutoApprove) {
    return {
      status: 'APPROVED',
      moderationStatus: 'approved',
      autoRejected: false
    };
  } else {
    return {
      status: 'PENDING',
      moderationStatus: 'pending',
      autoRejected: false
    };
  }
}

module.exports = {
  moderateText,
  moderateImage,
  moderateAd,
  getModerationStatus
};

