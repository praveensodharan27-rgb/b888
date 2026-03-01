const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../utils/jwt');
const { sendOTP, verifyOTP } = require('../utils/otp');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Register with email/phone
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Valid email required');
      }
      return true;
    }),
    body('phone').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      // More lenient phone validation - just check it's not too short
      if (value.trim().length < 10) {
        throw new Error('Valid phone required');
      }
      return true;
    }),
    body('password').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      if (value.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        const message = firstError?.msg || 'Validation failed';
        console.warn('Register validation failed:', { body: req.body, errors: errors.array() });
        return res.status(400).json({ 
          success: false, 
          message,
          errors: errors.array() 
        });
      }

      const { name, email, phone, password, referralCode: providedReferralCode } = req.body;

      // Normalize empty strings to null
      const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : null;
      // Normalize phone: remove all non-digit characters (keep only digits)
      const normalizedPhone = phone && phone.trim() ? phone.trim().replace(/\D/g, '') : null;

      if (!normalizedEmail && !normalizedPhone) {
        return res.status(400).json({ success: false, message: 'Email or phone is required' });
      }

      // Check if user exists - avoid empty objects in OR (Prisma MongoDB issue)
      const orConditions = [];
      if (normalizedEmail) orConditions.push({ email: normalizedEmail });
      if (normalizedPhone) orConditions.push({ phone: normalizedPhone });
      const existingUser = orConditions.length > 0
        ? await prisma.user.findFirst({ where: { OR: orConditions } })
        : null;

      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email or phone already exists' 
        });
      }

      // Hash password if provided
      let hashedPassword = null;
      if (password && password.trim()) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Generate unique referral code
      const { generateReferralCode, processReferral } = require('../utils/referral');
      const referralCode = await generateReferralCode(name.trim());

      // Create user with referral code; all users get monthly free ads (freeAdsRemaining/freeAdsUsedThisMonth from schema default or explicit)
      const FREE_ADS_LIMIT = parseInt(process.env.FREE_ADS_LIMIT || '2', 10);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          referralCode,
          isVerified: false,
          freeAdsRemaining: FREE_ADS_LIMIT,
          freeAdsUsedThisMonth: 0
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isVerified: true,
          referralCode: true,
          createdAt: true
        }
      });

      // Create wallet for new user
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0
        }
      });

      // Process referral if code was provided
      let referralResult = null;
      if (providedReferralCode && providedReferralCode.trim()) {
        referralResult = await processReferral(providedReferralCode.trim(), user.id);
        if (referralResult.success) {
          console.log(`✅ Referral processed for new user: ${user.name}`);
        }
      }

      // Send OTP (optional in development if services not configured)
      const otpResult = await sendOTP(normalizedEmail, normalizedPhone, user.id);
      if (!otpResult.success) {
        // In development, allow registration without OTP if services aren't configured
        const isDevMode = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        const isOTPFailed = otpResult.message?.includes('Failed to send OTP') || 
                          otpResult.message?.includes('not configured');
        
        if (isDevMode && isOTPFailed) {
          console.warn('OTP services not configured. Skipping OTP in development mode.');
          // Auto-verify user in development
          await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true }
          });
          
          const token = generateToken(user.id);
          return res.status(201).json({
            success: true,
            message: 'User registered successfully (Development mode - OTP skipped)',
            token,
            user: { ...user, isVerified: true }
          });
        }
        // In production or if OTP failed for other reasons, still return success but require OTP
        // Don't fail registration if OTP sending fails - user can request OTP again
        console.warn('OTP sending failed but registration succeeded:', otpResult.message);
        const failedOtpResponseData = {
          success: true,
          message: 'User registered. OTP sending failed - please use resend OTP.',
          user: {
            ...user,
            referralCode: user.referralCode
          },
          otpFailed: true
        };

        // Include referral result if available
        if (referralResult && referralResult.success) {
          failedOtpResponseData.referral = {
            success: true,
            rewardAmount: referralResult.rewardAmount,
            referrerName: referralResult.referrerName
          };
        }

        return res.status(201).json(failedOtpResponseData);
      }

      const responseData = {
        success: true,
        message: 'User registered. Please verify OTP.',
        user: {
          ...user,
          referralCode: user.referralCode
        }
      };

      // Include referral result if available
      if (referralResult && referralResult.success) {
        responseData.referral = {
          success: true,
          rewardAmount: referralResult.rewardAmount,
          referrerName: referralResult.referrerName
        };
      }

      res.status(201).json(responseData);
    } catch (error) {
      console.error('Register error:', error);
      
      // Provide more specific error messages
      if (error.code === 'P2002') {
        // Prisma unique constraint violation
        return res.status(400).json({ 
          success: false, 
          message: 'Email or phone number already exists' 
        });
      }
      
      if (error.name === 'PrismaClientKnownRequestError') {
        return res.status(500).json({ 
          success: false, 
          message: 'Database error. Please try again.' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Registration failed. Please check your input and try again.' 
      });
    }
  }
);

// Send OTP
router.post('/send-otp',
  [
    body('email').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Valid email required');
      }
      return true;
    }),
    body('phone').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      // Remove non-digit characters for validation (same as normalization)
      const digitsOnly = value.trim().replace(/\D/g, '');
      // Check if we have at least 10 digits after removing non-digit characters
      if (digitsOnly.length < 10) {
        throw new Error('Phone number must contain at least 10 digits');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      console.log('Send OTP request received:', {
        body: req.body,
        hasEmail: !!req.body.email,
        hasPhone: !!req.body.phone,
        emailValue: req.body.email,
        phoneValue: req.body.phone
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Send OTP validation errors:', errors.array());
        console.error('Request body:', req.body);
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array(),
          received: {
            email: req.body.email,
            phone: req.body.phone
          }
        });
      }

      const { email, phone } = req.body;

      // Normalize empty strings, undefined, null to null
      const normalizedEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
      // Normalize phone: remove all non-digit characters (keep only digits) - consistent with registration
      const normalizedPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim().replace(/\D/g, '') : null;

      if (!normalizedEmail && !normalizedPhone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email or phone is required',
          errors: [{ msg: 'Either email or phone must be provided' }]
        });
      }

      // Additional validation after normalization
      if (normalizedPhone && normalizedPhone.length < 10) {
        return res.status(400).json({ 
          success: false, 
          message: 'Phone number must contain at least 10 digits',
          errors: [{ msg: 'Phone number must contain at least 10 digits', param: 'phone' }]
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            normalizedEmail ? { email: normalizedEmail } : {},
            normalizedPhone ? { phone: normalizedPhone } : {}
          ]
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const result = await sendOTP(normalizedEmail, normalizedPhone, user.id);
      res.json(result);
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  }
);

// Verify OTP
router.post('/verify-otp',
  [
    body('email').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Valid email required');
      }
      return true;
    }),
    body('phone').optional().custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      // More lenient phone validation - just check it's not too short
      if (value.trim().length < 10) {
        throw new Error('Valid phone required');
      }
      return true;
    }),
    body('code').notEmpty().withMessage('OTP code is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { email, phone, code } = req.body;

      // Normalize empty strings to null
      const normalizedEmail = email && email.trim() ? email.trim().toLowerCase() : null;
      // Normalize phone: remove all non-digit characters (keep only digits) - consistent with registration
      const normalizedPhone = phone && phone.trim() ? phone.trim().replace(/\D/g, '') : null;

      if (!normalizedEmail && !normalizedPhone) {
        return res.status(400).json({ success: false, message: 'Email or phone is required' });
      }

      const result = await verifyOTP(normalizedEmail, normalizedPhone, code);
      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.message });
      }

      // Update user as verified
      const user = await prisma.user.update({
        where: { id: result.otp.userId },
        data: { isVerified: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          isVerified: true
        }
      });

      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        token,
        user
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ success: false, message: 'OTP verification failed' });
    }
  }
);

// Login with email/phone and password
router.post('/login',
  [
    body('email').optional().custom((value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Valid email required');
      }
      return true;
    }),
    body('phone').optional().custom((value) => {
      if (!value || typeof value !== 'string') return true;
      // More lenient phone validation
      const trimmed = value.trim();
      if (trimmed.length < 10) {
        throw new Error('Valid phone required');
      }
      return true;
    }),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, phone, password } = req.body;
      
      // Log incoming request for debugging
      console.log('Login attempt:', { 
        email: email ? `${email.substring(0, 3)}***` : null, 
        phone: phone ? `${phone.substring(0, 3)}***` : null,
        hasPassword: !!password 
      });
      
      // Validate that at least email or phone is provided
      if (!email && !phone) {
        console.error('Login failed: No email or phone provided');
        return res.status(400).json({ 
          success: false, 
          message: 'Email or phone is required' 
        });
      }

      // Normalize email/phone (trim whitespace)
      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      // Normalize phone: remove all non-digit characters (keep only digits) - consistent with registration
      const normalizedPhone = phone ? phone.trim().replace(/\D/g, '') : null;
      
      console.log('Normalized:', { 
        email: normalizedEmail, 
        phone: normalizedPhone ? `${normalizedPhone.substring(0, 3)}***` : null 
      });

      // Build where clause for user lookup
      let whereClause;
      if (normalizedEmail && normalizedPhone) {
        // Both provided - search for either
        whereClause = {
          OR: [
            { email: normalizedEmail },
            { phone: normalizedPhone }
          ]
        };
      } else if (normalizedEmail) {
        whereClause = { email: normalizedEmail };
      } else if (normalizedPhone) {
        whereClause = { phone: normalizedPhone };
      } else {
        // This shouldn't happen due to earlier validation, but safety check
        console.error('Login failed: No valid email or phone after normalization');
        return res.status(400).json({ 
          success: false, 
          message: 'Email or phone is required' 
        });
      }

      console.log('Searching for user with whereClause:', JSON.stringify(whereClause, null, 2));

      const user = await prisma.user.findFirst({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          password: true,
          avatar: true,
          role: true,
          isVerified: true,
          referralCode: true,
          provider: true,
          providerId: true,
          isDeactivated: true,
          deactivatedAt: true
        }
      });

      if (!user) {
        console.error('Login failed: User not found', { email: normalizedEmail, phone: normalizedPhone ? 'provided' : null });
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      console.log('User found:', { id: user.id, email: user.email, hasPassword: !!user.password, isDeactivated: user.isDeactivated });

      // Check if user account is deactivated
      if (user.isDeactivated) {
        console.error('Login failed: Account is deactivated', { userId: user.id, deactivatedAt: user.deactivatedAt });
        return res.status(403).json({ 
          success: false, 
          message: 'Your account has been deactivated. Please contact support.' 
        });
      }

      if (!user.password) {
        return res.status(401).json({ 
          success: false, 
          message: 'Password not set. Please use OTP login or reset password.' 
        });
      }

      // Validate password
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        console.error('Login failed: Password is required');
        return res.status(400).json({ success: false, message: 'Password is required' });
      }

      let isPasswordValid = false;
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } catch (bcryptError) {
        console.error('Login failed: Password comparison error', bcryptError);
        return res.status(500).json({ 
          success: false, 
          message: 'Authentication error. Please try again.' 
        });
      }

      if (!isPasswordValid) {
        console.error('Login failed: Invalid password for user', user.email || user.phone);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      
      console.log('Login successful for user:', user.email || user.phone, 'Role:', user.role);

      const token = generateToken(user.id);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          isVerified: user.isVerified
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      const { getSafeErrorPayload } = require('../utils/safeErrorResponse');
      res.status(500).json(getSafeErrorPayload(error, 'Login failed'));
    }
  }
);

// Login with OTP (passwordless)
router.post('/login-otp',
  [
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone()
  ],
  async (req, res) => {
    try {
      const { email, phone } = req.body;

      if (!email && !phone) {
        return res.status(400).json({ success: false, message: 'Email or phone is required' });
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            phone ? { phone } : {}
          ]
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const result = await sendOTP(email, phone, user.id);
      res.json(result);
    } catch (error) {
      console.error('Login OTP error:', error);
      res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
  }
);

// Forgot Password - Request OTP
router.post('/forgot-password',
  [
    body('email').optional().custom((value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Valid email required');
      }
      return true;
    }),
    body('phone').optional().custom((value) => {
      if (!value) return true;
      if (value.trim().length < 10) {
        throw new Error('Valid phone required');
      }
      return true;
    })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, phone } = req.body;

      if (!email && !phone) {
        return res.status(400).json({ success: false, message: 'Email or phone is required' });
      }

      // Normalize email/phone
      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      const normalizedPhone = phone ? phone.trim().replace(/\D/g, '') : null;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            normalizedEmail ? { email: normalizedEmail } : {},
            normalizedPhone ? { phone: normalizedPhone } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ 
          success: true, 
          message: 'If an account exists, a reset code has been sent' 
        });
      }

      // Check if user has a password set
      if (!user.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password not set for this account. Please use OTP login.' 
        });
      }

      // Send OTP for password reset
      const result = await sendOTP(normalizedEmail, normalizedPhone, user.id);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Reset code sent successfully. Please check your email/phone.' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: result.message || 'Failed to send reset code' 
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Failed to process request' });
    }
  }
);

// Verify Reset OTP (don't mark as used yet - will be marked when password is reset)
router.post('/verify-reset-otp',
  [
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone(),
    body('code').notEmpty().withMessage('OTP code is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, phone, code } = req.body;

      // Verify OTP without marking as used (we'll mark it when password is reset)
      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      const normalizedPhone = phone ? phone.trim().replace(/\D/g, '') : null;

      const otp = await prisma.oTP.findFirst({
        where: {
          OR: [
            normalizedEmail ? { email: normalizedEmail, code } : {},
            normalizedPhone ? { phone: normalizedPhone, code } : {}
          ].filter(condition => Object.keys(condition).length > 0),
          used: false,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!otp) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      res.json({ 
        success: true, 
        message: 'OTP verified successfully. You can now reset your password.' 
      });
    } catch (error) {
      console.error('Verify reset OTP error:', error);
      res.status(500).json({ success: false, message: 'OTP verification failed' });
    }
  }
);

// Reset Password
router.post('/reset-password',
  [
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone(),
    body('code').notEmpty().withMessage('OTP code is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, phone, code, newPassword } = req.body;

      // Verify OTP first
      const otpResult = await verifyOTP(email, phone, code);
      if (!otpResult.valid) {
        return res.status(400).json({ success: false, message: otpResult.message });
      }

      // Find user
      const normalizedEmail = email ? email.trim().toLowerCase() : null;
      const normalizedPhone = phone ? phone.trim().replace(/\D/g, '') : null;

      const whereClause = {};
      if (normalizedEmail && normalizedPhone) {
        whereClause.OR = [
          { email: normalizedEmail },
          { phone: normalizedPhone }
        ];
      } else if (normalizedEmail) {
        whereClause.email = normalizedEmail;
      } else if (normalizedPhone) {
        whereClause.phone = normalizedPhone;
      }

      const user = await prisma.user.findFirst({
        where: whereClause
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      res.json({ 
        success: true, 
        message: 'Password reset successfully. You can now login with your new password.' 
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get /auth/me error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user info' });
  }
});

// Refresh token
router.post('/refresh-token', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const newToken = generateToken(userId);
    
    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
});

// Change password (alternative endpoint)
router.post('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { password: true }
      });

      if (!user.password) {
        return res.status(400).json({ success: false, message: 'Password not set' });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { password: hashedPassword }
      });

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }
);

module.exports = router;

