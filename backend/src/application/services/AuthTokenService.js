const JwtService = require('../../infrastructure/auth/JwtService');
const RefreshTokenRepository = require('../../infrastructure/database/repositories/RefreshTokenRepository');
const RefreshToken = require('../../domain/entities/RefreshToken');
const TokenConfig = require('../../domain/config/TokenConfig');
const AuthDomainService = require('../../domain/services/AuthDomainService');

/**
 * Auth Token Service
 * Application layer - handles access and refresh token operations
 */
class AuthTokenService {
  /**
   * Generate token pair (access + refresh)
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<Object>} Token pair with access and refresh tokens
   */
  async generateTokenPair(userId, role = 'USER') {
    // Business rule: Validate user ID
    if (!AuthDomainService.isValidUserId(userId)) {
      throw new Error('Invalid user ID');
    }

    // Generate tokens (infrastructure)
    const tokenPair = JwtService.generateTokenPair(userId, role);

    // Create refresh token entity
    const refreshTokenEntity = new RefreshToken({
      userId,
      token: tokenPair.refreshToken,
      expiresAt: tokenPair.refreshTokenExpiresAt
    });

    // Save refresh token to database
    const savedRefreshToken = await RefreshTokenRepository.create(refreshTokenEntity.toJSON());

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      refreshTokenId: savedRefreshToken.id,
      expiresAt: tokenPair.refreshTokenExpiresAt
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token string
   * @returns {Promise<Object>} New token pair
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Find refresh token in database
    const storedToken = await RefreshTokenRepository.findByToken(refreshToken);

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    // Create entity to check business rules
    const refreshTokenEntity = new RefreshToken({
      id: storedToken.id,
      userId: storedToken.userId,
      token: storedToken.token,
      expiresAt: storedToken.expiresAt,
      createdAt: storedToken.createdAt,
      revokedAt: storedToken.revokedAt,
      revoked: storedToken.revoked
    });

    // Business rule: Check if token is valid
    if (!refreshTokenEntity.isValid()) {
      throw new Error('Refresh token is expired or revoked');
    }

    // Business rule: Check if user can authenticate
    if (!AuthDomainService.canAuthenticate(storedToken.user)) {
      throw new Error('User account is deactivated');
    }

    // Revoke old refresh token (token rotation for security)
    if (TokenConfig.ROTATE_REFRESH_TOKEN) {
      await RefreshTokenRepository.revoke(refreshToken);
    }

    // Generate new token pair
    const newTokenPair = await this.generateTokenPair(
      storedToken.userId,
      storedToken.user.role || 'USER'
    );

    return newTokenPair;
  }

  /**
   * Revoke refresh token
   * @param {string} refreshToken - Refresh token string
   * @param {string} userId - User ID (for verification)
   * @returns {Promise<Object>} Revocation result
   */
  async revokeRefreshToken(refreshToken, userId) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const storedToken = await RefreshTokenRepository.findValidToken(userId, refreshToken);

    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    await RefreshTokenRepository.revoke(refreshToken);

    return { success: true, message: 'Refresh token revoked successfully' };
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Revocation result
   */
  async revokeAllRefreshTokens(userId) {
    if (!AuthDomainService.isValidUserId(userId)) {
      throw new Error('Invalid user ID');
    }

    await RefreshTokenRepository.revokeAllForUser(userId);

    return { success: true, message: 'All refresh tokens revoked successfully' };
  }

  /**
   * Verify access token
   * @param {string} accessToken - Access token string
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyAccessToken(accessToken) {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    try {
      return JwtService.verifyAccessToken(accessToken);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get active refresh tokens count for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of active tokens
   */
  async getActiveTokensCount(userId) {
    return await RefreshTokenRepository.countActiveTokens(userId);
  }
}

module.exports = new AuthTokenService();
