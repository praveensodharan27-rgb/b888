/**
 * Ad Configuration
 * Business constants and configuration for Ad domain
 */
class AdConfig {
  static FREE_ADS_LIMIT = parseInt(process.env.FREE_ADS_LIMIT || '2');
  static AD_POSTING_PRICE = parseFloat(process.env.AD_POSTING_PRICE || '49');
  static MAX_IMAGES = 4;
  static MIN_IMAGES = 1;
  static AD_EXPIRY_DAYS = 7;
  static MAX_TITLE_LENGTH = 200;
  static MAX_DESCRIPTION_LENGTH = 5000;
  
  static PREMIUM_DURATIONS = {
    TOP: parseInt(process.env.PREMIUM_DURATION_TOP || '7'),
    FEATURED: parseInt(process.env.PREMIUM_DURATION_FEATURED || '14'),
    BUMP_UP: parseInt(process.env.PREMIUM_DURATION_BUMP_UP || '1'),
    URGENT: parseInt(process.env.PREMIUM_DURATION_URGENT || '7')
  };

  static VALID_CONDITIONS = ['NEW', 'USED', 'LIKE_NEW', 'REFURBISHED'];
  static VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];
  static VALID_PREMIUM_TYPES = ['TOP', 'FEATURED', 'BUMP_UP'];

  static canPostFreeAd(freeAdsUsed) {
    return freeAdsUsed < this.FREE_ADS_LIMIT;
  }

  static calculateExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + this.AD_EXPIRY_DAYS);
    return date;
  }

  static calculatePremiumExpiry(premiumType, isUrgent = false) {
    const date = new Date();
    if (isUrgent) {
      date.setDate(date.getDate() + this.PREMIUM_DURATIONS.URGENT);
      return date;
    }
    if (premiumType && this.PREMIUM_DURATIONS[premiumType]) {
      date.setDate(date.getDate() + this.PREMIUM_DURATIONS[premiumType]);
      return date;
    }
    return null;
  }
}

module.exports = AdConfig;
