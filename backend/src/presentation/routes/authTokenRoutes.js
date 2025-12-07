const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../../../middleware/auth');
const AuthTokenController = require('../controllers/AuthTokenController');

const router = express.Router();

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
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
  AuthTokenController.refreshToken.bind(AuthTokenController)
);

/**
 * POST /api/auth/logout
 * Revoke refresh token (logout)
 */
router.post('/logout',
  authenticate,
  AuthTokenController.revokeToken.bind(AuthTokenController)
);

/**
 * GET /api/auth/sessions
 * Get active sessions count
 */
router.get('/sessions',
  authenticate,
  AuthTokenController.getActiveSessions.bind(AuthTokenController)
);

module.exports = router;
