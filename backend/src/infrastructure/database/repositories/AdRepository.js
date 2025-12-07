const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ad Repository
 * Data access layer for Ad entity
 */
class AdRepository {
  async findById(id, include = {}) {
    return await prisma.ad.findUnique({
      where: { id },
      include: {
        user: include.user || false,
        category: include.category || false,
        subcategory: include.subcategory || false,
        location: include.location || false,
        ...include
      }
    });
  }

  async findMany(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = 'newest',
      ...where
    } = filters;

    const skip = (page - 1) * limit;
    
    // Build orderBy
    let orderBy = {};
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'price_low':
        orderBy = { price: 'asc' };
        break;
      case 'price_high':
        orderBy = { price: 'desc' };
        break;
      case 'featured':
        orderBy = [
          { premiumType: 'desc' },
          { createdAt: 'desc' }
        ];
        break;
      case 'bumped':
        orderBy = [
          { premiumType: 'desc' },
          { updatedAt: 'desc' }
        ];
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: options.include || {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          subcategory: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          location: {
            select: {
              id: true,
              name: true,
              slug: true
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

  async create(data) {
    return await prisma.ad.create({
      data: {
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
        condition: data.condition || 'USED',
        status: data.status || 'PENDING',
        userId: data.userId,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId || null,
        locationId: data.locationId || null,
        state: data.state || null,
        city: data.city || null,
        neighbourhood: data.neighbourhood || null,
        exactLocation: data.exactLocation || null,
        images: data.images || [],
        attributes: data.attributes || {},
        premiumType: data.premiumType || null,
        isUrgent: data.isUrgent || false,
        expiresAt: data.expiresAt,
        premiumExpiresAt: data.premiumExpiresAt || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        },
        category: true,
        subcategory: true,
        location: true
      }
    });
  }

  async update(id, data) {
    return await prisma.ad.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.price !== undefined && { price: parseFloat(data.price) }),
        ...(data.originalPrice !== undefined && { originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null }),
        ...(data.condition && { condition: data.condition }),
        ...(data.status && { status: data.status }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.subcategoryId !== undefined && { subcategoryId: data.subcategoryId || null }),
        ...(data.locationId !== undefined && { locationId: data.locationId || null }),
        ...(data.images && { images: data.images }),
        ...(data.attributes && { attributes: data.attributes }),
        ...(data.premiumType !== undefined && { premiumType: data.premiumType }),
        ...(data.isUrgent !== undefined && { isUrgent: data.isUrgent }),
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
        ...(data.premiumExpiresAt !== undefined && { premiumExpiresAt: data.premiumExpiresAt }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        },
        category: true,
        subcategory: true,
        location: true
      }
    });
  }

  async delete(id) {
    return await prisma.ad.delete({
      where: { id }
    });
  }

  async count(where = {}) {
    return await prisma.ad.count({ where });
  }

  async findByUserId(userId, filters = {}) {
    return await this.findMany({
      ...filters,
      userId
    });
  }

  async checkLimit(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeAdsUsed: true }
    });
    return {
      freeAdsUsed: user?.freeAdsUsed || 0,
      limit: parseInt(process.env.FREE_ADS_LIMIT || '2'),
      canPost: (user?.freeAdsUsed || 0) < parseInt(process.env.FREE_ADS_LIMIT || '2')
    };
  }
}

module.exports = new AdRepository();
