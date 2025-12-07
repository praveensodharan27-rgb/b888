const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Refresh Token Repository
 * Data access layer for RefreshToken entity
 */
class RefreshTokenRepository {
  /**
   * Create a new refresh token
   * @param {Object} data - Refresh token data
   * @returns {Promise<Object>} Created refresh token
   */
  async create(data) {
    return await prisma.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        revoked: false,
        revokedAt: null
      }
    });
  }

  /**
   * Find refresh token by token string
   * @param {string} token - Refresh token string
   * @returns {Promise<Object|null>} Refresh token or null
   */
  async findByToken(token) {
    return await prisma.refreshToken.findFirst({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
            isDeactivated: true
          }
        }
      }
    });
  }

  /**
   * Find all refresh tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of refresh tokens
   */
  async findByUserId(userId) {
    return await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find valid refresh token for user
   * @param {string} userId - User ID
   * @param {string} token - Refresh token string
   * @returns {Promise<Object|null>} Valid refresh token or null
   */
  async findValidToken(userId, token) {
    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        userId,
        token,
        revoked: false
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
            isDeactivated: true
          }
        }
      }
    });

    if (!refreshToken) {
      return null;
    }

    // Check if expired
    if (new Date(refreshToken.expiresAt) < new Date()) {
      return null;
    }

    return refreshToken;
  }

  /**
   * Revoke a refresh token
   * @param {string} token - Refresh token string
   * @returns {Promise<Object>} Updated refresh token
   */
  async revoke(token) {
    return await prisma.refreshToken.updateMany({
      where: { token },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async revokeAllForUser(userId) {
    return await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false
      },
      data: {
        revoked: true,
        revokedAt: new Date()
      }
    });
  }

  /**
   * Delete expired refresh tokens
   * @returns {Promise<Object>} Delete result
   */
  async deleteExpired() {
    return await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }

  /**
   * Delete a refresh token
   * @param {string} token - Refresh token string
   * @returns {Promise<Object>} Delete result
   */
  async delete(token) {
    return await prisma.refreshToken.deleteMany({
      where: { token }
    });
  }

  /**
   * Count active refresh tokens for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of active tokens
   */
  async countActiveTokens(userId) {
    return await prisma.refreshToken.count({
      where: {
        userId,
        revoked: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }
}

module.exports = new RefreshTokenRepository();
