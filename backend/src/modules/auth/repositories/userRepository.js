const prisma = require('../../../infrastructure/db/prismaClient');

/**
 * User Repository
 * Handles all database operations related to users
 */
class UserRepository {
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByEmail(email) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
          password: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('UserRepository.findByEmail error:', error);
      throw error;
    }
  }

  /**
   * Find user by phone
   * @param {string} phone - User phone
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByPhone(phone) {
    try {
      return await prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
          password: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('UserRepository.findByPhone error:', error);
      throw error;
    }
  }

  /**
   * Find user by email or phone
   * @param {string} email - User email (optional)
   * @param {string} phone - User phone (optional)
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByEmailOrPhone(email, phone) {
    try {
      return await prisma.user.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            phone ? { phone } : {},
          ].filter(condition => Object.keys(condition).length > 0),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
          password: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('UserRepository.findByEmailOrPhone error:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} - User object or null
   */
  async findById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('UserRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user object
   */
  async create(userData) {
    try {
      return await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('UserRepository.create error:', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user object
   */
  async update(id, userData) {
    try {
      return await prisma.user.update({
        where: { id },
        data: userData,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          isVerified: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error('UserRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by email or phone
   * @param {string} email - User email (optional)
   * @param {string} phone - User phone (optional)
   * @returns {Promise<boolean>} - True if user exists
   */
  async exists(email, phone) {
    try {
      const user = await this.findByEmailOrPhone(email, phone);
      return user !== null;
    } catch (error) {
      console.error('UserRepository.exists error:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();

