require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDev = !isProduction && !isTest;

/**
 * Environment Configuration
 * Production: DATABASE_URL and JWT_SECRET have NO defaults (empty if unset → app exits).
 * Development: optional dev fallbacks so local runs without .env still start (use .env for real DB).
 */
const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://148.230.67.118:3000',
  isDev,
  isTest,
  isProduction,

  // Database - MongoDB (production: no default = empty → validateEnv exits)
  DATABASE_URL: isProduction
    ? (process.env.DATABASE_URL || process.env.MONGO_URI || '')
    : (process.env.DATABASE_URL || process.env.MONGO_URI || ''),
  MONGO_URI: isProduction
    ? (process.env.MONGO_URI || process.env.DATABASE_URL || '')
    : (process.env.MONGO_URI || process.env.DATABASE_URL || ''),

  // JWT (production: no default = empty → validateEnv exits)
  JWT_SECRET: isProduction
    ? (process.env.JWT_SECRET || '')
    : (process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER,

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  // OTP
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH || '6', 10),

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  USE_CLOUDINARY: process.env.USE_CLOUDINARY === 'true',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Google OAuth (for social login)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY, // Optional: for other Google services
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY, // For Google Maps Geocoding API

  // Facebook OAuth (for social login)
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,

  // Session (for OAuth) – production: no fallback to JWT_SECRET if empty
  SESSION_SECRET: isProduction
    ? (process.env.SESSION_SECRET || process.env.JWT_SECRET || '')
    : (process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session'),
  BACKEND_URL: process.env.BACKEND_URL || process.env.BASE_URL || `http://148.230.67.118:${process.env.PORT || '5000'}`,
};

/**
 * Validate required environment variables.
 * Production: DATABASE_URL, JWT_SECRET, and SESSION_SECRET must be set (non-empty) or process exits.
 */
const validateEnv = () => {
  const required = isProduction ? ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'] : ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !env[key] || String(env[key]).trim() === '');

  if (missing.length > 0) {
    console.error('❌ Missing or empty required environment variables:', missing.join(', '));
    if (isProduction) {
      process.exit(1);
    }
    console.warn('⚠️ Development mode: set DATABASE_URL and JWT_SECRET in .env for real DB and auth.');
  }
};

// Validate on load
validateEnv();

module.exports = env;

