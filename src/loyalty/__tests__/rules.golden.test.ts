import { describe, it, expect } from 'vitest';
import { earnPoints, pointsToValue, valueToPoints, DEFAULT_LOYALTY_CONFIG, type LoyaltyConfig } from '../rules';

describe('Loyalty Rules - Golden Tests', () => {
  const config = DEFAULT_LOYALTY_CONFIG;

  describe('earnPoints', () => {
    it('should calculate points correctly for exact thresholds', () => {
      // Test exact multiples of ACCRUAL_UNIT
      expect(earnPoints(10.00, config)).toBe(10); // floor(10/1) * 1 = 10
      expect(earnPoints(20.00, config)).toBe(20); // floor(20/1) * 1 = 20
      expect(earnPoints(100.00, config)).toBe(100); // floor(100/1) * 1 = 100
    });

    it('should floor points for amounts below threshold', () => {
      // Test amounts just below thresholds
      expect(earnPoints(9.99, config)).toBe(9); // floor(9.99/1) * 1 = 9
      expect(earnPoints(19.99, config)).toBe(19); // floor(19.99/1) * 1 = 19
      expect(earnPoints(29.50, config)).toBe(29); // floor(29.50/1) * 1 = 29
    });

    it('should handle zero and negative amounts', () => {
      expect(earnPoints(0, config)).toBe(0);
      expect(earnPoints(-5.00, config)).toBe(0);
    });

    it('should work with custom config', () => {
      const customConfig: LoyaltyConfig = {
        ACCRUAL_UNIT: 5,
        POINTS_PER_UNIT: 2,
        POINT_VALUE: 0.05
      };
      
      expect(earnPoints(10.00, customConfig)).toBe(4); // floor(10/5) * 2 = 4
      expect(earnPoints(7.50, customConfig)).toBe(2); // floor(7.5/5) * 2 = 2
      expect(earnPoints(4.99, customConfig)).toBe(0); // floor(4.99/5) * 2 = 0
    });
  });

  describe('pointsToValue', () => {
    it('should convert points to currency value correctly', () => {
      expect(pointsToValue(10, config)).toBe(1.00); // 10 * 0.10 = 1.00
      expect(pointsToValue(25, config)).toBe(2.50); // 25 * 0.10 = 2.50
      expect(pointsToValue(100, config)).toBe(10.00); // 100 * 0.10 = 10.00
    });

    it('should handle zero points', () => {
      expect(pointsToValue(0, config)).toBe(0);
    });

    it('should round to 2 decimal places (HALF-UP)', () => {
      const customConfig: LoyaltyConfig = {
        ACCRUAL_UNIT: 10,
        POINTS_PER_UNIT: 1,
        POINT_VALUE: 0.333 // Creates rounding scenarios
      };
      
      expect(pointsToValue(1, customConfig)).toBe(0.33); // 0.333 rounds to 0.33
      expect(pointsToValue(3, customConfig)).toBe(1.00); // 0.999 rounds to 1.00
    });
  });

  describe('valueToPoints', () => {
    it('should convert currency value to points correctly', () => {
      expect(valueToPoints(1.00, config)).toBe(10); // 1.00 / 0.10 = 10
      expect(valueToPoints(2.50, config)).toBe(25); // 2.50 / 0.10 = 25
      expect(valueToPoints(10.00, config)).toBe(100); // 10.00 / 0.10 = 100
    });

    it('should clamp to integer points (floor)', () => {
      expect(valueToPoints(0.95, config)).toBe(9); // 0.95 / 0.10 = 9.5, floor to 9
      expect(valueToPoints(1.99, config)).toBe(19); // 1.99 / 0.10 = 19.9, floor to 19
      expect(valueToPoints(0.05, config)).toBe(0); // 0.05 / 0.10 = 0.5, floor to 0
    });

    it('should handle zero value', () => {
      expect(valueToPoints(0, config)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(valueToPoints(-1.00, config)).toBe(0); // Negative should return 0
    });
  });

  describe('Integration scenarios', () => {
    it('should maintain consistency between earn and redeem cycles', () => {
      const spentAmount = 25.00;
      const earnedPoints = earnPoints(spentAmount, config);
      const redeemValue = pointsToValue(earnedPoints, config);
      const backToPoints = valueToPoints(redeemValue, config);
      
      expect(earnedPoints).toBe(25); // floor(25/1) * 1 = 25
      expect(redeemValue).toBe(2.50); // 25 * 0.10 = 2.50
      expect(backToPoints).toBe(25); // 2.50 / 0.10 = 25
    });

    it('should handle edge case amounts near thresholds', () => {
      // Test amounts that are common in real transactions
      const testAmounts = [9.99, 10.01, 19.95, 20.00, 49.99, 50.00];
      const expectedPoints = [9, 10, 19, 20, 49, 50]; // floor(x/1) * 1
      
      testAmounts.forEach((amount, index) => {
        expect(earnPoints(amount, config)).toBe(expectedPoints[index]);
      });
    });

    it('should handle large transaction amounts', () => {
      expect(earnPoints(999.99, config)).toBe(999); // floor(999.99/1) * 1 = 999
      expect(earnPoints(1000.00, config)).toBe(1000); // floor(1000/1) * 1 = 1000
    });
  });
});