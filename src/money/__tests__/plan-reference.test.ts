import { describe, it, expect } from 'vitest'
import { computeTotals } from '../totals'
import { round2 } from '../round'

/**
 * Reference implementation from plan.md for comparison
 */
function computeTotalsReference(items: {price:number;qty:number;taxRate:number}[], discount = 0) {
  const subtotal = round2(items.reduce((s,i) => s + i.price * i.qty, 0))
  const cap = Math.min(discount, subtotal)
  return items.reduce((acc,i) => {
    const lineSub = round2(i.price * i.qty)
    const share = subtotal ? lineSub/subtotal : 0
    const lineDiscount = round2(cap * share)
    const taxable = Math.max(0, lineSub - lineDiscount)
    const tax = round2(taxable * i.taxRate)
    return {
      subtotal,
      discount: round2(acc.discount + lineDiscount),
      tax: round2(acc.tax + tax),
      total: round2(acc.total + taxable + tax),
    }
  }, {subtotal, discount:0, tax:0, total:0})
}

describe('Money Math - Plan.md Compliance', () => {
  it('should match plan.md reference implementation exactly', () => {
    const testCases = [
      // Single line, no tax, no discount
      { lines: [{ price: 10, qty: 2, taxRate: 0 }], discount: 0 },
      
      // Single line with tax
      { lines: [{ price: 100, qty: 1, taxRate: 0.14 }], discount: 0 },
      
      // Single line with tax and discount
      { lines: [{ price: 100, qty: 1, taxRate: 0.14 }], discount: 10 },
      
      // Multi-line mixed rates with prorated discount
      { 
        lines: [
          { price: 100, qty: 1, taxRate: 0.14 },
          { price: 50, qty: 1, taxRate: 0 }
        ], 
        discount: 30 
      },
      
      // Rounding edge case
      { lines: [{ price: 10.005, qty: 1, taxRate: 0.1 }], discount: 0 },
      
      // Discount capped at subtotal
      { lines: [{ price: 20, qty: 1, taxRate: 0.14 }], discount: 999 },
      
      // Complex multi-line scenario
      {
        lines: [
          { price: 12.99, qty: 2, taxRate: 0.15 },  // burger
          { price: 3.50, qty: 1, taxRate: 0.10 },   // drink  
          { price: 2.25, qty: 3, taxRate: 0.08 }    // sides
        ],
        discount: 5.00
      }
    ]

    testCases.forEach((testCase, index) => {
      const our = computeTotals(testCase.lines, testCase.discount)
      const reference = computeTotalsReference(testCase.lines, testCase.discount)
      
      expect(our).toEqual(reference, `Test case ${index + 1} should match reference implementation`)
    })
  })

  it('should follow plan.md rules correctly', () => {
    // Test the specific rules from plan.md:
    // 1. Discount before tax
    // 2. Per-line tax on discounted base  
    // 3. Half-up rounding to 2 decimals
    // 4. Prorate discount by line value for mixed tax rates

    const result = computeTotals([
      { price: 100, qty: 1, taxRate: 0.14 },  // Line 1: $100, 14% tax
      { price: 50, qty: 1, taxRate: 0.08 }    // Line 2: $50, 8% tax  
    ], 30) // $30 discount

    // Subtotal: $150
    // Discount prorated: Line 1 gets $20 (100/150 * 30), Line 2 gets $10 (50/150 * 30)
    // Taxable amounts: Line 1: $80, Line 2: $40
    // Taxes: Line 1: $80 * 0.14 = $11.20, Line 2: $40 * 0.08 = $3.20
    // Total: $80 + $40 + $11.20 + $3.20 = $134.40

    expect(result.subtotal).toBe(150)
    expect(result.discount).toBe(30)
    expect(result.tax).toBe(14.4) // 11.2 + 3.2 = 14.4
    expect(result.total).toBe(134.4) // 80 + 40 + 14.4 = 134.4
  })

  it('should handle half-up rounding correctly', () => {
    // Test half-up rounding with the round2 function
    expect(round2(1.005)).toBe(1.01)  // Should round up
    expect(round2(1.004)).toBe(1.00)  // Should round down
    expect(round2(2.995)).toBe(3.00)  // Should round up
    expect(round2(2.994)).toBe(2.99)  // Should round down
  })
})
