/**
 * Content Moderation Service using Google Cloud Vision API
 * Detects nudity and adult content in images and text
 */

const { ImageAnnotatorClient } = require('@google-cloud/vision');
const axios = require('axios');

// Configuration: Enable/disable moderation (default: enabled for production)
const MODERATION_ENABLED = process.env.CONTENT_MODERATION_ENABLED !== 'false';
const MODERATION_FAIL_CLOSED = process.env.CONTENT_MODERATION_FAIL_CLOSED !== 'false'; // Default: fail-closed (reject when unavailable)

// Initialize Google Cloud Vision client
let visionClient = null;
let moderationAvailable = false;

// Check for API key (support multiple env var names)
const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || 
                     process.env.GOOGLE_VISION_API_KEY ||
                     process.env.GOOGLE_CLOUD_VISION_KEY;

// Log moderation configuration on startup
console.log('🔍 [MODERATION] Initializing Content Moderation Service...');
console.log('🔍 [MODERATION] Configuration:', {
  MODERATION_ENABLED,
  MODERATION_FAIL_CLOSED,
  hasApiKey: !!(visionApiKey),
  hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
  apiKeyEnvVars: {
    GOOGLE_CLOUD_VISION_API_KEY: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
    GOOGLE_VISION_API_KEY: !!process.env.GOOGLE_VISION_API_KEY,
    GOOGLE_CLOUD_VISION_KEY: !!process.env.GOOGLE_CLOUD_VISION_KEY
  }
});

if (MODERATION_ENABLED && (visionApiKey || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  try {
    // Initialize with API key (preferred) or credentials file
    if (visionApiKey) {
      // Use API key authentication
      visionClient = new ImageAnnotatorClient({
        apiKey: visionApiKey,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      console.log('✅ [MODERATION] Google Cloud Vision API initialized with API key');
      moderationAvailable = true;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account credentials file
      visionClient = new ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      console.log('✅ [MODERATION] Google Cloud Vision API initialized with credentials file');
      moderationAvailable = true;
    }
  } catch (error) {
    console.error('❌ [MODERATION] Failed to initialize Google Cloud Vision API:', error.message);
    console.error('❌ [MODERATION] Error details:', error);
    if (MODERATION_FAIL_CLOSED) {
      console.error('🚨 [MODERATION] CRITICAL: Content moderation is REQUIRED but unavailable. Ads will be REJECTED until moderation is configured.');
    } else {
      console.warn('⚠️ [MODERATION] Content moderation will be disabled (fail-open mode)');
      console.warn('⚠️ [MODERATION] THIS IS A SECURITY RISK - All ads will be approved without moderation!');
    }
  }
} else {
  if (!MODERATION_ENABLED) {
    console.warn('⚠️ [MODERATION] Content moderation is DISABLED via CONTENT_MODERATION_ENABLED=false');
    console.warn('⚠️ [MODERATION] THIS IS A SECURITY RISK - All ads will be approved without moderation!');
  } else {
    console.warn('⚠️ [MODERATION] Google Cloud Vision API credentials not found. Content moderation unavailable.');
    if (MODERATION_FAIL_CLOSED) {
      console.error('🚨 [MODERATION] CRITICAL: Content moderation is REQUIRED but credentials missing. Ads will be REJECTED until configured.');
      console.error('🚨 [MODERATION] To fix: Set GOOGLE_CLOUD_VISION_API_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable');
    } else {
      console.warn('⚠️ [MODERATION] Fail-open mode enabled - ads will be approved without moderation');
      console.warn('⚠️ [MODERATION] THIS IS A SECURITY RISK!');
    }
  }
}

// Log final moderation status
console.log('🔍 [MODERATION] Final Status:', {
  enabled: MODERATION_ENABLED,
  available: moderationAvailable,
  failClosed: MODERATION_FAIL_CLOSED,
  hasVisionClient: !!visionClient
});

/**
 * Detect nudity and adult content in an image using Google Cloud Vision API
 * @param {Buffer|string} image - Image buffer or image URL
 * @returns {Promise<{isSafe: boolean, adult: string, violence: string, racy: string, medical: string, spoof: string, error?: string}>}
 */
async function detectImageNudity(image) {
  // If moderation is disabled, allow all content
  if (!MODERATION_ENABLED) {
    return { isSafe: true, adult: 'DISABLED', violence: 'DISABLED', racy: 'DISABLED', medical: 'DISABLED', spoof: 'DISABLED' };
  }
  
  // If Vision client not available, fail-closed or fail-open based on config
  if (!visionClient || !moderationAvailable) {
    const errorMsg = 'Vision client not initialized - content moderation unavailable';
    console.error('❌', errorMsg);
    
    if (MODERATION_FAIL_CLOSED) {
      // Fail-closed: Reject content when moderation unavailable
      return { 
        isSafe: false, 
        adult: 'UNAVAILABLE', 
        violence: 'UNAVAILABLE', 
        racy: 'UNAVAILABLE', 
        medical: 'UNAVAILABLE', 
        spoof: 'UNAVAILABLE',
        error: errorMsg,
        moderationUnavailable: true
      };
    } else {
      // Fail-open: Allow content when moderation unavailable (NOT RECOMMENDED)
      console.warn('⚠️ Allowing content through (fail-open mode) - moderation unavailable');
      return { 
        isSafe: true, 
        adult: 'UNAVAILABLE', 
        violence: 'UNAVAILABLE', 
        racy: 'UNAVAILABLE', 
        medical: 'UNAVAILABLE', 
        spoof: 'UNAVAILABLE',
        error: errorMsg
      };
    }
  }

  try {
    // Prepare image source
    let imageSource;
    if (Buffer.isBuffer(image)) {
      // Image buffer
      imageSource = { image: { content: image.toString('base64') } };
    } else if (typeof image === 'string' && image.startsWith('http')) {
      // Image URL
      imageSource = { image: { source: { imageUri: image } } };
    } else if (typeof image === 'string') {
      // Base64 string
      imageSource = { image: { content: image } };
    } else {
      throw new Error('Invalid image format. Expected Buffer, URL, or base64 string.');
    }

    // Detect safe search properties
    console.log('🔍 [MODERATION] Calling Vision API safeSearchDetection...');
    const [result] = await visionClient.safeSearchDetection(imageSource);
    const safeSearch = result.safeSearchAnnotation;
    
    console.log('🔍 [MODERATION] Vision API response received:', {
      hasResult: !!result,
      hasSafeSearch: !!safeSearch
    });
    
    if (!result) {
      const errorMsg = 'No result returned from Vision API';
      console.error('❌ [MODERATION]', errorMsg);
      if (MODERATION_FAIL_CLOSED) {
        return { 
          isSafe: false, 
          adult: 'ERROR', 
          violence: 'ERROR', 
          racy: 'ERROR', 
          medical: 'ERROR', 
          spoof: 'ERROR',
          error: errorMsg,
          moderationUnavailable: true
        };
      }
    }
    
    if (!safeSearch) {
      const errorMsg = 'No safe search annotation returned from Vision API';
      console.error('❌ [MODERATION]', errorMsg);
      if (MODERATION_FAIL_CLOSED) {
        // Fail-closed: Reject when API doesn't return proper response
        return { 
          isSafe: false, 
          adult: 'ERROR', 
          violence: 'ERROR', 
          racy: 'ERROR', 
          medical: 'ERROR', 
          spoof: 'ERROR',
          error: errorMsg,
          moderationUnavailable: true
        };
      } else {
        // Fail-open: Allow when API response is incomplete (NOT RECOMMENDED)
        console.warn('⚠️ [MODERATION] Allowing content through (fail-open mode) - incomplete API response');
        return { isSafe: true, adult: 'UNKNOWN', violence: 'UNKNOWN', racy: 'UNKNOWN', medical: 'UNKNOWN', spoof: 'UNKNOWN' };
      }
    }
    
    // Check for adult content, violence, racy content
    // Likelihood values: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
    const adultLevel = safeSearch.adult || 'UNKNOWN';
    const violenceLevel = safeSearch.violence || 'UNKNOWN';
    const racyLevel = safeSearch.racy || 'UNKNOWN';
    const medicalLevel = safeSearch.medical || 'UNKNOWN';
    const spoofLevel = safeSearch.spoof || 'UNKNOWN';
    
    console.log('🔍 [MODERATION] Safe search levels:', {
      adult: adultLevel,
      violence: violenceLevel,
      racy: racyLevel,
      medical: medicalLevel,
      spoof: spoofLevel
    });
    
    // Consider content unsafe if adult, violence, or racy is LIKELY or VERY_LIKELY
    const isUnsafe = 
      adultLevel === 'LIKELY' || adultLevel === 'VERY_LIKELY' ||
      violenceLevel === 'LIKELY' || violenceLevel === 'VERY_LIKELY' ||
      racyLevel === 'LIKELY' || racyLevel === 'VERY_LIKELY';
    
    console.log('🔍 [MODERATION] Image safety decision:', {
      isUnsafe,
      isSafe: !isUnsafe,
      adultLevel,
      violenceLevel,
      racyLevel
    });
    
    return {
      isSafe: !isUnsafe,
      adult: adultLevel,
      violence: violenceLevel,
      racy: racyLevel,
      medical: medicalLevel,
      spoof: spoofLevel
    };
  } catch (error) {
    console.error('❌ Error detecting image nudity:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack?.substring(0, 500)
    });
    
    if (MODERATION_FAIL_CLOSED) {
      // Fail-closed: Reject content when moderation API fails
      console.error('🚨 REJECTING content due to moderation API error (fail-closed mode)');
      return {
        isSafe: false,
        adult: 'ERROR',
        violence: 'ERROR',
        racy: 'ERROR',
        medical: 'ERROR',
        spoof: 'ERROR',
        error: error.message,
        moderationUnavailable: true
      };
    } else {
      // Fail-open: Allow content when API fails (NOT RECOMMENDED for production)
      console.warn('⚠️ Allowing content through (fail-open mode) - API error occurred');
      return {
        isSafe: true,
        adult: 'ERROR',
        violence: 'ERROR',
        racy: 'ERROR',
        medical: 'ERROR',
        spoof: 'ERROR',
        error: error.message
      };
    }
  }
}

/**
 * Detect adult content in multiple images
 * @param {Array<Buffer|string>} images - Array of image buffers or URLs
 * @returns {Promise<Array<{isSafe: boolean, adult: string, violence: string, racy: string, medical: string, spoof: string, error?: string}>>}
 */
async function detectMultipleImagesNudity(images) {
  if (!images || images.length === 0) {
    return [];
  }

  const results = await Promise.all(
    images.map(image => detectImageNudity(image))
  );

  return results;
}

/**
 * Check if any image contains nudity or adult content
 * @param {Array<Buffer|string>} images - Array of image buffers or URLs
 * @returns {Promise<{hasNudity: boolean, details: Array}>}
 */
async function checkImagesForNudity(images) {
  if (!images || images.length === 0) {
    return { hasNudity: false, details: [] };
  }

  const results = await detectMultipleImagesNudity(images);
  const hasNudity = results.some(result => !result.isSafe);

  return {
    hasNudity,
    details: results
  };
}

/**
 * Detect adult content in text using keyword-based detection
 * (Google Cloud Natural Language API can be used for more advanced detection)
 * @param {string} text - Text to check
 * @returns {Promise<{isSafe: boolean, hasAdultContent: boolean, keywords: Array}>}
 */
async function detectTextAdultContent(text) {
  if (!text || typeof text !== 'string') {
    return { isSafe: true, hasAdultContent: false, keywords: [] };
  }

  // List of adult content keywords (can be expanded)
  const adultKeywords = [
    // Explicit adult terms
    'nude', 'naked', 'nudity', 'porn', 'pornography', 'xxx', 'sex', 'sexual',
    'adult content', 'explicit', 'erotic', 'escort', 'prostitute',
    // Violence-related
    'kill', 'murder', 'violence', 'weapon', 'gun', 'knife',
    // Other inappropriate content
    'drugs', 'cocaine', 'heroin', 'marijuana', 'weed'
  ];

  const textLower = text.toLowerCase();
  const foundKeywords = adultKeywords.filter(keyword => 
    textLower.includes(keyword.toLowerCase())
  );

  const hasAdultContent = foundKeywords.length > 0;

  return {
    isSafe: !hasAdultContent,
    hasAdultContent,
    keywords: foundKeywords
  };
}

/**
 * Comprehensive content moderation for ad
 * Checks both images and text content
 * @param {Array<Buffer|string>} images - Array of image buffers or URLs
 * @param {string} title - Ad title
 * @param {string} description - Ad description
 * @returns {Promise<{isSafe: boolean, hasNudity: boolean, hasAdultText: boolean, imageDetails: Array, textDetails: Object, rejectionReason?: string}>}
 */
async function moderateAdContent(images, title = '', description = '') {
  console.log('🔍 [MODERATION] moderateAdContent called:', {
    imagesCount: images?.length || 0,
    titleLength: title?.length || 0,
    descriptionLength: description?.length || 0,
    MODERATION_ENABLED,
    visionClientAvailable: !!visionClient,
    moderationAvailable
  });
  
  try {
    // Check if moderation is unavailable and fail-closed mode is enabled
    if (!MODERATION_ENABLED) {
      console.warn('⚠️ [MODERATION] Content moderation DISABLED via env var - allowing all content');
      return {
        isSafe: true,
        hasNudity: false,
        hasAdultText: false,
        imageDetails: [],
        textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
        moderationDisabled: true
      };
    }
    
    if (!visionClient || !moderationAvailable) {
      console.error('🚨 [MODERATION] Vision client NOT available:', {
        hasVisionClient: !!visionClient,
        moderationAvailable,
        hasApiKey: !!(process.env.GOOGLE_CLOUD_VISION_API_KEY || 
                     process.env.GOOGLE_VISION_API_KEY ||
                     process.env.GOOGLE_CLOUD_VISION_KEY),
        hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      
      if (MODERATION_FAIL_CLOSED) {
        console.error('🚨 [MODERATION] Content moderation unavailable - REJECTING ad (fail-closed mode)');
        return {
          isSafe: false,
          hasNudity: true, // Mark as unsafe to trigger rejection
          hasAdultText: false,
          imageDetails: [],
          textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
          rejectionReason: 'Content moderation service is unavailable. Please contact support.',
          moderationUnavailable: true,
          error: 'Vision client not initialized'
        };
      } else {
        console.warn('⚠️ [MODERATION] Content moderation unavailable - allowing content (fail-open mode - NOT RECOMMENDED)');
        console.warn('⚠️ [MODERATION] THIS IS A SECURITY RISK - All ads will be approved without moderation!');
        return {
          isSafe: true,
          hasNudity: false,
          hasAdultText: false,
          imageDetails: [],
          textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
          moderationUnavailable: true
        };
      }
    }
    
    console.log('✅ [MODERATION] Vision client available - proceeding with moderation check');
    
    // Check images
    const imageCheck = await checkImagesForNudity(images);
    
    // Check if any image moderation failed (moderationUnavailable flag)
    const hasModerationError = imageCheck.details?.some((detail) => detail.moderationUnavailable);
    if (hasModerationError && MODERATION_FAIL_CLOSED) {
      console.error('🚨 Image moderation failed - REJECTING ad (fail-closed mode)');
      return {
        isSafe: false,
        hasNudity: true,
        hasAdultText: false,
        imageDetails: imageCheck.details,
        textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
        rejectionReason: 'Unable to verify image content. Please try again or contact support.',
        moderationUnavailable: true
      };
    }
    
    // Check text content
    console.log('🔍 [MODERATION] Checking text content...');
    const fullText = `${title} ${description}`.trim();
    const textCheck = await detectTextAdultContent(fullText);
    console.log('🔍 [MODERATION] Text check result:', {
      hasAdultContent: textCheck.hasAdultContent,
      keywordsFound: textCheck.keywords?.length || 0,
      keywords: textCheck.keywords || []
    });

    const isSafe = imageCheck.hasNudity === false && textCheck.isSafe;
    
    console.log('🔍 [MODERATION] Final moderation decision:', {
      isSafe,
      hasNudity: imageCheck.hasNudity,
      hasAdultText: textCheck.hasAdultContent,
      imageCheckHasNudity: imageCheck.hasNudity,
      textCheckIsSafe: textCheck.isSafe
    });
    
    let rejectionReason = null;
    if (!isSafe) {
      const reasons = [];
      if (imageCheck.hasNudity) {
        reasons.push('Images contain inappropriate content (nudity, violence, or adult content)');
      }
      if (textCheck.hasAdultContent) {
        reasons.push(`Text contains inappropriate keywords: ${textCheck.keywords.join(', ')}`);
      }
      rejectionReason = reasons.join('. ');
      console.log('❌ [MODERATION] Content is UNSAFE - rejection reason:', rejectionReason);
    } else {
      console.log('✅ [MODERATION] Content is SAFE - ad will be approved');
    }

    return {
      isSafe,
      hasNudity: imageCheck.hasNudity,
      hasAdultText: textCheck.hasAdultContent,
      imageDetails: imageCheck.details,
      textDetails: textCheck,
      rejectionReason
    };
  } catch (error) {
    console.error('❌ Error in content moderation:', error);
    console.error('❌ Error stack:', error.stack);
    
    if (MODERATION_FAIL_CLOSED) {
      // Fail-closed: Reject when moderation process fails
      console.error('🚨 REJECTING ad due to moderation error (fail-closed mode)');
      return {
        isSafe: false,
        hasNudity: true, // Mark as unsafe to trigger rejection
        hasAdultText: false,
        imageDetails: [],
        textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
        rejectionReason: 'Content moderation service error. Please try again or contact support.',
        error: error.message,
        moderationUnavailable: true
      };
    } else {
      // Fail-open: Allow when moderation process fails (NOT RECOMMENDED)
      console.warn('⚠️ Allowing content through (fail-open mode) - moderation error occurred');
      return {
        isSafe: true,
        hasNudity: false,
        hasAdultText: false,
        imageDetails: [],
        textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
        error: error.message
      };
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @param {string} title - Ad title
 * @param {string} description - Ad description
 * @param {Array<string>} images - Array of image URLs
 * @returns {Promise<Object>}
 */
async function moderateAd(title, description, images) {
  const result = await moderateAdContent(images, title, description);
  
  return {
    shouldReject: !result.isSafe,
    shouldAutoApprove: result.isSafe,
    rejectionReason: result.rejectionReason,
    moderationFlags: {
      hasNudity: result.hasNudity,
      hasAdultText: result.hasAdultText,
      imageDetails: result.imageDetails,
      textDetails: result.textDetails
    }
  };
}

/**
 * Get moderation status (placeholder for future use)
 */
function getModerationStatus() {
  return {
    enabled: MODERATION_ENABLED && moderationAvailable,
    available: moderationAvailable,
    failClosed: MODERATION_FAIL_CLOSED,
    provider: 'Google Cloud Vision API',
    hasApiKey: !!(process.env.GOOGLE_CLOUD_VISION_API_KEY || 
                   process.env.GOOGLE_VISION_API_KEY ||
                   process.env.GOOGLE_CLOUD_VISION_KEY),
    hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  };
}

module.exports = {
  detectImageNudity,
  detectMultipleImagesNudity,
  checkImagesForNudity,
  detectTextAdultContent,
  moderateAdContent,
  moderateAd, // Legacy function for backward compatibility
  getModerationStatus
};
