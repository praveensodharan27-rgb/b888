/**
 * Token Configuration
 * Business constants for access and refresh tokens
 */
class TokenConfig {
  // Access token settings (short-lived)
  static ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // 15 minutes
  static ACCESS_TOKEN_EXPIRES_IN_ADMIN = process.env.ACCESS_TOKEN_EXPIRES_IN_ADMIN || '1h'; // 1 hour for admins

  // Refresh token settings (long-lived)
  static REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // 7 days
  static REFRESH_TOKEN_EXPIRES_IN_ADMIN = process.env.REFRESH_TOKEN_EXPIRES_IN_ADMIN || '30d'; // 30 days for admins

  // Token rotation settings
  static ROTATE_REFRESH_TOKEN = process.env.ROTATE_REFRESH_TOKEN !== 'false'; // Default: true
  static REUSE_REFRESH_TOKEN = process.env.REUSE_REFRESH_TOKEN === 'true'; // Default: false

  /**
   * Get access token expiration based on user role
   * @param {string} role - User role
   * @returns {string} Expiration time string
   */
  static getAccessTokenExpiration(role) {
    if (role === 'ADMIN') {
      return this.ACCESS_TOKEN_EXPIRES_IN_ADMIN;
    }
    return this.ACCESS_TOKEN_EXPIRES_IN;
  }

  /**
   * Get refresh token expiration based on user role
   * @param {string} role - User role
   * @returns {string} Expiration time string
   */
  static getRefreshTokenExpiration(role) {
    if (role === 'ADMIN') {
      return this.REFRESH_TOKEN_EXPIRES_IN_ADMIN;
    }
    return this.REFRESH_TOKEN_EXPIRES_IN;
  }

  /**
   * Calculate expiration date from expiration string
   * @param {string} expiresIn - Expiration string (e.g., '15m', '7d')
   * @returns {Date} Expiration date
   */
  static calculateExpirationDate(expiresIn) {
    const date = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiresIn}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': // seconds
        date.setSeconds(date.getSeconds() + value);
        break;
      case 'm': // minutes
        date.setMinutes(date.getMinutes() + value);
        break;
      case 'h': // hours
        date.setHours(date.getHours() + value);
        break;
      case 'd': // days
        date.setDate(date.getDate() + value);
        break;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }

    return date;
  }
}

module.exports = TokenConfig;
