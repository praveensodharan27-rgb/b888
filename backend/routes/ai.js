const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateSalesReply } = require('../services/salesAssistantService');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
require('dotenv').config();

const prisma = new PrismaClient();

// Simple in-memory upload for AI image analysis (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// OpenAI API configuration (use single OPENAI_API_KEY in .env, no space around =)
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Optional: check if AI chatbot is configured (for support/debug)
router.get('/status', (req, res) => {
  const configured = !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-');
  res.json({ ok: configured, message: configured ? 'AI chatbot configured' : 'Set OPENAI_API_KEY in .env for AI suggest reply and auto-reply' });
});

// Analyze product image and return structured ad details
router.post(
  '/generate-ad-details-from-image',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required',
        });
      }

      if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
        return res.status(500).json({
          success: false,
          message:
            'OpenAI API key is not configured. Please add a valid OPENAI_API_KEY to backend/.env.',
        });
      }

      const mimeType = req.file.mimetype || 'image/jpeg';
      const base64Image = req.file.buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const systemPrompt =
        'You are a marketplace assistant that analyzes product images and returns ONLY JSON with detected product details. ' +
        'Never include explanations or extra text.';

      const userTextPrompt =
        'Analyze this product image and return a single JSON object with these keys: ' +
        'category, subcategory, brand, model, color, title, seoDescription, priceSuggestion. ' +
        'Use simple values (strings). ' +
        'For priceSuggestion, output an approximate fair selling price in INR for the Indian market, as a plain number or numeric string without currency symbols (e.g. "450000"). ' +
        'For seoDescription, write a short SEO-friendly marketplace description (1-3 sentences, keyword-rich, no emojis). ' +
        'If unsure for a field, use an empty string. ' +
        'Example shape: {"category":"Vehicles","subcategory":"Cars","brand":"BMW","model":"X5","color":"Black","title":"BMW X5 Black SUV for Sale","seoDescription":"Well-maintained BMW X5 luxury SUV for sale in excellent condition, single owner, perfect for family city and highway drives.","priceSuggestion":"450000"} ' +
        'Return ONLY valid JSON, nothing else.';

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userTextPrompt },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          max_tokens: 400,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI image analysis error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 401) {
          return res.status(500).json({
            success: false,
            message: 'Invalid OpenAI API key. Please check OPENAI_API_KEY in backend/.env.',
          });
        }

        if (response.status === 429) {
          return res.status(429).json({
            success: false,
            message: 'AI rate limit exceeded. Please try again later.',
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Failed to analyze image with AI.',
        });
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return res.status(500).json({
          success: false,
          message: 'AI did not return any content.',
        });
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (jsonError) {
        // Try to extract JSON substring if model wrapped it
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {
            console.error('Failed to parse AI JSON from image content:', content);
          }
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        return res.status(500).json({
          success: false,
          message: 'AI response was not valid JSON.',
        });
      }

      // Normalize keys to expected fields
      const result = {
        category: parsed.category || '',
        subcategory: parsed.subcategory || '',
        brand: parsed.brand || '',
        model: parsed.model || '',
        color: parsed.color || '',
        title: parsed.title || '',
        // Prefer explicit seoDescription key; fall back to description if provided
        seoDescription: parsed.seoDescription || parsed.description || '',
        // Price suggestion as string (frontend will normalize to number)
        priceSuggestion: parsed.priceSuggestion || parsed.price || parsed.suggestedPrice || '',
      };

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error in generate-ad-details-from-image:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to analyze image.',
      });
    }
  }
);

// Generate product description using OpenAI
router.post('/generate-description', authenticate, async (req, res) => {
  try {
    const { title, price, condition, category, subcategory, location, attributes } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required to generate description',
      });
    }

    // Build context for the AI
    let productDetails = `Product Title: ${title}\n`;

    if (attributes && typeof attributes === 'object' && Object.keys(attributes).length > 0) {
      productDetails += '\nSpecifications/Attributes from form:\n';
      Object.entries(attributes).forEach(([key, val]) => {
        if (val != null && String(val).trim() !== '') {
          const label = key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          productDetails += `- ${label}: ${val}\n`;
        }
      });
    }

    if (price) productDetails += `\nPrice: ₹${price}\n`;
    if (condition) productDetails += `Condition: ${condition}\n`;
    if (category) productDetails += `Category: ${category}\n`;
    if (subcategory) productDetails += `Subcategory: ${subcategory}\n`;
    if (location) productDetails += `Location: ${location}\n`;

    const prompt = `You are a product listing expert. Generate ONLY a bullet-point list of specifications for a marketplace ad. Output ONLY specifications - no intro, no closing, no marketing text.

Product Information:
${productDetails}

Rules:
- Output ONLY specifications in bullet format (•)
- Use the attributes/specs from the form above - format each as a clean bullet
- Add only 1-2 relevant inferred specs if obvious from title/category (e.g. "Original box included" for phones)
- Keep each bullet short and factual (e.g. "• Brand: Apple", "• RAM: 8 GB", "• Storage: 256 GB")
- Do NOT add intro, conclusion, or promotional text
- Total: 5-15 bullets max
- Format: Plain bullet list only

Generate the specification bullets now:`;

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is missing from environment variables');
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file.',
      });
    }

    // Validate API key format (OpenAI keys typically start with 'sk-')
    if (!OPENAI_API_KEY.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format. Keys should start with "sk-"');
      return res.status(500).json({
        success: false,
        message: 'Invalid OpenAI API key format. Please check your API key.',
      });
    }

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You output only bullet-point specifications for product listings. No intro, no conclusion, no marketing text. Plain spec list only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      console.error('OpenAI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error
      });
      
      // Provide helpful error messages
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key in the .env file.');
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (response.status === 500) {
        throw new Error('OpenAI API server error. Please try again later.');
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Extract generated text from response
    const generatedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!generatedDescription) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate description',
      });
    }

    res.json({
      success: true,
      description: generatedDescription,
    });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.message) {
      return res.status(500).json({
        success: false,
        message: error.message || 'OpenAI API error',
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate description',
    });
  }
});

// Improve existing description using OpenAI
router.post('/improve-description', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Text is required to improve',
      });
    }

    const trimmedText = text.trim();
    if (trimmedText.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 10 characters to improve',
      });
    }

    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured.',
      });
    }

    const prompt = `You are a professional copywriter. Improve the following product/ad description. Make it more professional, engaging, and effective for a marketplace listing. Fix grammar and spelling. Use bullet points where appropriate. Keep the same information and tone but polish the writing. Do not add fictitious details. Output only the improved text, no explanations.

Original description:
${trimmedText}

Improved description:`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You improve product descriptions for marketplace ads. Output only the improved text, nothing else.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again later.');
      }
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const improvedText = data.choices?.[0]?.message?.content?.trim();

    if (!improvedText) {
      return res.status(500).json({
        success: false,
        message: 'Failed to improve description',
      });
    }

    res.json({
      success: true,
      description: improvedText,
    });
  } catch (error) {
    console.error('Improve description error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to improve description',
    });
  }
});

// Generate ad description (alternative endpoint name)
router.post('/ad-description', authenticate, async (req, res) => {
  // Reuse the same logic as generate-description
  const { title, price, condition, category, subcategory, location } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Title is required to generate description',
    });
  }

  // Redirect to generate-description logic
  // For now, call the same function
  try {
    const productDetails = `Product Title: ${title}\n${price ? `Price: ₹${price}\n` : ''}${condition ? `Condition: ${condition}\n` : ''}${category ? `Category: ${category}\n` : ''}${subcategory ? `Subcategory: ${subcategory}\n` : ''}${location ? `Location: ${location}\n` : ''}`;

    const prompt = `You are a professional copywriter specializing in premium classified ad descriptions. Create a polished, professional product description using bullet points that maximizes buyer interest and trust.

Product Information:
${productDetails}

Generate a professional, polished product description using bullet points now:`;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured.',
      });
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional copywriter with expertise in creating premium product descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const generatedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!generatedDescription) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate description',
      });
    }

    res.json({
      success: true,
      description: generatedDescription,
    });
  } catch (error) {
    console.error('AI ad description error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate description',
    });
  }
});

// Get ad price suggestion (alternative endpoint)
router.post('/ad-price-suggestion', async (req, res) => {
  try {
    const { title, category, subcategory, condition, location } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Get similar ads for price comparison
    const similarAds = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        ...(category && { categoryId: category }),
        ...(subcategory && { subcategoryId: subcategory }),
        ...(condition && { condition })
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { price: true }
    });

    if (similarAds.length === 0) {
      return res.json({
        success: true,
        suggestedPrice: null,
        message: 'No similar ads found for price comparison'
      });
    }

    const prices = similarAds.map(ad => ad.price).filter(p => p > 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    res.json({
      success: true,
      suggestedPrice: Math.round(avgPrice),
      priceRange: {
        min: minPrice,
        max: maxPrice,
        average: Math.round(avgPrice)
      },
      sampleSize: prices.length
    });
  } catch (error) {
    console.error('Price suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get price suggestion'
    });
  }
});

// Sales assistant reply (Business Package sellers only) – Manglish, intent-aware
router.post('/sales-reply', authenticate, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'roomId is required',
      });
    }
    if (!OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file.',
      });
    }
    const result = await generateSalesReply(
      String(roomId),
      req.user.id,
      OPENAI_API_KEY
    );
    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }
    return res.json({
      success: true,
      reply: result.reply,
    });
  } catch (error) {
    console.error('Sales reply error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate sales reply',
    });
  }
});

// Image moderation using AI
router.post('/image-moderation', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Use OpenAI Vision API or Google Vision API for image moderation
    // For now, return a mock response
    // You can integrate with actual moderation service
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'AI moderation service not configured'
      });
    }

    // Mock moderation result (replace with actual AI moderation)
    res.json({
      success: true,
      isSafe: true,
      moderationResult: {
        safe: true,
        categories: {
          violence: false,
          adult: false,
          hate: false,
          harassment: false,
          selfHarm: false
        },
        confidence: 0.95
      }
    });
  } catch (error) {
    console.error('Image moderation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate image'
    });
  }
});

module.exports = router;

