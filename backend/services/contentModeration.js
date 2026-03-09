/**
 * Content Moderation Service - TensorFlow/NSFWJS Only (No Google API)
 * Detects nudity and adult content in images and text
 *
 * Uses: @tensorflow/tfjs-node + nsfwjs
 * No Google Vision, No Google Cloud APIs
 *
 * NSFWJS Classifications:
 * - Porn: Blocked ❌
 * - Hentai: Blocked ❌
 * - Sexy: Review ⚠️ (manual review)
 * - Neutral: Allowed ✅
 * - Drawing: Allowed ✅
 */

const axios = require('axios');

// Load TensorFlow.js: prefer tfjs-node (native, fast), fallback to tfjs (pure JS, works on Windows when native binding fails)
// Uses NSFWJS only - no Google API
let tf = null;
let nsfwjs = null;
let tfBackend = 'none';

try {
  tf = require('@tensorflow/tfjs-node');
  tfBackend = 'tfjs-node';
  nsfwjs = require('nsfwjs');
  console.log('✅ [MODERATION] TensorFlow.js (Node/native) and NSFWJS loaded successfully');
} catch (error) {
  try {
    tf = require('@tensorflow/tfjs');
    // In Node without tfjs-node, use CPU backend (no native addon required)
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      require('@tensorflow/tfjs-backend-cpu');
      tf.setBackend('cpu');
    }
    tfBackend = 'tfjs-cpu';
    nsfwjs = require('nsfwjs');
    console.log('✅ [MODERATION] TensorFlow.js (CPU fallback) and NSFWJS loaded – native binding failed, using pure JS (slower but works on Windows)');
  } catch (fallbackError) {
    console.warn('⚠️ [MODERATION] TensorFlow.js Node failed:', error.message);
    console.warn('⚠️ [MODERATION] TensorFlow.js fallback failed:', fallbackError.message);
    console.warn('⚠️ [MODERATION] Content moderation disabled. Ads will be auto-approved.');
    tf = null;
    nsfwjs = null;
  }
}

// Configuration: Enable/disable moderation (default: enabled for production)
const MODERATION_ENABLED = process.env.CONTENT_MODERATION_ENABLED !== 'false';
// Always use fail-open mode (allow ads if moderation unavailable)
const MODERATION_FAIL_CLOSED = false;

// Initialize NSFWJS model
let nsfwModel = null;
let nsfwModelLoaded = false;

// Log moderation configuration on startup
console.log('🔍 [MODERATION] Initializing Content Moderation Service (NSFWJS only)...');
console.log('🔍 [MODERATION] Configuration:', {
  MODERATION_ENABLED,
  MODERATION_FAIL_CLOSED: false, // Always fail-open
  nsfwjsAvailable: !!(nsfwjs && tf),
  tfBackend: tfBackend
});

// Initialize NSFWJS model
async function loadNSFWModel() {
  if (!MODERATION_ENABLED) {
    console.log('⚠️ [MODERATION] NSFWJS model loading skipped (moderation disabled)');
    return;
  }
  
  if (!nsfwjs || !tf) {
    console.warn('⚠️ [MODERATION] NSFWJS not available (TensorFlow.js failed to load)');
    console.warn('⚠️ [MODERATION] Content moderation will be disabled. Ads will be approved without moderation.');
    nsfwModelLoaded = false;
    return;
  }
  
  try {
    console.log('🔍 [MODERATION] Loading NSFWJS model...');
    nsfwModel = await nsfwjs.load();
    nsfwModelLoaded = true;
    console.log('✅ [MODERATION] NSFWJS model loaded successfully');
  } catch (error) {
    console.error('❌ [MODERATION] Failed to load NSFWJS model:', error.message);
    console.error('❌ [MODERATION] Error details:', error);
    nsfwModelLoaded = false;
    console.warn('⚠️ [MODERATION] NSFWJS unavailable - content moderation disabled. Ads will be approved without moderation.');
  }
}

// Load NSFWJS model on startup (async, don't block)
loadNSFWModel().catch(err => {
  console.error('❌ [MODERATION] Error loading NSFWJS model:', err);
});

// Log final moderation status
console.log('🔍 [MODERATION] Final Status:', {
  enabled: MODERATION_ENABLED,
  available: nsfwModelLoaded,
  failClosed: false, // Always fail-open
  nsfwjsAvailable: !!(nsfwjs && tf),
  nsfwModelLoaded: nsfwModelLoaded,
  tfBackend: tfBackend
});

/**
 * Detect NSFW content using NSFWJS
 * @param {Buffer|string} image - Image buffer or image URL
 * @returns {Promise<{isSafe: boolean, needsReview: boolean, category: string, confidence: number, classifications: Object, error?: string}>}
 */
async function detectNSFWWithNSFWJS(image) {
  if (!MODERATION_ENABLED) {
    return { isSafe: true, needsReview: false, category: 'DISABLED', confidence: 0, classifications: {} };
  }
  
  if (!nsfwModel || !nsfwModelLoaded) {
    const errorMsg = 'NSFWJS model not loaded';
    console.warn('⚠️ [MODERATION]', errorMsg);
    return { 
      isSafe: true, 
      needsReview: false, 
      category: 'UNAVAILABLE', 
      confidence: 0, 
      classifications: {},
      error: errorMsg,
      unavailable: true
    };
  }
  
  try {
    let imageBuffer;
    
    // Convert image to buffer if needed
    if (Buffer.isBuffer(image)) {
      imageBuffer = image;
    } else if (typeof image === 'string' && image.startsWith('http')) {
      // Download image from URL
      const response = await axios.get(image, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
    } else if (typeof image === 'string') {
      // Base64 string
      imageBuffer = Buffer.from(image, 'base64');
    } else {
      throw new Error('Invalid image format. Expected Buffer, URL, or base64 string.');
    }
    
    // Classify image using NSFWJS
    console.log('🔍 [MODERATION] Classifying image with NSFWJS...');
    const predictions = await nsfwModel.classify(imageBuffer);
    
    // Get the top prediction
    const topPrediction = predictions[0];
    const category = topPrediction.className;
    const confidence = topPrediction.probability;
    
    // Convert predictions array to object for easier access
    const classifications = {};
    predictions.forEach(pred => {
      classifications[pred.className] = pred.probability;
    });
    
    // Get individual classification scores
    const pornScore = classifications.Porn || 0;
    const hentaiScore = classifications.Hentai || 0;
    const sexyScore = classifications.Sexy || 0;
    const neutralScore = classifications.Neutral || 0;
    const drawingScore = classifications.Drawing || 0;
    
    // Combined explicit content score (Porn + Hentai)
    const explicitScore = pornScore + hentaiScore;
    
    console.log('🔍 [MODERATION] NSFWJS classification:', {
      category,
      confidence: (confidence * 100).toFixed(2) + '%',
      allClassifications: {
        Porn: (pornScore * 100).toFixed(2) + '%',
        Hentai: (hentaiScore * 100).toFixed(2) + '%',
        Sexy: (sexyScore * 100).toFixed(2) + '%',
        Neutral: (neutralScore * 100).toFixed(2) + '%',
        Drawing: (drawingScore * 100).toFixed(2) + '%'
      },
      explicitScore: (explicitScore * 100).toFixed(2) + '%'
    });
    
    // Enhanced decision logic:
    // - Porn/Hentai: Block (isSafe: false, needsReview: false)
    // - High explicit score (>30%): Block even if top category is Sexy
    // - High Sexy confidence (>80%) with significant Porn (>15%): Block
    // - Sexy with moderate confidence: Review
    // - Neutral/Drawing: Allow
    
    let isSafe = true;
    let needsReview = false;
    let finalCategory = category;
    
    // Block if explicit content (Porn/Hentai) detected
    if (category === 'Porn' || category === 'Hentai') {
      isSafe = false;
      needsReview = false;
      console.log(`❌ [MODERATION] Content BLOCKED: ${category} detected (${(confidence * 100).toFixed(2)}% confidence)`);
    }
    // Block if combined explicit score is high (even if top category is Sexy)
    else if (explicitScore > 0.30) {
      isSafe = false;
      needsReview = false;
      finalCategory = explicitScore > pornScore ? 'Porn' : 'Hentai';
      console.log(`❌ [MODERATION] Content BLOCKED: High explicit content score (${(explicitScore * 100).toFixed(2)}%) - Porn: ${(pornScore * 100).toFixed(2)}%, Hentai: ${(hentaiScore * 100).toFixed(2)}%`);
    }
    // Block if Sexy has very high confidence (>80%) AND Porn has significant score (>15%)
    else if (category === 'Sexy' && sexyScore > 0.80 && pornScore > 0.15) {
      isSafe = false;
      needsReview = false;
      finalCategory = 'Porn';
      console.log(`❌ [MODERATION] Content BLOCKED: High Sexy confidence (${(sexyScore * 100).toFixed(2)}%) with significant Porn score (${(pornScore * 100).toFixed(2)}%) - treating as explicit content`);
    }
    // Block if Sexy has very high confidence (>85%) - likely misclassified explicit content
    else if (category === 'Sexy' && sexyScore > 0.85) {
      isSafe = false;
      needsReview = false;
      finalCategory = 'Porn';
      console.log(`❌ [MODERATION] Content BLOCKED: Very high Sexy confidence (${(sexyScore * 100).toFixed(2)}%) - likely explicit content misclassified`);
    }
    // Review if Sexy with moderate confidence
    else if (category === 'Sexy') {
      isSafe = true;
      needsReview = true;
      console.log(`⚠️ [MODERATION] Content needs REVIEW: ${category} detected (${(confidence * 100).toFixed(2)}% confidence)`);
    }
    // Allow Neutral/Drawing
    else {
      isSafe = true;
      needsReview = false;
      console.log(`✅ [MODERATION] Content ALLOWED: ${category} detected (${(confidence * 100).toFixed(2)}% confidence)`);
    }
    
    return {
      isSafe,
      needsReview,
      category: finalCategory,
      confidence,
      classifications,
      explicitScore: explicitScore,
      pornScore: pornScore,
      hentaiScore: hentaiScore,
      sexyScore: sexyScore
    };
  } catch (error) {
    console.error('❌ [MODERATION] Error detecting NSFW with NSFWJS:', error);
    console.error('❌ [MODERATION] Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    // On error, fallback to safe (but log the error)
    return {
      isSafe: true,
      needsReview: false,
      category: 'ERROR',
      confidence: 0,
      classifications: {},
      error: error.message
    };
  }
}


/**
 * Check if any image contains nudity or adult content using NSFWJS only
 * @param {Array<Buffer|string>} images - Array of image buffers or URLs
 * @returns {Promise<{hasNudity: boolean, needsReview: boolean, details: Array}>}
 */
async function checkImagesForNudity(images) {
  if (!images || images.length === 0) {
    return { hasNudity: false, needsReview: false, details: [] };
  }

  // Use NSFWJS as the only detection method
  const nsfwResults = await Promise.all(
    images.map(image => detectNSFWWithNSFWJS(image))
  );
  
  // Check if any image needs blocking (Porn/Hentai)
  const hasNudity = nsfwResults.some(result => !result.isSafe);
  
  // Check if any image needs review (Sexy)
  const needsReview = nsfwResults.some(result => result.needsReview);
  
  // If NSFWJS is unavailable, allow all content (fail-open)
  const hasUnavailable = nsfwResults.some(result => result.unavailable);
  if (hasUnavailable) {
    console.warn('⚠️ [MODERATION] NSFWJS unavailable - allowing all content (fail-open mode)');
    return {
      hasNudity: false, // Don't block if moderation unavailable
      needsReview: false,
      details: nsfwResults.map(result => ({ ...result, source: 'nsfwjs' }))
    };
  }
  
  return {
    hasNudity,
    needsReview,
    details: nsfwResults.map(result => ({ ...result, source: 'nsfwjs' }))
  };
}

/**
 * Detect adult content in text using keyword-based detection
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
    nsfwjsAvailable: !!(nsfwModel && nsfwModelLoaded),
    provider: 'TensorFlow/NSFWJS only'
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
    
    // Check if NSFWJS is available
    if (!nsfwModel || !nsfwModelLoaded) {
      console.warn('⚠️ [MODERATION] NSFWJS model not available - allowing content (fail-open mode)');
      console.warn('⚠️ [MODERATION] Ads will be approved without moderation.');
      return {
        isSafe: true,
        hasNudity: false,
        hasAdultText: false,
        imageDetails: [],
        textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
        moderationUnavailable: true
      };
    }
    
    console.log('✅ [MODERATION] NSFWJS model available - proceeding with moderation check');
    
    // Check images using NSFWJS
    const imageCheck = await checkImagesForNudity(images);
    
    // If moderation unavailable, allow content (fail-open)
    const hasModerationError = imageCheck.details?.some((detail) => detail.unavailable);
    if (hasModerationError) {
      console.warn('⚠️ [MODERATION] Image moderation unavailable - allowing content (fail-open mode)');
      return {
        isSafe: true,
        hasNudity: false,
        hasAdultText: false,
        imageDetails: imageCheck.details,
        textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
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

    // Decision logic:
    // - If hasNudity (Porn/Hentai): Block (isSafe: false)
    // - If needsReview (Sexy): Mark for review (isSafe: true, but needsReview: true)
    // - Otherwise: Allow (isSafe: true)
    const isSafe = imageCheck.hasNudity === false && textCheck.isSafe;
    
    console.log('🔍 [MODERATION] Final moderation decision:', {
      isSafe,
      hasNudity: imageCheck.hasNudity,
      needsReview: imageCheck.needsReview,
      hasAdultText: textCheck.hasAdultContent,
      imageCheckHasNudity: imageCheck.hasNudity,
      textCheckIsSafe: textCheck.isSafe
    });
    
    let rejectionReason = null;
    if (!isSafe) {
      const reasons = [];
      if (imageCheck.hasNudity) {
        // Check which category triggered the block
        const blockedImages = imageCheck.details.filter(d => !d.isSafe);
        const categories = blockedImages.map(d => d.category).filter(Boolean);
        const explicitScores = blockedImages.map(d => d.explicitScore || 0);
        const maxExplicitScore = Math.max(...explicitScores, 0);
        
        if (categories.includes('Porn') || maxExplicitScore > 0.30) {
          reasons.push('Images contain explicit adult content (nudity/pornographic content detected)');
        } else if (categories.includes('Hentai')) {
          reasons.push('Images contain explicit adult content (Hentai)');
        } else {
          reasons.push('Images contain inappropriate content (nudity or adult content)');
        }
      }
      if (textCheck.hasAdultContent) {
        reasons.push(`Text contains inappropriate keywords: ${textCheck.keywords.join(', ')}`);
      }
      rejectionReason = reasons.join('. ');
      console.log('❌ [MODERATION] Content is UNSAFE - rejection reason:', rejectionReason);
    } else if (imageCheck.needsReview) {
      console.log('⚠️ [MODERATION] Content needs MANUAL REVIEW - Sexy content detected');
    } else {
      console.log('✅ [MODERATION] Content is SAFE - ad will be approved');
    }

    return {
      isSafe,
      hasNudity: imageCheck.hasNudity,
      needsReview: imageCheck.needsReview || false,
      hasAdultText: textCheck.hasAdultContent,
      imageDetails: imageCheck.details,
      textDetails: textCheck,
      rejectionReason
    };
  } catch (error) {
    console.error('❌ Error in content moderation:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Always fail-open: Allow when moderation process fails
    console.warn('⚠️ Allowing content through (fail-open mode) - moderation error occurred');
    return {
      isSafe: true,
      hasNudity: false,
      hasAdultText: false,
      imageDetails: [],
      textDetails: { isSafe: true, hasAdultContent: false, keywords: [] },
      error: error.message,
      moderationUnavailable: true
    };
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
    enabled: MODERATION_ENABLED && nsfwModelLoaded,
    available: nsfwModelLoaded,
    failClosed: false, // Always fail-open
    provider: 'NSFWJS',
    nsfwjsAvailable: !!(nsfwjs && tf),
    nsfwModelLoaded: nsfwModelLoaded
  };
}

module.exports = {
  detectNSFWWithNSFWJS,
  checkImagesForNudity,
  detectTextAdultContent,
  moderateAdContent,
  moderateAd, // Legacy function for backward compatibility
  getModerationStatus
};
