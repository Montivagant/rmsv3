export interface InventoryItem {
  sku: string
  name: string
  qty: number
  unit?: string
}

export type OversellPolicy = 'block' | 'allow_negative_alert'

export interface ComponentRequirement {
  sku: string
  qty: number
}

export interface InventoryAdjustmentReport {
  alerts?: string[]
  adjustments: Array<{
    sku: string
    oldQty: number
    newQty: number
    delta: number
  }>
}

export class OversellError extends Error {
  code = 'OVERSELL_BLOCKED' as const
  sku: string
  
  constructor(sku: string, message = `Oversell blocked for SKU: ${sku}`) {
    super(message)
    this.sku = sku
  }
}