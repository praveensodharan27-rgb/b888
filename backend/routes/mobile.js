const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   POST /api/mobile/device/register
 * @desc    Register a mobile device for push notifications
 * @access  Private
 */
router.post('/device/register',
  authenticate,
  [
    body('deviceId').notEmpty().withMessage('Device ID is required'),
    body('deviceType').isIn(['ios', 'android']).withMessage('Device type must be ios or android'),
    body('deviceName').optional().trim(),
    body('osVersion').optional().trim(),
    body('appVersion').optional().trim(),
    body('fcmToken').optional().trim(),
    body('apnsToken').optional().trim()
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

      const { deviceId, deviceType, deviceName, osVersion, appVersion, fcmToken, apnsToken } = req.body;
      const userId = req.user.id;

      // Check if device already exists
      const existingDevice = await prisma.mobileDevice.findUnique({
        where: { deviceId }
      });

      let device;
      if (existingDevice) {
        // Update existing device
        device = await prisma.mobileDevice.update({
          where: { deviceId },
          data: {
            userId,
            deviceType,
            deviceName: deviceName || existingDevice.deviceName,
            osVersion: osVersion || existingDevice.osVersion,
            appVersion: appVersion || existingDevice.appVersion,
            fcmToken: fcmToken || existingDevice.fcmToken,
            apnsToken: apnsToken || existingDevice.apnsToken,
            lastActiveAt: new Date(),
            isActive: true
          }
        });
      } else {
        // Create new device
        device = await prisma.mobileDevice.create({
          data: {
            deviceId,
            userId,
            deviceType,
            deviceName,
            osVersion,
            appVersion,
            fcmToken,
            apnsToken,
            lastActiveAt: new Date(),
            isActive: true
          }
        });
      }

      res.json({
        success: true,
        message: 'Device registered successfully',
        device
      });
    } catch (error) {
      console.error('Device registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register device',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/mobile/device/list
 * @desc    Get all devices for current user
 * @access  Private
 */
router.get('/device/list', authenticate, async (req, res) => {
  try {
    const devices = await prisma.mobileDevice.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      orderBy: { lastActiveAt: 'desc' }
    });

    res.json({
      success: true,
      devices
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices'
    });
  }
});

/**
 * @route   DELETE /api/mobile/device/:deviceId
 * @desc    Unregister a device
 * @access  Private
 */
router.delete('/device/:deviceId', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await prisma.mobileDevice.findUnique({
      where: { deviceId }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    if (device.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await prisma.mobileDevice.update({
      where: { deviceId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Device unregistered successfully'
    });
  } catch (error) {
    console.error('Unregister device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister device'
    });
  }
});

/**
 * @route   PUT /api/mobile/device/:deviceId/update-location
 * @desc    Update device location
 * @access  Private
 */
router.put('/device/:deviceId/update-location',
  authenticate,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
    body('accuracy').optional().isFloat({ min: 0 }),
    body('address').optional().trim()
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

      const { deviceId } = req.params;
      const { latitude, longitude, accuracy, address } = req.body;

      const device = await prisma.mobileDevice.findUnique({
        where: { deviceId }
      });

      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      const updatedDevice = await prisma.mobileDevice.update({
        where: { deviceId },
        data: {
          latitude,
          longitude,
          locationAccuracy: accuracy,
          locationAddress: address,
          lastLocationUpdate: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Location updated successfully',
        device: updatedDevice
      });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location'
      });
    }
  }
);

/**
 * @route   GET /api/mobile/app-info
 * @desc    Get mobile app information and configuration
 * @access  Public
 */
router.get('/app-info', async (req, res) => {
  try {
    res.json({
      success: true,
      appInfo: {
        appName: process.env.APP_NAME || 'SellIt',
        appVersion: process.env.APP_VERSION || '1.0.0',
        minSupportedVersion: process.env.MIN_SUPPORTED_VERSION || '1.0.0',
        apiVersion: '1.0',
        features: {
          pushNotifications: !!process.env.VAPID_PUBLIC_KEY,
          locationTracking: true,
          paymentGateway: !!process.env.RAZORPAY_KEY_ID,
          chat: true,
          offers: true
        },
        config: {
          maxImageSize: 5242880, // 5MB
          allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxImagesPerAd: 10
        }
      }
    });
  } catch (error) {
    console.error('Get app info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app info'
    });
  }
});

module.exports = router;

