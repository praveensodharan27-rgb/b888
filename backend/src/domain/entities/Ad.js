/**
 * Ad Domain Entity
 * Contains business rules and validation for Ad
 */
class Ad {
  constructor(data) {
    this.validate(data);
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.price = parseFloat(data.price);
    this.originalPrice = data.originalPrice ? parseFloat(data.originalPrice) : null;
    this.condition = data.condition || 'USED';
    this.status = data.status || 'PENDING';
    this.userId = data.userId;
    this.categoryId = data.categoryId;
    this.subcategoryId = data.subcategoryId || null;
    this.locationId = data.locationId || null;
    this.images = data.images || [];
    this.attributes = data.attributes || {};
    this.premiumType = data.premiumType || null;
    this.isUrgent = data.isUrgent || false;
    this.expiresAt = data.expiresAt;
    this.premiumExpiresAt = data.premiumExpiresAt || null;
    this.packageType = data.packageType || 'NORMAL';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  validate(data) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (data.title.length > 200) {
      throw new Error('Title must be less than 200 characters');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Description is required');
    }
    if (data.description.length > 5000) {
      throw new Error('Description must be less than 5000 characters');
    }
    if (data.price === undefined || data.price === null) {
      throw new Error('Price is required');
    }
    if (parseFloat(data.price) < 0) {
      throw new Error('Price must be greater than or equal to 0');
    }
    if (!data.userId) {
      throw new Error('User ID is required');
    }
    if (!data.categoryId) {
      throw new Error('Category ID is required');
    }
    if (!data.images || data.images.length === 0) {
      throw new Error('At least one image is required');
    }
    if (data.images.length > 4) {
      throw new Error('Maximum 4 images allowed');
    }
    const validConditions = ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'];
    if (data.condition && !validConditions.includes(data.condition)) {
      throw new Error(`Condition must be one of: ${validConditions.join(', ')}`);
    }
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  isExpired() {
    if (!this.expiresAt) return false;
    return new Date(this.expiresAt) < new Date();
  }

  isPremium() {
    return this.premiumType !== null || this.isUrgent;
  }

  isPremiumExpired() {
    if (!this.premiumExpiresAt) return false;
    return new Date(this.premiumExpiresAt) < new Date();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      price: this.price,
      originalPrice: this.originalPrice,
      condition: this.condition,
      status: this.status,
      userId: this.userId,
      categoryId: this.categoryId,
      subcategoryId: this.subcategoryId,
      locationId: this.locationId,
      images: this.images,
      attributes: this.attributes,
      premiumType: this.premiumType,
      isUrgent: this.isUrgent,
      expiresAt: this.expiresAt,
      premiumExpiresAt: this.premiumExpiresAt,
      packageType: this.packageType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Ad;
