/**
 * Auth Domain Service
 * Domain layer - contains business rules for authentication
 * This is pure business logic, no technical details
 */
class AuthDomainService {
  /**
   * Validate user ID format (business rule)
   * @param {string} userId - User ID to validate
   * @returns {boolean} True if valid
   */
  isValidUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      return false;
    }
    // Business rule: User ID should not be empty and should have minimum length
    return userId.trim().length > 0 && userId.length <= 100;
  }

  /**
   * Check if user can authenticate (business rule)
   * @param {Object} user - User object
   * @returns {boolean} True if user can authenticate
   */
  canAuthenticate(user) {
    if (!user) return false;
    
    // Business rule: Deactivated users cannot authenticate
    if (user.isDeactivated) return false;
    
    // Business rule: User must have at least email or phone
    if (!user.email && !user.phone) return false;
    
    return true;
  }

  /**
   * Determine token expiration based on user role (business rule)
   * @param {string} role - User role
   * @returns {string} Token expiration time
   */
  getTokenExpirationForRole(role) {
    // Business rule: Admins get longer token expiration
    if (role === 'ADMIN') {
      return process.env.JWT_EXPIRES_IN_ADMIN || '30d';
    }
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Validate authentication attempt (business rule)
   * @param {Object} attempt - Authentication attempt data
   * @returns {Object} Validation result
   */
  validateAuthAttempt(attempt) {
    const errors = [];

    if (!attempt.email && !attempt.phone) {
      errors.push('Email or phone is required');
    }

    if (attempt.email && !this.isValidEmail(attempt.email)) {
      errors.push('Invalid email format');
    }

    if (attempt.phone && !this.isValidPhone(attempt.phone)) {
      errors.push('Invalid phone format');
    }

    if (!attempt.password && !attempt.otp) {
      errors.push('Password or OTP is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email format (business rule)
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate phone format (business rule)
   * @param {string} phone - Phone to validate
   * @returns {boolean} True if valid
   */
  isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Business rule: Phone should be at least 10 characters
    return phone.trim().length >= 10;
  }
}

module.exports = new AuthDomainService();
