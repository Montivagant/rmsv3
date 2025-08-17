import { describe, it, expect } from 'vitest'
import { computeTotals } from '../totals'

describe('computeTotals', () => {
  it('single line, no tax, no discount', () => {
    const r = computeTotals([{ price: 10, qty: 2, taxRate: 0 }], 0)
    expect(r).toEqual({ subtotal: 20, discount: 0, tax: 0, total: 20 })
  })

  it('single line, 14% tax, no discount', () => {
    const r = computeTotals([{ price: 100, qty: 1, taxRate: 0.14 }], 0)
    expect(r).toEqual({ subtotal: 100, discount: 0, tax: 14, total: 114 })
  })

  it('single line, 14% tax, partial discount', () => {
    const r = computeTotals([{ price: 100, qty: 1, taxRate: 0.14 }], 10)
    // discount applies before tax: taxable=90, tax=12.6 -> 12.6 rounds to 12.6
    expect(r).toEqual({ subtotal: 100, discount: 10, tax: 12.6, total: 102.6 })
  })

  it('multi-line, mixed rates, discount prorated', () => {
    const r = computeTotals([
      { price: 100, qty: 1, taxRate: 0.14 }, // 100
      { price: 50, qty: 1, taxRate: 0 },     // 50
    ], 30)
    // subtotal=150, shares: 100/150=0.666..., 50/150=0.333...
    // discounts: 20, 10; taxable: 80 & 40; tax=11.2; total=80+40+11.2=131.2
    expect(r).toEqual({ subtotal: 150, discount: 30, tax: 11.2, total: 131.2 })
  })

  it('rounding edge .005 half-up', () => {
    // Choose values that create a 0.005 boundary in tax
    const r = computeTotals([{ price: 10.005, qty: 1, taxRate: 0.1 }], 0)
    // lineSub rounds to 10.01; taxable=10.01; tax=1.001 -> 1.0 (half-up to 2 dp = 1.0)
    expect(r).toEqual({ subtotal: 10.01, discount: 0, tax: 1.0, total: 11.01 })
  })

  it('discount capped at subtotal', () => {
    const r = computeTotals([{ price: 20, qty: 1, taxRate: 0.14 }], 999)
    // cap=20; taxable=0; tax=0; total=0
    expect(r).toEqual({ subtotal: 20, discount: 20, tax: 0, total: 0 })
  })
})