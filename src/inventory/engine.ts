import type { OversellPolicy, InventoryAdjustmentReport } from './types'
import { OversellError } from './types'
import { explodeLines } from './recipes'
import type { SaleRecordedPayload } from '../events/types';

export class InventoryEngine {
  private quantities: Map<string, number>

  constructor(initial: Record<string, number> = {}) {
    this.quantities = new Map(Object.entries(initial))
  }

  /**
   * Get current quantity for a SKU
   */
  getQty(sku: string): number {
    return this.quantities.get(sku) || 0
  }

  /**
   * Set quantity for a SKU
   */
  setQty(sku: string, qty: number): void {
    this.quantities.set(sku, qty)
  }

  /**
   * Get all current quantities
   */
  getAllQuantities(): Record<string, number> {
    return Object.fromEntries(this.quantities)
  }

  /**
   * Apply a sale to inventory, adjusting quantities
   * Returns adjustment report with any alerts
   */
  applySale(
    payload: SaleRecordedPayload,
    policy: OversellPolicy
  ): InventoryAdjustmentReport {
    // Explode sale lines into component requirements
    const requirements = explodeLines(payload.lines)
    
    // Check availability if policy is 'block'
    if (policy === 'block') {
      for (const req of requirements) {
        const available = this.getQty(req.sku)
        if (available < req.qty) {
          throw new OversellError(req.sku, `Insufficient stock for ${req.sku}: need ${req.qty}, have ${available}`)
        }
      }
    }

    // Apply adjustments
    const adjustments: InventoryAdjustmentReport['adjustments'] = []
    const alerts: string[] = []

    for (const req of requirements) {
      const oldQty = this.getQty(req.sku)
      const newQty = oldQty - req.qty
      const delta = -req.qty

      // Update internal quantity
      this.setQty(req.sku, newQty)

      // Record adjustment
      adjustments.push({
        sku: req.sku,
        oldQty,
        newQty,
        delta
      })

      // Note: Inventory adjustment event would be appended by caller if needed

      // Check for negative stock alerts
      if (newQty < 0 && policy === 'allow_negative_alert') {
        alerts.push(`Low stock alert: ${req.sku} is now at ${newQty} (negative)`)
      } else if (newQty <= 5 && newQty >= 0) {
        alerts.push(`Low stock warning: ${req.sku} is down to ${newQty} units`)
      }
    }

    const report: InventoryAdjustmentReport = {
      adjustments,
    };
    if (alerts.length > 0) {
      report.alerts = alerts;
    }
    return report;
  }

  /**
   * Reset all quantities (for testing)
   */
  reset(): void {
    this.quantities.clear()
  }

  /**
   * Bulk update quantities
   */
  updateQuantities(updates: Record<string, number>): void {
    for (const [sku, qty] of Object.entries(updates)) {
      this.setQty(sku, qty)
    }
  }
}

// Singleton instance for demo purposes
// In a real app, this would be injected via context or DI
export const inventoryEngine = new InventoryEngine({
  // Initial stock for burger restaurant demo
  'beef-patty': 100,
  'chicken-breast': 50,
  'burger-bun': 100,
  'sandwich-bun': 50,
  'lettuce': 500, // 500g
  'tomato': 300, // 300g
  'onion': 200, // 200g
  'onions': 1000, // 1kg for onion rings
  'mayo': 500, // 500g
  'potatoes': 2000, // 2kg
  'batter-mix': 500, // 500g
  'oil': 1000, // 1L
  'cola-syrup': 500, // 500ml
  'coffee-beans': 1000, // 1kg
  'water': 10000, // 10L
  'cup-large': 200,
  'cup-medium': 150,
  'lid-large': 200,
  'lid-medium': 150
})