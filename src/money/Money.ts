/**
 * Money handling utility
 * Stores amounts as integers (cents) to avoid floating point precision issues
 * Provides methods for calculations and formatting
 */

export class Money {
  private readonly cents: number;
  private readonly currency: string;

  constructor(cents: number, currency: string = 'USD') {
    this.cents = Math.round(cents);
    this.currency = currency;
  }

  /**
   * Create Money from dollar amount
   */
  static fromDollars(dollars: number, currency: string = 'USD'): Money {
    return new Money(Math.round(dollars * 100), currency);
  }

  /**
   * Create Money from cents
   */
  static fromCents(cents: number, currency: string = 'USD'): Money {
    return new Money(cents, currency);
  }

  /**
   * Get amount in dollars
   */
  toDollars(): number {
    return this.cents / 100;
  }

  /**
   * Get amount in cents
   */
  toCents(): number {
    return this.cents;
  }

  /**
   * Get currency
   */
  getCurrency(): string {
    return this.currency;
  }

  /**
   * Add money amounts
   */
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add different currencies: ${this.currency} and ${other.currency}`);
    }
    return new Money(this.cents + other.cents, this.currency);
  }

  /**
   * Subtract money amounts
   */
  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot subtract different currencies: ${this.currency} and ${other.currency}`);
    }
    return new Money(this.cents - other.cents, this.currency);
  }

  /**
   * Multiply by a scalar
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }

  /**
   * Divide by a scalar
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Money(Math.round(this.cents / divisor), this.currency);
  }

  /**
   * Calculate percentage
   */
  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  /**
   * Check if equal to another Money
   */
  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  /**
   * Check if greater than another Money
   */
  greaterThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare different currencies: ${this.currency} and ${other.currency}`);
    }
    return this.cents > other.cents;
  }

  /**
   * Check if less than another Money
   */
  lessThan(other: Money): boolean {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare different currencies: ${this.currency} and ${other.currency}`);
    }
    return this.cents < other.cents;
  }

  /**
   * Check if greater than or equal to another Money
   */
  greaterThanOrEqual(other: Money): boolean {
    return this.equals(other) || this.greaterThan(other);
  }

  /**
   * Check if less than or equal to another Money
   */
  lessThanOrEqual(other: Money): boolean {
    return this.equals(other) || this.lessThan(other);
  }

  /**
   * Check if zero
   */
  isZero(): boolean {
    return this.cents === 0;
  }

  /**
   * Check if positive
   */
  isPositive(): boolean {
    return this.cents > 0;
  }

  /**
   * Check if negative
   */
  isNegative(): boolean {
    return this.cents < 0;
  }

  /**
   * Get absolute value
   */
  abs(): Money {
    return new Money(Math.abs(this.cents), this.currency);
  }

  /**
   * Negate the amount
   */
  negate(): Money {
    return new Money(-this.cents, this.currency);
  }

  /**
   * Format as currency string
   */
  format(): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(this.toDollars());
  }

  /**
   * Format without currency symbol
   */
  formatPlain(): string {
    return this.toDollars().toFixed(2);
  }

  /**
   * Clone the Money object
   */
  clone(): Money {
    return new Money(this.cents, this.currency);
  }

  /**
   * Convert to JSON
   */
  toJSON(): { cents: number; currency: string } {
    return {
      cents: this.cents,
      currency: this.currency
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: { cents: number; currency: string }): Money {
    return new Money(json.cents, json.currency);
  }
}

/**
 * Helper function to calculate tax
 */
export function calculateTax(amount: Money, taxRate: number): Money {
  return amount.percentage(taxRate);
}

/**
 * Helper function to calculate total with tax
 */
export function calculateTotalWithTax(subtotal: Money, taxRate: number): { tax: Money; total: Money } {
  const tax = calculateTax(subtotal, taxRate);
  const total = subtotal.add(tax);
  return { tax, total };
}

/**
 * Helper function to calculate change
 */
export function calculateChange(tendered: Money, total: Money): Money {
  if (tendered.lessThan(total)) {
    throw new Error('Insufficient payment');
  }
  return tendered.subtract(total);
}

/**
 * Helper function to split amount
 */
export function splitAmount(total: Money, parts: number): Money[] {
  if (parts <= 0) {
    throw new Error('Parts must be greater than 0');
  }
  
  const baseAmount = total.divide(parts);
  const remainder = total.toCents() % parts;
  
  const splits: Money[] = [];
  for (let i = 0; i < parts; i++) {
    if (i < remainder) {
      // Add one cent to handle remainder
      splits.push(Money.fromCents(baseAmount.toCents() + 1, total.getCurrency()));
    } else {
      splits.push(baseAmount);
    }
  }
  
  return splits;
}

// Export a zero money constant
export const ZERO_USD = Money.fromCents(0, 'USD');
