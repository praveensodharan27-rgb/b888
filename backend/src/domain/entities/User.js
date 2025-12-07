/**
 * User Domain Entity
 * Contains business rules and validation for User
 */
class User {
  constructor(data) {
    this.validate(data);
    this.id = data.id;
    this.name = data.name;
    this.email = data.email || null;
    this.phone = data.phone || null;
    this.password = data.password || null;
    this.avatar = data.avatar || null;
    this.bio = data.bio || null;
    this.showPhone = data.showPhone !== undefined ? data.showPhone : true;
    this.isVerified = data.isVerified || false;
    this.role = data.role || 'USER';
    this.freeAdsUsed = data.freeAdsUsed || 0;
    this.locationId = data.locationId || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  validate(data) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required');
    }
    if (data.name.length > 100) {
      throw new Error('Name must be less than 100 characters');
    }
    if (!data.email && !data.phone) {
      throw new Error('Either email or phone is required');
    }
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
    }
    if (data.phone && data.phone.length < 10) {
      throw new Error('Phone number must be at least 10 characters');
    }
    const validRoles = ['USER', 'ADMIN'];
    if (data.role && !validRoles.includes(data.role)) {
      throw new Error(`Role must be one of: ${validRoles.join(', ')}`);
    }
  }

  isAdmin() {
    return this.role === 'ADMIN';
  }

  isVerified() {
    return this.isVerified;
  }

  canPostFreeAd() {
    const FREE_ADS_LIMIT = parseInt(process.env.FREE_ADS_LIMIT || '2');
    return this.freeAdsUsed < FREE_ADS_LIMIT;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      avatar: this.avatar,
      bio: this.bio,
      showPhone: this.showPhone,
      isVerified: this.isVerified,
      role: this.role,
      freeAdsUsed: this.freeAdsUsed,
      locationId: this.locationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;
