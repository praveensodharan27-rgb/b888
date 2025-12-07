const User = require('../../domain/entities/User');
const UserRepository = require('../../infrastructure/database/repositories/UserRepository');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * User Service
 * Business logic for User operations
 */
class UserService {
  constructor(userRepository = UserRepository) {
    this.userRepository = userRepository;
  }

  async getPublicProfile(userId) {
    const profile = await this.userRepository.getPublicProfile(userId);
    if (!profile) {
      throw new Error('User not found');
    }
    return profile;
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId, {
      location: true
    });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async updateProfile(userId, profileData) {
    // Verify user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Verify email/phone uniqueness if being updated
    if (profileData.email && profileData.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(profileData.email);
      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    if (profileData.phone && profileData.phone !== existingUser.phone) {
      const phoneExists = await this.userRepository.findByPhone(profileData.phone);
      if (phoneExists) {
        throw new Error('Phone already in use');
      }
      // If phone changed, reset verification
      profileData.isVerified = false;
    }

    // Verify location if provided
    if (profileData.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: profileData.locationId }
      });
      if (!location) {
        throw new Error('Invalid location');
      }
    }

    // Update user
    const updatedUser = await this.userRepository.update(userId, profileData);
    return updatedUser;
  }

  async updateAvatar(userId, avatarUrl) {
    const user = await this.userRepository.update(userId, { avatar: avatarUrl });
    return user;
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password) {
      throw new Error('Password not set for this account');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.userRepository.updatePassword(userId, hashedPassword);
    return { success: true };
  }

  async getUserAds(userId, filters = {}) {
    return await this.userRepository.getUserAds(userId, filters);
  }

  async getFreeAdsStatus(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const FREE_ADS_LIMIT = parseInt(process.env.FREE_ADS_LIMIT || '2');
    return {
      freeAdsUsed: user.freeAdsUsed || 0,
      limit: FREE_ADS_LIMIT,
      remaining: Math.max(0, FREE_ADS_LIMIT - (user.freeAdsUsed || 0)),
      canPost: (user.freeAdsUsed || 0) < FREE_ADS_LIMIT
    };
  }
}

module.exports = new UserService();
