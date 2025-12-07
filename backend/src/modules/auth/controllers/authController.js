const authService = require('../services/authService');

/**
 * Auth Controller
 * Handles HTTP requests and responses for authentication
 */
class AuthController {
  /**
   * Send OTP
   * POST /auth/send-otp
   */
  async sendOTP(req, res) {
    try {
      const { email, phone } = req.body;

      const result = await authService.sendOTP(email, phone);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: result.message,
      });
    } catch (error) {
      console.error('AuthController.sendOTP error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Verify OTP
   * POST /auth/verify-otp
   */
  async verifyOTP(req, res) {
    try {
      const { email, phone, code } = req.body;

      const result = await authService.verifyOTP(email, phone, code);

      if (result.success && result.valid) {
        return res.status(200).json({
          success: true,
          message: result.message,
          user: result.user,
        });
      }

      return res.status(400).json({
        success: false,
        message: result.message,
      });
    } catch (error) {
      console.error('AuthController.verifyOTP error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}

module.exports = new AuthController();

