const env = require('../../config/env');

/**
 * OTP Generator Utility
 * Generates random OTP codes
 */
class OTPGenerator {
  /**
   * Generate a random OTP code
   * @param {number} length - Length of OTP (default from env)
   * @returns {string} - Generated OTP code
   */
  static generate(length = env.OTP_LENGTH) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Generate OTP with custom length
   * @param {number} length - Length of OTP
   * @returns {string} - Generated OTP code
   */
  static generateCustom(length) {
    if (length < 4 || length > 10) {
      throw new Error('OTP length must be between 4 and 10');
    }
    return this.generate(length);
  }
}

module.exports = OTPGenerator;

