const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not set in environment variables');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        console.error('❌ Invalid JWT token:', jwtError.message);
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      if (jwtError.name === 'TokenExpiredError') {
        console.error('❌ Expired JWT token');
        return res.status(401).json({ success: false, message: 'Token expired' });
      }
      throw jwtError;
    }

    if (!decoded.userId) {
      console.error('❌ Token missing userId:', decoded);
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
      console.error('❌ User not found for userId:', decoded.userId);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if token was invalidated (logout all devices)
    if (user.tokenInvalidatedAt) {
      const tokenIat = decoded.iat || 0; // Issued at time from token
      const invalidatedAt = Math.floor(new Date(user.tokenInvalidatedAt).getTime() / 1000);
      
      if (tokenIat < invalidatedAt) {
        console.error('❌ Token was invalidated (logout all devices)');
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
    console.error('❌ Authentication error:', error);
    res.status(500).json({ success: false, message: 'Authentication error', error: error.message });
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

module.exports = { authenticate, authorize };

