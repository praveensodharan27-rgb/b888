const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../utils/jwt');

const router = express.Router();
const prisma = new PrismaClient();

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('✅ Google OAuth Strategy configured');
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || process.env.BASE_URL || 'http://148.230.67.118:5000'}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let user = await prisma.user.findFirst({
        where: {
          provider: 'google',
          providerId: profile.id
        }
      });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with this email
      if (profile.emails && profile.emails[0]) {
        const email = profile.emails[0].value.toLowerCase();
        user = await prisma.user.findFirst({
          where: { email }
        });

        if (user) {
          // Link Google account to existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'google',
              providerId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatar,
              isVerified: true
            }
          });
          return done(null, user);
        }
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          name: profile.displayName || profile.name?.givenName || 'User',
          email: profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          provider: 'google',
          providerId: profile.id,
          isVerified: true
        }
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
  ));
} else {
  console.warn('⚠️  Google OAuth not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// Configure Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  console.log('✅ Facebook OAuth Strategy configured');
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${process.env.BACKEND_URL || process.env.BASE_URL || 'http://148.230.67.118:5000'}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'email', 'picture.type(large)']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Facebook ID
      let user = await prisma.user.findFirst({
        where: {
          provider: 'facebook',
          providerId: profile.id
        }
      });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with this email
      if (profile.emails && profile.emails[0]) {
        const email = profile.emails[0].value.toLowerCase();
        user = await prisma.user.findFirst({
          where: { email }
        });

        if (user) {
          // Link Facebook account to existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'facebook',
              providerId: profile.id,
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : user.avatar,
              isVerified: true
            }
          });
          return done(null, user);
        }
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          name: profile.displayName || profile.name?.givenName || 'User',
          email: profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          provider: 'facebook',
          providerId: profile.id,
          isVerified: true
        }
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
  ));
} else {
  console.warn('⚠️  Facebook OAuth not configured: Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Helper function to check if Google strategy is configured
const isGoogleStrategyConfigured = () => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!isGoogleStrategyConfigured()) {
    console.error('❌ Google OAuth not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
    return res.redirect(`${frontendUrl}/login?error=google_oauth_not_configured`);
  }
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  if (!isGoogleStrategyConfigured()) {
    console.error('❌ Google OAuth not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
    return res.redirect(`${frontendUrl}/login?error=google_oauth_not_configured`);
  }
  next();
}, passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000'}/login?error=oauth_failed` }), async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        console.error('Google OAuth: User not found in request');
        return res.redirect(`${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000'}/login?error=oauth_failed`);
      }
      
      const token = generateToken(user.id);
      console.log('✅ Google OAuth success:', { userId: user.id, email: user.email, provider: user.provider });
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=google`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000'}/login?error=oauth_failed`);
    }
  }
);

// Helper function to check if Facebook strategy is configured
const isFacebookStrategyConfigured = () => {
  return !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
};

// Facebook OAuth routes
router.get('/facebook', (req, res, next) => {
  if (!isFacebookStrategyConfigured()) {
    console.error('❌ Facebook OAuth not configured: Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
    return res.redirect(`${frontendUrl}/login?error=facebook_oauth_not_configured`);
  }
  next();
}, passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', (req, res, next) => {
  if (!isFacebookStrategyConfigured()) {
    console.error('❌ Facebook OAuth not configured: Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
    return res.redirect(`${frontendUrl}/login?error=facebook_oauth_not_configured`);
  }
  next();
}, passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000'}/login?error=oauth_failed` }), async (req, res) => {
    try {
      const user = req.user;
      if (!user || !user.id) {
        console.error('Facebook OAuth: User not found in request');
        return res.redirect(`${process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000'}/login?error=oauth_failed`);
      }
      
      const token = generateToken(user.id);
      console.log('✅ Facebook OAuth success:', { userId: user.id, email: user.email, provider: user.provider });
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://148.230.67.118:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=facebook`);
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
  }
);

module.exports = router;

