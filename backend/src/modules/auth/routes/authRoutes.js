const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * @route   POST /auth/send-otp
 * @desc    Send OTP to user's email or phone
 * @access  Public
 */
router.post(
  '/send-otp',
  [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
  ],
  validate,
  (req, res) => authController.sendOTP(req, res)
);

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post(
  '/verify-otp',
  [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number is required'),
    body('code')
      .notEmpty()
      .withMessage('OTP code is required')
      .isLength({ min: 4, max: 10 })
      .withMessage('OTP code must be between 4 and 10 characters'),
  ],
  validate,
  (req, res) => authController.verifyOTP(req, res)
);

module.exports = router;

