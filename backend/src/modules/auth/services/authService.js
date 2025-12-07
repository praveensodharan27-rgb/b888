const userRepository = require('../repositories/userRepository');
const otpRepository = require('../repositories/otpRepository');
const emailService = require('../../../infrastructure/email/emailService');
const smsService = require('../../../infrastructure/sms/smsService');
const otpGenerator = require('../../../shared/utils/otpGenerator');
const env = require('../../../config/env');

/**
 * Auth Service
 * Contains business logic for authentication
 */
class AuthService {
  /**
   * Send OTP to user
   * @param {string} email - User email (optional)
   * @param {string} phone - User phone (optional)
   * @returns {Promise<Object>} - Result object
   */
  async sendOTP(email, phone) {
    try {
      // Validate input
      if (!email && !phone) {
        return {
          success: false,
          message: 'Email or phone is required',
        };
      }

      // Find or create user
      let user = await userRepository.findByEmailOrPhone(email, phone);

      if (!user) {
        // User doesn't exist, create a temporary user
        // In a real app, you might want to handle this differently
        return {
          success: false,
          message: 'User not found. Please register first.',
        };
      }

      // Generate OTP
      const code = otpGenerator.generate();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + env.OTP_EXPIRY_MINUTES);

      // Store OTP in database
      await otpRepository.create({
        email: email || null,
        phone: phone || null,
        code,
        expiresAt,
        userId: user.id,
      });

      // Send OTP via email or SMS
      let sent = false;
      if (email) {
        sent = await emailService.sendOTP(email, code);
      } else if (phone) {
        sent = await smsService.sendOTP(phone, code);
      }

      // In development mode, always return success even if sending failed
      if (env.NODE_ENV === 'development' || sent) {
        return {
          success: true,
          message: `OTP sent to ${email || phone}`,
        };
      }

      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    } catch (error) {
      console.error('AuthService.sendOTP error:', error);
      return {
        success: false,
        message: 'An error occurred while sending OTP',
      };
    }
  }

  /**
   * Verify OTP
   * @param {string} email - User email (optional)
   * @param {string} phone - User phone (optional)
   * @param {string} code - OTP code
   * @returns {Promise<Object>} - Result object with user if valid
   */
  async verifyOTP(email, phone, code) {
    try {
      // Validate input
      if (!email && !phone) {
        return {
          success: false,
          valid: false,
          message: 'Email or phone is required',
        };
      }

      if (!code || code.length !== env.OTP_LENGTH) {
        return {
          success: false,
          valid: false,
          message: 'Invalid OTP code',
        };
      }

      // Find valid OTP
      const otp = await otpRepository.findValidByEmailOrPhoneAndCode(email, phone, code);

      if (!otp) {
        return {
          success: false,
          valid: false,
          message: 'Invalid or expired OTP',
        };
      }

      // Mark OTP as used
      await otpRepository.markAsUsed(otp.id);

      // Update user as verified
      const user = await userRepository.update(otp.userId, {
        isVerified: true,
      });

      return {
        success: true,
        valid: true,
        message: 'OTP verified successfully',
        user,
      };
    } catch (error) {
      console.error('AuthService.verifyOTP error:', error);
      return {
        success: false,
        valid: false,
        message: 'An error occurred while verifying OTP',
      };
    }
  }
}

module.exports = new AuthService();

