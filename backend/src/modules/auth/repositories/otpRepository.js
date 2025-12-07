const prisma = require('../../../infrastructure/db/prismaClient');

/**
 * OTP Repository
 * Handles all database operations related to OTPs
 */
class OTPRepository {
  /**
   * Create OTP record
   * @param {Object} otpData - OTP data
   * @returns {Promise<Object>} - Created OTP object
   */
  async create(otpData) {
    try {
      return await prisma.oTP.create({
        data: otpData,
      });
    } catch (error) {
      console.error('OTPRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Find valid OTP by email and code
   * @param {string} email - User email
   * @param {string} code - OTP code
   * @returns {Promise<Object|null>} - OTP object or null
   */
  async findValidByEmailAndCode(email, code) {
    try {
      return await prisma.oTP.findFirst({
        where: {
          email,
          code,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });
    } catch (error) {
      console.error('OTPRepository.findValidByEmailAndCode error:', error);
      throw error;
    }
  }

  /**
   * Find valid OTP by phone and code
   * @param {string} phone - User phone
   * @param {string} code - OTP code
   * @returns {Promise<Object|null>} - OTP object or null
   */
  async findValidByPhoneAndCode(phone, code) {
    try {
      return await prisma.oTP.findFirst({
        where: {
          phone,
          code,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });
    } catch (error) {
      console.error('OTPRepository.findValidByPhoneAndCode error:', error);
      throw error;
    }
  }

  /**
   * Find valid OTP by email/phone and code
   * @param {string} email - User email (optional)
   * @param {string} phone - User phone (optional)
   * @param {string} code - OTP code
   * @returns {Promise<Object|null>} - OTP object or null
   */
  async findValidByEmailOrPhoneAndCode(email, phone, code) {
    try {
      return await prisma.oTP.findFirst({
        where: {
          OR: [
            email ? { email, code } : {},
            phone ? { phone, code } : {},
          ].filter(condition => Object.keys(condition).length > 0),
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });
    } catch (error) {
      console.error('OTPRepository.findValidByEmailOrPhoneAndCode error:', error);
      throw error;
    }
  }

  /**
   * Mark OTP as used
   * @param {string} id - OTP ID
   * @returns {Promise<Object>} - Updated OTP object
   */
  async markAsUsed(id) {
    try {
      return await prisma.oTP.update({
        where: { id },
        data: { used: true },
      });
    } catch (error) {
      console.error('OTPRepository.markAsUsed error:', error);
      throw error;
    }
  }

  /**
   * Delete expired OTPs
   * @returns {Promise<number>} - Number of deleted OTPs
   */
  async deleteExpired() {
    try {
      const result = await prisma.oTP.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return result.count;
    } catch (error) {
      console.error('OTPRepository.deleteExpired error:', error);
      throw error;
    }
  }
}

module.exports = new OTPRepository();

