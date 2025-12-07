/**
 * Price Value Object
 * Immutable value object for price with validation
 */
class Price {
  constructor(amount, currency = 'INR') {
    if (amount === undefined || amount === null) {
      throw new Error('Price amount is required');
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      throw new Error('Price must be a valid number');
    }
    if (numAmount < 0) {
      throw new Error('Price cannot be negative');
    }
    this.amount = numAmount;
    this.currency = currency;
    Object.freeze(this);
  }

  equals(other) {
    if (!(other instanceof Price)) return false;
    return this.amount === other.amount && this.currency === other.currency;
  }

  add(other) {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add prices with different currencies');
    }
    return new Price(this.amount + other.amount, this.currency);
  }

  subtract(other) {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract prices with different currencies');
    }
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return new Price(result, this.currency);
  }

  calculateDiscount(originalPrice) {
    if (this.amount >= originalPrice.amount) {
      return new Price(0, this.currency);
    }
    const discountAmount = originalPrice.amount - this.amount;
    return new Price(discountAmount, this.currency);
  }

  getDiscountPercentage(originalPrice) {
    if (originalPrice.amount === 0) return 0;
    return ((originalPrice.amount - this.amount) / originalPrice.amount) * 100;
  }

  toString() {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON() {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }
}

module.exports = Price;
