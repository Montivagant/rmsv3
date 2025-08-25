import { describe, it, expect } from 'vitest';
import { Money, calculateChange, calculateTax } from './Money';

describe('Money Class - Critical Path Tests', () => {
  it('should correctly add two amounts', () => {
    const amount1 = new Money(1000); // $10.00
    const amount2 = new Money(500);   // $5.00
    const result = amount1.add(amount2);
    expect(result.toDollars()).toBe(15.00); // $15.00
  });

  it('should correctly subtract two amounts', () => {
    const amount1 = new Money(1500); // $15.00
    const amount2 = new Money(500);   // $5.00
    const result = amount1.subtract(amount2);
    expect(result.toDollars()).toBe(10.00); // $10.00
  });

  it('should correctly multiply an amount', () => {
    const amount = new Money(1000); // $10.00
    const result = amount.multiply(2);
    expect(result.toDollars()).toBe(20.00); // $20.00
  });

  it('should correctly divide an amount', () => {
    const amount = new Money(1000); // $10.00
    const result = amount.divide(2);
    expect(result.toDollars()).toBe(5.00); // $5.00
  });

  it('should handle comparison correctly', () => {
    const amount1 = new Money(1000); // $10.00
    const amount2 = new Money(500);   // $5.00
    expect(amount1.greaterThan(amount2)).toBe(true);
    expect(amount1.lessThan(amount2)).toBe(false);
    expect(amount1.equals(new Money(1000))).toBe(true);
  });

  it('should format correctly', () => {
    const amount = new Money(1234); // $12.34
    expect(amount.format()).toBe('$12.34');
  });

  it('should calculate change correctly', () => {
    const total = new Money(1550); // $15.50
    const tendered = new Money(2000); // $20.00
    const change = calculateChange(tendered, total);
    expect(change.toDollars()).toBe(4.50); // $4.50
  });

  it('should calculate tax correctly', () => {
    const amount = new Money(1000); // $10.00
    const taxRate = 10; // 10% (as percentage, not decimal)
    const tax = calculateTax(amount, taxRate);
    expect(tax.toDollars()).toBe(1.00); // $1.00
  });

  it('should handle zero amounts', () => {
    const zero = new Money(0);
    expect(zero.toDollars()).toBe(0);
    expect(zero.format()).toBe('$0.00');
    expect(zero.isZero()).toBe(true);
  });

  it('should handle negative amounts', () => {
    const negative = new Money(-500); // -$5.00
    expect(negative.toDollars()).toBe(-5.00);
    expect(negative.isNegative()).toBe(true);
    expect(negative.format()).toBe('-$5.00');
  });
});
