const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const env = require('./config/env');

// Import routes
const authRoutes = require('./modules/auth/routes/authRoutes');

// Import old routes (temporary - will be migrated to Clean Architecture)
const oldAuthRoutes = require('../routes/auth'); // Old auth routes (register, login, etc.)
const userRoutes = require('../routes/user');
const adRoutes = require('../routes/ads');
const categoryRoutes = require('../routes/categories');
const locationRoutes = require('../routes/locations');
const premiumRoutes = require('../routes/premium');
const chatRoutes = require('../routes/chat');
const bannerRoutes = require('../routes/banners');
const interstitialAdRoutes = require('../routes/interstitial-ads');
const adminRoutes = require('../routes/admin');
const testEmailRoutes = require('../routes/test-email');
const pushRoutes = require('../routes/push');
const walletRoutes = require('../routes/wallet');
const referralRoutes = require('../routes/referral');

// Create Express app
const app = express();

// CORS Configuration - More permissive in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow ALL localhost origins (very permissive)
    if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
      if (origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://0.0.0.0:')) {
        return callback(null, true);
      }
    }
    
    // Check against configured frontend URL
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ].filter(Boolean); // Remove any null/undefined values
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, be more lenient
      if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
        console.warn(`CORS: Allowing origin in dev mode: ${origin}`);
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for OAuth (optional, using stateless JWT instead)
const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically (for local development)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API Routes
// OAuth routes (must be before other auth routes)
app.use('/api/auth', require('../routes/oauth'));
// New Clean Architecture auth routes (send-otp, verify-otp)
app.use('/api/auth', authRoutes);
// Old auth routes (register, login, etc.) - mounted after new routes so they take precedence
app.use('/api/auth', oldAuthRoutes);

// Legacy routes (from old server - will be migrated to Clean Architecture)
app.use('/api/user', userRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/interstitial-ads', interstitialAdRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/premium', require('../routes/admin-premium'));
app.use('/api/ai', require('../routes/ai'));
app.use('/api/push', pushRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/test', testEmailRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Initialize Socket.IO for real-time chat
const http = require('http');
const { Server } = require('socket.io');
const { setupSocketIO } = require('../socket/socket');

// Import Prisma for scheduled tasks
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'http://127.0.0.1:3000']
      : env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Setup Socket.IO handlers
setupSocketIO(io);

// Start server
const PORT = env.PORT;

// Scheduled task to mark expired ads (runs every hour)
async function markExpiredAds() {
  try {
    const now = new Date();
    const expiredAds = await prisma.ad.findMany({
      where: {
        status: 'APPROVED',
        expiresAt: {
          lte: now
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (expiredAds.length === 0) {
      return;
    }

    // Mark ads as expired and create notifications
    const { emitNotification } = require('../socket/socket');
    for (const ad of expiredAds) {
      // Update ad status
      await prisma.ad.update({
        where: { id: ad.id },
        data: { status: 'EXPIRED' }
      });

      // Create notification for ad owner
      const notification = await prisma.notification.create({
        data: {
          userId: ad.userId,
          title: 'Ad Expired',
          message: `Your ad "${ad.title}" has expired. You can repost it to keep it active.`,
          type: 'ad_expired',
          link: `/ads/${ad.id}`
        }
      });

      // Emit real-time notification via Socket.IO
      emitNotification(ad.userId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        isRead: false,
        createdAt: notification.createdAt
      });
    }

    console.log(`⏰ Marked ${expiredAds.length} expired ad(s) as EXPIRED and sent notifications`);
  } catch (error) {
    console.error('❌ Error marking expired ads:', error);
  }
}

// Run immediately on startup, then every hour
markExpiredAds();
setInterval(markExpiredAds, 60 * 60 * 1000); // Every hour

// Setup cron jobs for scheduled tasks
if (process.env.NODE_ENV !== 'test') {
  try {
    const { setupCronJobs } = require('../utils/cron');
    setupCronJobs();
  } catch (error) {
    console.warn('⚠️  Could not setup cron jobs (node-cron may not be installed):', error.message);
  }
}

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`💬 Socket.IO initialized for real-time chat`);
  console.log(`⏰ Ad expiration checker running (every hour)`);
  console.log(`\n✅ Clean Architecture Routes:`);
  console.log(`   POST /api/auth/send-otp`);
  console.log(`   POST /api/auth/verify-otp`);
  console.log(`\n📦 Auth Routes (from old server):`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/login-otp`);
  console.log(`\n📦 Other Legacy Routes (migrated from old server):`);
  console.log(`   /api/user/*`);
  console.log(`   /api/ads/*`);
  console.log(`   /api/categories/*`);
  console.log(`   /api/locations/*`);
  console.log(`   /api/premium/*`);
  console.log(`   /api/chat/*`);
  console.log(`   /api/banners/*`);
  console.log(`   /api/admin/*`);
  console.log(`   /api/test/*`);
  console.log(`\n   GET  /health\n`);
});

module.exports = app;

