const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
require('dotenv').config();

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Generate product description using OpenAI
router.post('/generate-description', authenticate, async (req, res) => {
  try {
    const { title, price, condition, category, subcategory, location } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required to generate description',
      });
    }

    // Build context for the AI with template structure
    let productDetails = `Product Title: ${title}\n`;
    
    if (price) {
      productDetails += `Price: ₹${price}\n`;
    }
    
    if (condition) {
      productDetails += `Condition: ${condition}\n`;
    }
    
    if (category) {
      productDetails += `Category: ${category}\n`;
    }
    
    if (subcategory) {
      productDetails += `Subcategory: ${subcategory}\n`;
    }
    
    if (location) {
      productDetails += `Location: ${location}\n`;
    }

    // Professional template for description generation with bullet points
    const prompt = `You are a professional copywriter specializing in premium classified ad descriptions. Create a polished, professional product description using bullet points that maximizes buyer interest and trust.

Product Information:
${productDetails}

Professional Description Structure (Use Bullet Points):

• Introduction & Value Proposition: Start with a compelling bullet that immediately communicates the product's value and appeal. Use professional language that establishes credibility.

• Key Features & Specifications: List the most important features, specifications, and benefits in separate bullets. Highlight what makes this product stand out. Use precise, professional terminology.

• Condition & Authenticity: Provide clear, honest bullets about the product's condition, age, usage history, and any relevant details. Build trust through transparency. Mention original packaging, accessories, or documentation if applicable.

• Value & Benefits: Explain why this is an excellent purchase opportunity in bullet format. Emphasize value, quality, and unique advantages. Use persuasive but professional language.

• Professional Closing: End with a courteous, professional call-to-action bullet that encourages interested buyers to reach out. Maintain a professional, approachable tone.

Writing Guidelines:
- Total length: 180-280 words
- Format: Use bullet points (•) for each section
- Tone: Professional, trustworthy, and engaging
- Language: Clear, concise, and polished
- Style: Business-appropriate with warmth
- Keywords: Naturally integrated for SEO
- Honesty: Accurate representation of product condition
- Structure: Well-organized bullets with clear sections
- Avoid: Overly casual language, excessive exclamation marks, or pushy sales tactics

Generate a professional, polished product description using bullet points now:`;

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
            content: 'You are a professional copywriter with expertise in creating premium, polished product descriptions for high-quality classified advertisements. Your writing style is professional, trustworthy, and engaging. You excel at highlighting product value while maintaining honesty and transparency. Always follow the provided template structure precisely and create descriptions that build trust and encourage genuine buyer interest.'
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

module.exports = router;

