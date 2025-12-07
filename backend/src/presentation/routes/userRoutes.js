const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../../../middleware/auth');
const { uploadAvatar } = require('../../../middleware/upload');
const UserController = require('../controllers/UserController');

const router = express.Router();

// Get public user profile
router.get('/public/:userId', UserController.getPublicProfile.bind(UserController));

// Get own profile
router.get('/profile', authenticate, UserController.getProfile.bind(UserController));

// Update profile
router.put('/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().isString().withMessage('Invalid phone format'),
    body('bio').optional().isString().withMessage('Bio must be a string'),
    body('showPhone').optional().isBoolean().withMessage('showPhone must be a boolean'),
    body('locationId').optional().isString().withMessage('locationId must be a string')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  },
  UserController.updateProfile.bind(UserController)
);

// Update avatar
router.put('/avatar',
  authenticate,
  uploadAvatar,
  UserController.updateAvatar.bind(UserController)
);

// Update password
router.put('/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  },
  UserController.updatePassword.bind(UserController)
);

// Get user's ads
router.get('/ads', authenticate, UserController.getUserAds.bind(UserController));

// Get free ads status
router.get('/free-ads-status', authenticate, UserController.getFreeAdsStatus.bind(UserController));

module.exports = router;
