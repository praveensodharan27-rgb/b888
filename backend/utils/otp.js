/**
 * OTP utils - delegates to enterprise otpService
 * Backward-compatible API for routes/auth.js and other consumers
 */

const otpService = require('../services/otpService');

module.exports = {
  generateOTP: otpService.generateOTP,
  sendOTP: otpService.sendOTP,
  verifyOTP: otpService.verifyOTP,
  sendOTPEmail: async (email, code) => {
    return otpService.sendOTPEmail(email, code);
  },
  sendOTPSMS: async (phone, code) => {
    return otpService.sendOTPSMS(phone, code);
  }
};
