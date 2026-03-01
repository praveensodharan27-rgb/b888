const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../src/config/logger');

const prisma = new PrismaClient();

function log(req, level, msg, data = {}) {
  const l = (req && req.log) ? req.log : logger;
  const ctx = req && req.id ? { requestId: req.id, ...data } : data;
  l[level](ctx, msg);
}

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      log(req, 'error', 'JWT_SECRET is not set in environment variables');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        log(req, 'warn', 'Invalid JWT token', { reason: jwtError.message });
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      if (jwtError.name === 'TokenExpiredError') {
        log(req, 'warn', 'Expired JWT token');
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      throw jwtError;
    }

    if (!decoded.userId) {
      log(req, 'warn', 'Token missing userId');
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        tokenInvalidatedAt: true,
        avatar: true,
        role: true,
        isVerified: true,
        provider: true,
        providerId: true,
        isDeactivated: true,
        deactivatedAt: true
      }
    });

    if (!user) {
      log(req, 'warn', 'User not found for token', { userId: decoded.userId });
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if token was invalidated (logout all devices)
    if (user.tokenInvalidatedAt) {
      const tokenIat = decoded.iat || 0; // Issued at time from token
      const invalidatedAt = Math.floor(new Date(user.tokenInvalidatedAt).getTime() / 1000);
      
      if (tokenIat < invalidatedAt) {
        log(req, 'warn', 'Token was invalidated (logout all devices)', { userId: user.id });
        return res.status(401).json({ success: false, message: 'Token has been invalidated. Please login again.' });
      }
    }

    // Check if account is deactivated
    if (user.isDeactivated) {
      // Check if 7 days have passed
      if (user.deactivatedAt) {
        const daysSinceDeactivation = (new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceDeactivation >= 7) {
          return res.status(401).json({ 
            success: false, 
            message: 'Account has been permanently deleted' 
          });
        }
      }
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated. Please reactivate to continue.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    log(req, 'error', 'Authentication error', { err: error.message });
    const safeMessage = process.env.NODE_ENV === 'production' ? 'Authentication error' : (error.message || 'Authentication error');
    res.status(500).json({ success: false, message: safeMessage });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    next();
  };
};

// Optional authentication - sets req.user if token is valid, but doesn't fail if token is missing
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // No token provided - continue without setting req.user
      return next();
    }

    if (!process.env.JWT_SECRET) {
      // JWT_SECRET not set - continue without authentication
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (jwtError) {
      // Invalid or expired token - continue without setting req.user
      return next();
    }

    if (!decoded.userId) {
      // Invalid token format - continue without setting req.user
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        tokenInvalidatedAt: true,
        avatar: true,
        role: true,
        isVerified: true,
        provider: true,
        providerId: true,
        isDeactivated: true,
        deactivatedAt: true
      }
    });

    if (user && !user.isDeactivated) {
      // Set req.user only if user exists and is not deactivated
      // For optional auth, we don't check token invalidation (allows expired tokens)
      req.user = user;
    }

    next();
  } catch (error) {
    // On any error, continue without authentication
    next();
  }
};

module.exports = { authenticate, authorize, optionalAuthenticate };

