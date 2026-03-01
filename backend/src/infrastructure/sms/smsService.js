const twilio = require('twilio');
const env = require('../../config/env');

/**
 * SMS Service
 * Handles SMS sending using Twilio
 */
class SMSService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize Twilio client
   */
  initialize() {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER) {
      console.warn('⚠️  Twilio not configured. SMS service will log OTPs to console.');
      return;
    }

    try {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      this.isConfigured = true;
      console.log('✅ SMS service initialized');
    } catch (error) {
      console.error('❌ SMS service initialization failed:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send OTP SMS
   * @param {string} phone - Recipient phone number
   * @param {string} code - OTP code
   * @returns {Promise<boolean>} - Success status
   */
  async sendOTP(phone, code) {
    // Always log OTP in development
    if (env.NODE_ENV === 'development') {
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log(`║   SMS OTP REQUEST                                  ║`);
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║   Phone: ${phone.padEnd(40)} ║`);
      console.log(`║   OTP Code: ${code.padEnd(37)} ║`);
      console.log(`║   Expires in: ${env.OTP_EXPIRY_MINUTES} minutes${' '.padEnd(24 - String(env.OTP_EXPIRY_MINUTES).length)} ║`);
      console.log('╚════════════════════════════════════════════════════╝\n');
    }

    // If not configured, return true in development mode
    if (!this.isConfigured) {
      if (env.NODE_ENV === 'development') {
        console.log('   ✅ Continuing in development mode (OTP logged above)');
        return true;
      }
      return false;
    }

    try {
      await this.client.messages.create({
        body: `Your SellIt OTP code is: ${code}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes.`,
        from: env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      console.log(`✅ SMS OTP sent to ${phone}`);
      return true;
    } catch (error) {
      console.error('❌ SMS OTP error:', error.message);
      if (env.NODE_ENV === 'development') {
        console.log('   Continuing in development mode...');
        return true;
      }
      return false;
    }
  }

  /**
   * Send general SMS message
   * @param {string} phone - Recipient phone number
   * @param {string} message - Message content
   * @returns {Promise<boolean>} - Success status
   */
  async sendMessage(phone, message) {
    // Always log message in development
    if (env.NODE_ENV === 'development') {
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log(`║   SMS MESSAGE REQUEST                              ║`);
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║   Phone: ${phone.padEnd(40)} ║`);
      console.log(`║   Message: ${message.substring(0, 40).padEnd(37)} ║`);
      console.log('╚════════════════════════════════════════════════════╝\n');
    }

    // If not configured, return true in development mode
    if (!this.isConfigured) {
      if (env.NODE_ENV === 'development') {
        console.log('   ✅ Continuing in development mode (SMS logged above)');
        return true;
      }
      return false;
    }

    try {
      await this.client.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      console.log(`✅ SMS sent to ${phone}`);
      return true;
    } catch (error) {
      console.error('❌ SMS error:', error.message);
      if (env.NODE_ENV === 'development') {
        console.log('   Continuing in development mode...');
        return true;
      }
      return false;
    }
  }
}

// Export singleton instance
module.exports = new SMSService();

