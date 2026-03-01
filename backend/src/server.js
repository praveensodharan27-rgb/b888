const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const env = require('./config/env');
const { logger, logError } = require('./config/logger');
const { requestId } = require('../middleware/requestId');

// Import routes
const authRoutes = require('./modules/auth/routes/authRoutes');

// Import old routes (temporary - will be migrated to Clean Architecture)
const oldAuthRoutes = require('../routes/auth'); // Old auth routes (register, login, etc.)
const userRoutes = require('../routes/user');
let adRoutes;
try {
  adRoutes = require('../routes/ads');
} catch (error) {
  const isMissingAdsRoute =
    error?.code === 'MODULE_NOT_FOUND' &&
    typeof error?.message === 'string' &&
    (error.message.includes('../routes/ads') ||
      error.message.includes('..\\routes\\ads'));

  if (isMissingAdsRoute) {
    logger.warn({ path: '../routes/ads' }, 'Ads routes not found. Skipping /api/ads.');
  } else {
    throw error;
  }
}
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
const filterConfigRoutes = require('../routes/filter-configurations');
const filterValuesRoutes = require('../routes/filter-values');
const brandsRoutes = require('../routes/brands');
const businessPackageRoutes = require('../routes/business-package');
const geocodingRoutes = require('../routes/geocoding');
const followRoutes = require('../routes/follow');

// Create Express app
const app = express();

// CORS Configuration - More permissive in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Explicit allowlist (no wildcard / allow-any in production or dev)
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://0.0.0.0:3000',
      'http://0.0.0.0:3001',
    ].filter(Boolean);

    if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://0.0.0.0:')) {
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // In dev, allow same host with any port
        try {
          const u = new URL(origin);
          if (['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname)) return callback(null, true);
        } catch (_) {}
      }
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      frameAncestors: ["'self'"],
    },
  },
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for OAuth (optional, using stateless JWT instead)
const session = require('express-session');
const sessionSecret = env.SESSION_SECRET || env.JWT_SECRET;
if (env.NODE_ENV === 'production' && !sessionSecret) {
  logger.error('SESSION_SECRET or JWT_SECRET must be set in production');
  process.exit(1);
}
app.use(session({
  secret: sessionSecret || 'dev-session',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: env.NODE_ENV === 'production', sameSite: 'lax' }
}));

// Initialize Passport
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically (for local development)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request ID and structured HTTP logging (for debugging: trace all requests by id)
app.use(requestId);
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
  autoLogging: { ignore: (req) => req.path === '/health' },
}));

// Health check (no rate limit - for load balancers / monitoring)
app.get('/health', (req, res) => {
  let meilisearch = false;
  let redis = false;
  try {
    const { getIsMeilisearchAvailable } = require('../services/meilisearch');
    meilisearch = getIsMeilisearchAvailable();
  } catch (_) {}
  try {
    const { isAvailable } = require('../config/redis');
    redis = isAvailable();
  } catch (_) {}
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    meilisearch,
    redis,
  });
});

// ---------- Rate limiting (security: brute force, abuse, DDoS) ----------
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// General API: 200 requests per 15 min per IP (skip health, uploads, and read-only notifications polling)
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'production' ? 200 : 500,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/admin') ||
    (req.method === 'GET' && req.path === '/user/notifications') ||
    (req.method === 'GET' && (req.path?.includes('interstitial-ads') || req.originalUrl?.includes('interstitial-ads'))),
});
app.use('/api', generalLimiter);

// Auth routes: stricter (prevents OTP bombing, brute force login)
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'production' ? 15 : 30,
  message: { success: false, message: 'Too many auth attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Stricter limit for login and OTP (brute-force / OTP bombing prevention)
const authStrictLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'production' ? 5 : 15,
  message: { success: false, message: 'Too many attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authStrictLimiter);
app.use('/api/auth/send-otp', authStrictLimiter);

// API Routes
// OAuth routes (must be before other auth routes)
app.use('/api/auth', require('../routes/oauth'));
// Old auth routes (register, login, send-otp, verify-otp) - MUST be before authRoutes
// because old verify-otp returns JWT token; Clean Architecture verify-otp does not
app.use('/api/auth', oldAuthRoutes);
// Clean Architecture auth routes (fallback - only if old routes don't match)
app.use('/api/auth', authRoutes);

// Legacy routes (from old server - will be migrated to Clean Architecture)
app.use('/api/user', userRoutes);
if (adRoutes) {
  app.use('/api/ads', adRoutes);
}
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/business-package', businessPackageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/interstitial-ads', interstitialAdRoutes);
app.use('/api/sponsored-ads', require('../routes/sponsored-ads'));
app.use('/api/admin', adminRoutes);
app.use('/api/admin/premium', require('../routes/admin-premium'));
app.use('/api/ai', require('../routes/ai'));
app.use('/api/push', pushRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/filter-configurations', filterConfigRoutes);
app.use('/api/filter-values', filterValuesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/free-posting-promos', require('../routes/free-posting-promos'));
app.use('/api/follow', followRoutes);
app.use('/api/business', require('../routes/business'));
app.use('/api/directory', require('../routes/directory'));
app.use('/api/contact-request', require('../routes/contact-request'));
app.use('/api/reports', require('../routes/reports'));
app.use('/api/moderation', require('../routes/moderation'));
app.use('/api/credits', require('../routes/credits'));
app.use('/api/redis', require('../routes/redis-health'));
app.use('/api/search', require('../routes/search'));
app.use('/api/home-feed', require('../routes/home-feed'));

// Test/debug routes — only in non-production to prevent abuse and info disclosure
if (env.NODE_ENV !== 'production') {
  app.use('/api/test', testEmailRoutes);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (structured so bugs are easy to trace)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const ctx = { requestId: req.id, path: req.path, method: req.method, status };
  if (req.log) req.log.error({ err, ...ctx }, err.message || 'Request error');
  else logError(err, ctx);
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Internal server error');
  res.status(status).json({
    success: false,
    message,
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

// Meilisearch: start background health check (non-blocking; reconnects when down)
try {
  const { startBackgroundHealthCheck } = require('../services/meilisearch');
  setImmediate(() => startBackgroundHealthCheck());
} catch (_) {}

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

    logger.info({ count: expiredAds.length }, 'Marked expired ads as EXPIRED and sent notifications');
  } catch (error) {
    logger.error({ err: error }, 'Error marking expired ads');
  }
}

// Run expired-ads and cron after server is listening (non-blocking startup)
setInterval(markExpiredAds, 60 * 60 * 1000); // Every hour

// Setup cron jobs for scheduled tasks (schedules only; heavy work runs on timer)
if (process.env.NODE_ENV !== 'test') {
  try {
    const { setupCronJobs } = require('../utils/cron');
    setupCronJobs();
  } catch (error) {
    logger.warn({ err: error.message }, 'Could not setup cron jobs (node-cron may not be installed)');
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

// Server error handler
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: PORT }, `Port ${PORT} is already in use. Kill the process and restart.`);
    process.exit(1);
  } else {
    logger.error({ err: error }, 'Server error');
    process.exit(1);
  }
});

server.listen(PORT, () => {
  logger.info({
    event: 'server_start',
    port: PORT,
    env: env.NODE_ENV,
    frontendUrl: env.FRONTEND_URL,
    rateLimit: { api: env.NODE_ENV === 'production' ? 200 : 500, auth: env.NODE_ENV === 'production' ? 15 : 30 },
  }, 'Server running');
  logger.info('Socket.IO ready | Ad expiration every 1h | GET /health');

  // Defer heavy startup jobs so listen completes fast (~2s → minimal blocking)
  setImmediate(() => {
    markExpiredAds().catch((err) => logger.error({ err: err.message }, 'markExpiredAds failed'));
  });
});

module.exports = app;
