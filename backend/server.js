const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const userRoutes = require('./routes/user');
const adRoutes = require('./routes/ads');
const categoryRoutes = require('./routes/categories');
const locationRoutes = require('./routes/locations');
const premiumRoutes = require('./routes/premium');
const businessPackageRoutes = require('./routes/business-package');
const chatRoutes = require('./routes/chat');
const bannerRoutes = require('./routes/banners');
const interstitialAdRoutes = require('./routes/interstitial-ads');
const adminRoutes = require('./routes/admin');
const adminPremiumRoutes = require('./routes/admin-premium');
const adminPaymentsRoutes = require('./routes/admin-payments');
const walletRoutes = require('./routes/wallet');
const referralRoutes = require('./routes/referral');
const testEmailRoutes = require('./routes/test-email');
const aiRoutes = require('./routes/ai');
const geocodingRoutes = require('./routes/geocoding');
const searchRoutes = require('./routes/search');
const searchAlertsRoutes = require('./routes/search-alerts');
const moderationRoutes = require('./routes/moderation');
const pushRoutes = require('./routes/push');
const authSettingsRoutes = require('./routes/auth-settings');
const followRoutes = require('./routes/follow');
const contactRequestRoutes = require('./routes/contact-request');
const blockRoutes = require('./routes/block');
const paymentGatewayRoutes = require('./routes/payment-gateway');
const sessionRoutes = require('./routes/session');
const systemRoutes = require('./routes/system');
const mobileRoutes = require('./routes/mobile');
const offerRoutes = require('./routes/offers');
const clusterRoutes = require('./routes/clusters');
const { setupSocketIO } = require('./socket/socket');
const { initializeIndex } = require('./services/meilisearch');
const { setupCronJobs } = require('./utils/cron');

const app = express();
const httpServer = createServer(app);

// CORS setup – allow localhost in dev, FRONTEND_URL in prod
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production';

// Build allowed origins list
const allowedOrigins = isProduction && process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002',
    ];

const isAllowedOrigin = (origin) => {
  // In development, allow requests without origin (same-origin, Postman, etc.)
  if (!origin) {
    return isDevelopment;
  }
  
  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // In development, allow any localhost or 127.0.0.1 with any port
  if (isDevelopment && origin.match(/^https?:\/\/(localhost|127\.0.0\.1|0\.0\.0\.0)(:\d+)?$/)) {
    return true;
  }
  
  return false;
};

console.log('🌐 CORS Configuration:');
console.log('  - Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('  - Allowed Origins:', allowedOrigins);
console.log('  - Credentials:', true);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  }
});

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin && isDevelopment) {
      return callback(null, true);
    }
    
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-HTTP-Method-Override'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// ===== CORS CONFIGURATION - MUST BE FIRST MIDDLEWARE =====
// Apply CORS middleware before ALL other middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight requests for all routes
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (isDevelopment) {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else if (isDevelopment && origin && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (isDevelopment) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-HTTP-Method-Override');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Add CORS headers to all responses as a fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log CORS requests for debugging
  if (req.method === 'OPTIONS' || origin) {
    console.log(`🌐 CORS Request: ${req.method} ${req.path}`, {
      origin: origin || 'no-origin',
      allowed: isAllowedOrigin(origin)
    });
  }
  
  // Set CORS headers on all responses
  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (isDevelopment) {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else if (isDevelopment && origin && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/)) {
    // Development fallback: allow any localhost
    res.header('Access-Control-Allow-Origin', origin);
  } else if (isDevelopment && !origin) {
    // Development: allow requests without origin
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-HTTP-Method-Override');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  // Disable CORS restrictions in helmet since we handle it with cors middleware
  crossOriginEmbedderPolicy: false
}));
// Optimize compression - compress all responses
app.use(compression({
  level: 6, // Compression level (1-9, 6 is a good balance)
  filter: (req, res) => {
    // Compress all responses except if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for Passport (required for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from uploads directory with CORS headers and optimized caching
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files - use same logic as main CORS
  const origin = req.headers.origin;
  
  // Allow same origins as main CORS
  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (isDevelopment) {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else if (isDevelopment && origin && origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (isProduction && process.env.FRONTEND_URL) {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
  } else if (isDevelopment) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } 
  
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  // Remove Cross-Origin-Resource-Policy to allow cross-origin requests
  next();
}, express.static(uploadsPath, {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
    // Aggressive caching for static assets
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Enable compression for images
    res.setHeader('Vary', 'Accept-Encoding');
  }
}));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes); // OAuth routes (Google, Facebook)
app.use('/api/user', userRoutes);
app.use('/api/profile', userRoutes); // Profile routes (alias for user routes)
console.log('✅ Profile routes registered at /api/profile');
app.use('/api/follow', followRoutes);
app.use('/api/contact-request', contactRequestRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/business-package', businessPackageRoutes);
console.log('✅ Business package routes registered at /api/business-package');
app.use('/api/chat', chatRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/interstitial-ads', interstitialAdRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/premium', adminPremiumRoutes);
app.use('/api/admin/payments', adminPaymentsRoutes);
console.log('✅ Admin premium routes registered at /api/admin/premium');
app.use('/api/wallet', walletRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/test', testEmailRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/search-alerts', searchAlertsRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/auth-settings', authSettingsRoutes);
console.log('✅ Auth settings routes registered at /api/auth-settings');
app.use('/api/payment-gateway', paymentGatewayRoutes);
console.log('✅ Payment gateway routes registered at /api/payment-gateway');
const rateLimitRoutes = require('./routes/rate-limit');
app.use('/api/rate-limit', rateLimitRoutes);
app.use('/api/session', sessionRoutes);
console.log('✅ Session management routes registered at /api/session');
app.use('/api/system', systemRoutes);
console.log('✅ System routes registered at /api/system');
app.use('/api/mobile', mobileRoutes);
console.log('✅ Mobile routes registered at /api/mobile');
app.use('/api/offers', offerRoutes);
app.use('/api/clusters', clusterRoutes);
console.log('✅ Clusters & Auto Lists routes registered at /api/clusters');
console.log('✅ Offer routes registered at /api/offers');
console.log('✅ Rate limit routes registered at /api/rate-limit');

// Setup Socket.IO
setupSocketIO(io);
console.log('✅ Socket.IO initialized and attached to HTTP server');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

const server = httpServer.listen(PORT, HOST, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`🌐 Accessible from network at http://localhost:${PORT}`);
  
  // Initialize Meilisearch index settings (no indexing on startup)
  try {
    const meilisearch = require('./services/meilisearch');
    const initialized = await meilisearch.initializeIndex();
    if (initialized) {
      console.log('✅ Meilisearch index configured (ads will be indexed on create/update)');
    }
  } catch (error) {
    console.warn('⚠️ Meilisearch initialization failed:', error.message);
    console.warn('⚠️ Search will fallback to database queries');
  }
  
  // Setup cron jobs for scheduled tasks
  try {
    setupCronJobs();
  } catch (error) {
    console.error('❌ Failed to setup cron jobs:', error);
  }
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Closing server gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    const db = require('./db/database');
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
        process.exit(1);
      }
      console.log('✅ Database connection closed');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart signal

module.exports = { app, io };

