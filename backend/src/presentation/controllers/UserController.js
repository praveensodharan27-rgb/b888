const UserService = require('../../application/services/UserService');

/**
 * User Controller
 * Handles HTTP requests/responses for User operations
 */
class UserController {
  async getPublicProfile(req, res) {
    try {
      const { userId } = req.params;
      const profile = await UserService.getPublicProfile(userId);
      res.json({ success: true, user: profile });
    } catch (error) {
      console.error('Get public profile error:', error);
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user profile'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await UserService.getProfile(req.user.id);
      res.json({ success: true, user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const profileData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        bio: req.body.bio,
        showPhone: req.body.showPhone,
        locationId: req.body.locationId
      };

      // Remove undefined values
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      const user = await UserService.updateProfile(req.user.id, profileData);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.message.includes('already in use') || error.message === 'Invalid location') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  async updateAvatar(req, res) {
    try {
      const avatarUrl = req.file ? req.file.path : req.body.avatar;
      if (!avatarUrl) {
        return res.status(400).json({
          success: false,
          message: 'Avatar is required'
        });
      }

      const user = await UserService.updateAvatar(req.user.id, avatarUrl);
      res.json({
        success: true,
        message: 'Avatar updated successfully',
        user
      });
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update avatar'
      });
    }
  }

  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      await UserService.updatePassword(req.user.id, currentPassword, newPassword);
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Update password error:', error);
      if (error.message.includes('incorrect') || error.message.includes('not set')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update password'
      });
    }
  }

  async getUserAds(req, res) {
    try {
      const filters = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        status: req.query.status
      };

      const result = await UserService.getUserAds(req.user.id, filters);
      res.json({
        success: true,
        ads: result.ads,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get user ads error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch ads'
      });
    }
  }

  async getFreeAdsStatus(req, res) {
    try {
      const status = await UserService.getFreeAdsStatus(req.user.id);
      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      console.error('Get free ads status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch free ads status'
      });
    }
  }
}

module.exports = new UserController();
