const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

/**
 * JWT Service
 * Infrastructure layer - handles JWT token generation and verification
 * This is a technical concern, so it belongs in Infrastructure layer
 */
class JwtService {
  /**
   * Generate Access Token (short-lived)
   * @param {string} userId - User ID to encode in token
   * @param {string} role - User role (optional, for expiration calculation)
   * @returns {string} JWT access token
   */
  generateAccessToken(userId, role = 'USER') {
    if (!userId) {
      throw new Error('User ID is required to generate token');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const TokenConfig = require('../../domain/config/TokenConfig');
    const expiresIn = TokenConfig.getAccessTokenExpiration(role);

    const payload = {
      userId,
      type: 'access', // Token type
      iat: Math.floor(Date.now() / 1000) // Issued at time
    };

    const options = {
      expiresIn
    };

    try {
      return jwt.sign(payload, process.env.JWT_SECRET, options);
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Generate Refresh Token (long-lived, stored in database)
   * @param {string} userId - User ID
   * @param {string} role - User role (optional, for expiration calculation)
   * @returns {Object} Refresh token object with token and expiration
   */
  generateRefreshToken(userId, role = 'USER') {
    if (!userId) {
      throw new Error('User ID is required to generate refresh token');
    }

    const TokenConfig = require('../../domain/config/TokenConfig');
    const expiresIn = TokenConfig.getRefreshTokenExpiration(role);
    const expiresAt = TokenConfig.calculateExpirationDate(expiresIn);

    // Generate a secure random token (not JWT, just a random string)
    const token = crypto.randomBytes(64).toString('hex');

    return {
      token,
      expiresAt,
      expiresIn
    };
  }

  /**
   * Generate both access and refresh tokens
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Object} Object containing accessToken and refreshToken
   */
  generateTokenPair(userId, role = 'USER') {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = this.generateRefreshToken(userId, role);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt
    };
  }

  /**
   * Generate JWT token for user (legacy method - kept for backward compatibility)
   * @param {string} userId - User ID to encode in token
   * @returns {string} JWT token
   * @deprecated Use generateAccessToken instead
   */
  generateToken(userId) {
    return this.generateAccessToken(userId);
  }

  /**
   * Verify and decode JWT access token
   * @param {string} token - JWT token to verify
   * @param {boolean} allowExpired - Allow expired tokens (for refresh flow)
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  verifyAccessToken(token, allowExpired = false) {
    if (!token) {
      throw new Error('Token is required');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify token type
      if (decoded.type && decoded.type !== 'access') {
        throw new Error('Invalid token type. Expected access token.');
      }
      
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        if (allowExpired) {
          // Decode without verification to get payload
          return jwt.decode(token);
        }
        throw new Error('Access token has expired. Please refresh your token.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Verify and decode JWT token (legacy method)
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   * @throws {Error} If token is invalid or expired
   * @deprecated Use verifyAccessToken instead
   */
  verifyToken(token) {
    return this.verifyAccessToken(token);
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token payload (not verified)
   */
  decodeToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null if not available
   */
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) return true;
      return expiration < new Date();
    } catch (error) {
      return true;
    }
  }
}

// Export singleton instance
module.exports = new JwtService();
