const nodemailer = require('nodemailer');
const env = require('../../config/env');

/**
 * Email Service
 * Handles email sending using Nodemailer
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      console.warn('⚠️  SMTP not configured. Email service will log OTPs to console.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('❌ SMTP verification failed:', error.message);
      return false;
    }
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} code - OTP code
   * @returns {Promise<boolean>} - Success status
   */
  async sendOTP(email, code) {
    // Always log OTP in development
    if (env.NODE_ENV === 'development') {
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log(`║   EMAIL OTP REQUEST                               ║`);
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║   Email: ${email.padEnd(40)} ║`);
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
      // Verify connection before sending
      const isVerified = await this.verifyConnection();
      if (!isVerified) {
        if (env.NODE_ENV === 'development') {
          return true; // Allow in dev mode
        }
        return false;
      }

      const mailOptions = {
        from: `"SellIt" <${env.SMTP_FROM}>`,
        to: email,
        subject: 'Your OTP Code - SellIt',
        html: this.getOTPEmailTemplate(code),
        text: `Your SellIt OTP Code is: ${code}\n\nThis code will expire in ${env.OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this code, please ignore this email.`,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email OTP sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Email OTP error:', error.message);
      if (env.NODE_ENV === 'development') {
        console.log('   Continuing in development mode...');
        return true;
      }
      return false;
    }
  }

  /**
   * Get OTP email HTML template
   * @param {string} code - OTP code
   * @returns {string} - HTML template
   */
  getOTPEmailTemplate(code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SellIt Verification</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin-top: 0;">Your OTP Code</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6;">Please use the following code to verify your account:</p>
                    <div style="background-color: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                      <h1 style="color: #667eea; font-size: 48px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
                    </div>
                    <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                      <strong>This code will expire in ${env.OTP_EXPIRY_MINUTES} minutes.</strong><br>
                      If you didn't request this code, please ignore this email.
                    </p>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">This is an automated email, please do not reply.</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
module.exports = new EmailService();

