const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * User Repository
 * Data access layer for User entity
 */
class UserRepository {
  async findById(id, include = {}) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        location: include.location || false,
        ...include
      }
    });
  }

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  async findByPhone(phone) {
    return await prisma.user.findUnique({
      where: { phone }
    });
  }

  async findByEmailOrPhone(email, phone) {
    if (email) {
      return await this.findByEmail(email);
    }
    if (phone) {
      return await this.findByPhone(phone);
    }
    return null;
  }

  async create(data) {
    return await prisma.user.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        password: data.password || null,
        avatar: data.avatar || null,
        bio: data.bio || null,
        showPhone: data.showPhone !== undefined ? data.showPhone : true,
        isVerified: data.isVerified || false,
        role: data.role || 'USER',
        locationId: data.locationId || null,
        provider: data.provider || null,
        providerId: data.providerId || null
      },
      include: {
        location: true
      }
    });
  }

  async update(id, data) {
    return await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.showPhone !== undefined && { showPhone: data.showPhone }),
        ...(data.locationId !== undefined && { locationId: data.locationId || null }),
        updatedAt: new Date()
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true
          }
        }
      }
    });
  }

  async updatePassword(id, hashedPassword) {
    return await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
  }

  async incrementFreeAdsUsed(id) {
    return await prisma.user.update({
      where: { id },
      data: {
        freeAdsUsed: { increment: 1 }
      }
    });
  }

  async getPublicProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        showPhone: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            ads: true
          }
        }
      }
    });

    if (!user) return null;

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } })
    ]);

    return {
      ...user,
      followersCount,
      followingCount
    };
  }

  async getUserAds(userId, filters = {}) {
    const { page = 1, limit = 20, status } = filters;
    const skip = (page - 1) * limit;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          subcategory: true,
          location: true,
          _count: {
            select: {
              favorites: true
            }
          }
        }
      }),
      prisma.ad.count({ where })
    ]);

    return {
      ads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new UserRepository();
