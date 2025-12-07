const AuthTokenService = require('../../application/services/AuthTokenService');

/**
 * Auth Token Controller
 * Handles HTTP requests/responses for token operations
 */
class AuthTokenController {
  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const tokenPair = await AuthTokenService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.expiresAt
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Failed to refresh token'
      });
    }
  }

  /**
   * Revoke refresh token (logout)
   * POST /api/auth/logout
   */
  async revokeToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (refreshToken) {
        await AuthTokenService.revokeRefreshToken(refreshToken, userId);
      } else {
        // Revoke all tokens if no specific token provided
        await AuthTokenService.revokeAllRefreshTokens(userId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Revoke token error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to revoke token'
      });
    }
  }

  /**
   * Get active sessions count
   * GET /api/auth/sessions
   */
  async getActiveSessions(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const count = await AuthTokenService.getActiveTokensCount(userId);

      res.json({
        success: true,
        activeSessions: count
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get active sessions'
      });
    }
  }
}

module.exports = new AuthTokenController();
