const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ad Repository
 * Data access layer for Ad entity
 */
class AdRepository {
  async findById(id, include = {}) {
    // Build include object based on what's requested
    const includeOptions = {
      user: include.user !== false ? {
        select: {
          id: true,
          name: true,
          avatar: true,
          isVerified: true,
          showPhone: true,
          email: include.user === true ? true : false, // Only include email if explicitly requested
          phone: include.user === true ? true : false,
          createdAt: include.user === true ? true : false,
          updatedAt: include.user === true ? true : false,
        }
      } : false,
      category: include.category !== false ? {
        select: {
          id: true,
          name: true,
          slug: true
        }
      } : false,
      subcategory: include.subcategory !== false ? {
        select: {
          id: true,
          name: true,
          slug: true
        }
      } : false,
      location: include.location !== false ? {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true
        }
      } : false,
    };

    // Remove false values from include
    Object.keys(includeOptions).forEach(key => {
      if (includeOptions[key] === false) {
        delete includeOptions[key];
      }
    });

    return await prisma.ad.findUnique({
      where: { id },
      include: includeOptions
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
              slug: true,
              city: true,
              state: true
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

  /**
   * Fetch up to `take` ads for ranking (no skip). Used by ranking flow.
   */
  async findManyRaw(where, take = 300, options = {}) {
    const ads = await prisma.ad.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: options.include || {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, slug: true, city: true, state: true } }
      }
    });
    return { ads };
  }

  async create(data) {
    // Prisma expects images as String[] (URLs only); upload middleware returns { url, altText }[]
    const imageUrls = (data.images || []).map((img) =>
      typeof img === 'string' ? img : (img?.url || img)
    ).filter(Boolean);

    return await prisma.ad.create({
      data: {
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        originalPrice: data.originalPrice != null && data.originalPrice !== '' ? parseFloat(data.originalPrice) : null,
        discount: data.discount != null && data.discount !== '' ? parseFloat(data.discount) : null,
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
        images: imageUrls,
        attributes: data.attributes && typeof data.attributes === 'object' ? data.attributes : (data.attributes || {}),
        premiumType: data.premiumType || null,
        isUrgent: data.isUrgent || false,
        expiresAt: data.expiresAt,
        premiumExpiresAt: data.premiumExpiresAt || null,
        packageType: data.packageType || 'NORMAL'
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
    // Prisma expects images as String[] (URLs only); convert if objects
    const imageUrls = data.images
      ? (data.images || []).map((img) =>
          typeof img === 'string' ? img : (img?.url || img)
        ).filter(Boolean)
      : undefined;

    return await prisma.ad.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.price !== undefined && { price: parseFloat(data.price) }),
        ...(data.originalPrice !== undefined && { originalPrice: data.originalPrice != null && data.originalPrice !== '' ? parseFloat(data.originalPrice) : null }),
        ...(data.discount !== undefined && { discount: data.discount != null && data.discount !== '' ? parseFloat(data.discount) : null }),
        ...(data.condition && { condition: data.condition }),
        ...(data.status && { status: data.status }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.subcategoryId !== undefined && { subcategoryId: data.subcategoryId || null }),
        ...(data.locationId !== undefined && { locationId: data.locationId || null }),
        ...(data.state !== undefined && { state: data.state || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.neighbourhood !== undefined && { neighbourhood: data.neighbourhood || null }),
        ...(data.exactLocation !== undefined && { exactLocation: data.exactLocation || null }),
        ...(imageUrls !== undefined && { images: imageUrls }),
        ...(data.attributes !== undefined && { attributes: typeof data.attributes === 'object' ? data.attributes : {} }),
        ...(data.premiumType !== undefined && { premiumType: data.premiumType }),
        ...(data.isUrgent !== undefined && { isUrgent: data.isUrgent }),
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
        ...(data.premiumExpiresAt !== undefined && { premiumExpiresAt: data.premiumExpiresAt }),
        ...(data.slug !== undefined && { slug: data.slug || null }),
        ...(data.stateSlug !== undefined && { stateSlug: data.stateSlug || null }),
        ...(data.citySlug !== undefined && { citySlug: data.citySlug || null }),
        ...(data.categorySlug !== undefined && { categorySlug: data.categorySlug || null }),
        ...(data.moderationFlags !== undefined && { moderationFlags: data.moderationFlags }),
        ...(data.moderationStatus !== undefined && { moderationStatus: data.moderationStatus }),
        ...(data.rejectionReason !== undefined && { rejectionReason: data.rejectionReason }),
        ...(data.autoRejected !== undefined && { autoRejected: !!data.autoRejected }),
        ...(data.postedAt !== undefined && { postedAt: data.postedAt }),
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
