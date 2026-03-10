const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Ensure auth-images directory exists
const authImagesDir = path.join(__dirname, '../uploads/auth-images');
if (!fs.existsSync(authImagesDir)) {
  fs.mkdirSync(authImagesDir, { recursive: true });
}

// Configure multer for auth page image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, authImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'auth-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp)'));
    }
  }
});

// Get auth page settings (public - no auth required)
router.get('/:page', async (req, res) => {
  try {
    const { page } = req.params;
    
    if (!['login', 'signup'].includes(page)) {
      return res.status(400).json({ success: false, message: 'Invalid page type' });
    }

    let settings = await prisma.authPageSettings.findUnique({
      where: { page }
    });

    // If no settings exist, return defaults
    if (!settings) {
      const defaults = {
        login: {
          page: 'login',
          title: 'SellIt.',
          subtitle: 'Buy & Sell Anything Today',
          tagline: 'Welcome Back!',
          imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=2187&auto=format&fit=crop',
          backgroundColor: '#6b21a8',
          stats: { listings: '1000+', users: '500+', categories: '50+' }
        },
        signup: {
          page: 'signup',
          title: 'SellIt.',
          subtitle: 'Join thousands of buyers and sellers',
          tagline: 'Start Selling Today!',
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
          backgroundColor: '#ea580c',
          features: ['Easy to use', '100% Secure', 'Quick setup']
        }
      };
      settings = defaults[page];
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get auth settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// Update auth page settings (admin only)
router.put('/:page',
  authenticate,
  authorize('ADMIN'),
  [
    body('title').optional().isString().trim(),
    body('subtitle').optional().isString().trim(),
    body('tagline').optional().isString().trim(),
    body('imageUrl').optional().custom((value) => {
      // Allow empty string or valid URL
      if (!value || value === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Invalid URL format');
      }
    }),
    body('backgroundColor').optional().isString(),
    body('stats').optional().isObject(),
    body('features').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { page } = req.params;
      
      if (!['login', 'signup'].includes(page)) {
        return res.status(400).json({ success: false, message: 'Invalid page type' });
      }

      console.log(`Updating ${page} page settings:`, req.body);

      const updateData = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.subtitle !== undefined) updateData.subtitle = req.body.subtitle;
      if (req.body.tagline !== undefined) updateData.tagline = req.body.tagline;
      if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
      if (req.body.backgroundColor !== undefined) updateData.backgroundColor = req.body.backgroundColor;
      if (req.body.stats !== undefined) updateData.stats = req.body.stats;
      if (req.body.features !== undefined) updateData.features = req.body.features;

      console.log('Update data prepared:', updateData);

      const settings = await prisma.authPageSettings.upsert({
        where: { page },
        create: {
          page,
          title: req.body.title || 'SellIt.',
          subtitle: req.body.subtitle || 'Welcome',
          tagline: req.body.tagline || '',
          imageUrl: req.body.imageUrl || '',
          backgroundColor: req.body.backgroundColor || '#1e293b',
          ...updateData
        },
        update: updateData
      });

      console.log('Settings updated successfully:', settings);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Update auth settings error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update settings',
        error: error.message 
      });
    }
  }
);

// Upload image for auth pages
router.post('/upload-image',
  authenticate,
  authorize('ADMIN'),
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
      }

      // Get the API base URL
      const apiBaseUrl =
        process.env.API_BASE_URL ||
        process.env.BACKEND_URL ||
        process.env.BASE_URL ||
        'http://148.230.67.118:5000';
      const imageUrl = `${apiBaseUrl}/uploads/auth-images/${req.file.filename}`;

      res.json({
        success: true,
        imageUrl: imageUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('Upload auth image error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
  }
);

module.exports = router;

