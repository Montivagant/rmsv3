import type { ComponentRequirement } from './types'

// Recipe definitions: product name/sku -> list of components
export const RECIPES: Record<string, ComponentRequirement[]> = {
  // Main dishes
  'Classic Burger': [
    { sku: 'beef-patty', qty: 1 },
    { sku: 'burger-bun', qty: 1 },
    { sku: 'lettuce', qty: 0.02 }, // 20g lettuce
    { sku: 'tomato', qty: 0.03 }, // 30g tomato
    { sku: 'onion', qty: 0.01 } // 10g onion
  ],
  'Chicken Sandwich': [
    { sku: 'chicken-breast', qty: 1 },
    { sku: 'sandwich-bun', qty: 1 },
    { sku: 'mayo', qty: 0.01 } // 10g mayo
  ],
  
  // Sides
  'French Fries': [
    { sku: 'potatoes', qty: 0.2 }, // 200g potatoes
    { sku: 'oil', qty: 0.05 } // 50ml oil
  ],
  'Onion Rings': [
    { sku: 'onions', qty: 0.15 }, // 150g onions
    { sku: 'batter-mix', qty: 0.1 }, // 100g batter
    { sku: 'oil', qty: 0.05 } // 50ml oil
  ],
  
  // Drinks
  'Coca Cola': [
    { sku: 'cola-syrup', qty: 0.05 }, // 50ml syrup
    { sku: 'water', qty: 0.3 }, // 300ml water
    { sku: 'cup-large', qty: 1 },
    { sku: 'lid-large', qty: 1 }
  ],
  'Coffee': [
    { sku: 'coffee-beans', qty: 0.02 }, // 20g beans
    { sku: 'water', qty: 0.25 }, // 250ml water
    { sku: 'cup-medium', qty: 1 },
    { sku: 'lid-medium', qty: 1 }
  ]
}

// SKU-based recipe lookup (for when line.sku is available)
export const RECIPES_BY_SKU: Record<string, ComponentRequirement[]> = {
  '1': RECIPES['Classic Burger'],
  '2': RECIPES['Chicken Sandwich'],
  '3': RECIPES['French Fries'],
  '4': RECIPES['Onion Rings'],
  '5': RECIPES['Coca Cola'],
  '6': RECIPES['Coffee']
}

/**
 * Explode a sale line into component requirements
 * Prefers line.sku lookup, falls back to line.name
 */
export function explodeLine(line: {
  sku?: string
  name: string
  qty: number
  price: number
}): ComponentRequirement[] {
  let recipe: ComponentRequirement[] | undefined
  
  // Try SKU-based lookup first
  if (line.sku && RECIPES_BY_SKU[line.sku]) {
    recipe = RECIPES_BY_SKU[line.sku]
  }
  // Fall back to name-based lookup (normalize to lowercase)
  else {
    const normalizedName = line.name.toLowerCase().trim()
    recipe = RECIPES[normalizedName]
  }
  
  // If no recipe found, assume it's a direct inventory item
  if (!recipe) {
    return [{
      sku: line.sku || line.name.toLowerCase().replace(/\s+/g, '-'),
      qty: line.qty
    }]
  }
  
  // Scale recipe by line quantity
  return recipe.map(component => ({
    sku: component.sku,
    qty: component.qty * line.qty
  }))
}

/**
 * Explode multiple sale lines into aggregated component requirements
 */
export function explodeLines(lines: Array<{
  sku?: string
  name: string
  qty: number
  price: number
}>): ComponentRequirement[] {
  const aggregated = new Map<string, number>()
  
  for (const line of lines) {
    const components = explodeLine(line)
    for (const component of components) {
      const current = aggregated.get(component.sku) || 0
      aggregated.set(component.sku, current + component.qty)
    }
  }
  
  return Array.from(aggregated.entries()).map(([sku, qty]) => ({ sku, qty }))
}