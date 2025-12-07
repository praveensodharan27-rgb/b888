/**
 * Refresh Token Domain Entity
 * Contains business rules for refresh tokens
 */
class RefreshToken {
  constructor(data) {
    this.validate(data);
    this.id = data.id;
    this.userId = data.userId;
    this.token = data.token;
    this.expiresAt = data.expiresAt;
    this.createdAt = data.createdAt || new Date();
    this.revokedAt = data.revokedAt || null;
    this.revoked = data.revoked || false;
  }

  validate(data) {
    if (!data.userId) {
      throw new Error('User ID is required for refresh token');
    }
    if (!data.token) {
      throw new Error('Token is required');
    }
    if (!data.expiresAt) {
      throw new Error('Expiration date is required');
    }
    if (new Date(data.expiresAt) <= new Date()) {
      throw new Error('Expiration date must be in the future');
    }
  }

  isExpired() {
    return new Date(this.expiresAt) < new Date();
  }

  isRevoked() {
    return this.revoked || this.revokedAt !== null;
  }

  isValid() {
    return !this.isExpired() && !this.isRevoked();
  }

  revoke() {
    this.revoked = true;
    this.revokedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      revokedAt: this.revokedAt,
      revoked: this.revoked
    };
  }
}

module.exports = RefreshToken;
