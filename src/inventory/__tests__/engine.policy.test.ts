import { describe, it, expect } from 'vitest'
import { InventoryEngine } from '../../inventory/engine'
import { eventStore } from '../../events/store'

describe('InventoryEngine policies', () => {
  it('reduces stock when available (block policy)', () => {
    eventStore.reset()
    const eng = new InventoryEngine({ 'beef-patty': 10, 'burger-bun': 10, 'lettuce': 10, 'tomato': 10, 'onion': 10 })
    const payload = {
      ticketId: 't1',
      lines: [{ sku: '1', name: 'Classic Burger', qty: 1, price: 80, taxRate: 0 }],
      totals: { subtotal: 80, discount: 0, tax: 0, total: 80 }
    }
    const r = eng.applySale(payload, 'block')
    expect(r.alerts || []).toHaveLength(0)
    expect(eng.getQty('beef-patty')).toBe(9)
    expect(eng.getQty('burger-bun')).toBe(9)
  })

  it('blocks when insufficient (block policy)', () => {
    eventStore.reset()
    const eng = new InventoryEngine({ 'beef-patty': 0, 'burger-bun': 1, 'lettuce': 1, 'tomato': 1, 'onion': 1 })
    const payload = {
      ticketId: 't2',
      lines: [{ sku: '1', name: 'Classic Burger', qty: 1, price: 80, taxRate: 0 }],
      totals: { subtotal: 80, discount: 0, tax: 0, total: 80 }
    }
    expect(() => eng.applySale(payload, 'block')).toThrowError(/Insufficient stock/)
  })

  it('allows negative and alerts (allow_negative_alert)', () => {
    eventStore.reset()
    const eng = new InventoryEngine({ 'beef-patty': 0, 'burger-bun': 0, 'lettuce': 0, 'tomato': 0, 'onion': 0 })
    const payload = {
      ticketId: 't3',
      lines: [{ sku: '1', name: 'Classic Burger', qty: 1, price: 80, taxRate: 0 }],
      totals: { subtotal: 80, discount: 0, tax: 0, total: 80 }
    }
    const r = eng.applySale(payload, 'allow_negative_alert')
    expect(r.alerts?.join(' ')).toMatch(/negative/)
    expect(eng.getQty('beef-patty')).toBeLessThan(0)
    expect(eng.getQty('burger-bun')).toBeLessThan(0)
  })
})