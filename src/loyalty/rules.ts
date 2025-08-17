/**
 * Loyalty system core math functions
 * All functions are pure and deterministic
 */

export interface LoyaltyConfig {
  ACCRUAL_UNIT: number    // Currency amount needed to earn points
  POINTS_PER_UNIT: number // Points earned per accrual unit
  POINT_VALUE: number     // Monetary value of each point
}

/**
 * Default loyalty configuration
 */
export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  ACCRUAL_UNIT: 1.00,     // Earn points for every $1 spent
  POINTS_PER_UNIT: 1,     // Earn 1 point per $1
  POINT_VALUE: 0.10       // Each point worth $0.10
}

/**
 * Calculate points earned from a purchase total
 * Uses floor math: earned = floor(total / ACCRUAL_UNIT) * POINTS_PER_UNIT
 * 
 * @param total - Purchase total (post-discount, pre-payment)
 * @param config - Loyalty configuration
 * @returns Points earned (integer)
 */
export function earnPoints(total: number, config: LoyaltyConfig): number {
  if (total <= 0) return 0
  return Math.floor(total / config.ACCRUAL_UNIT) * config.POINTS_PER_UNIT
}

/**
 * Convert points to monetary value
 * 
 * @param points - Number of points
 * @param config - Loyalty configuration
 * @returns Monetary value (rounded to 2 decimal places, HALF-UP)
 */
export function pointsToValue(points: number, config: LoyaltyConfig): number {
  if (points <= 0) return 0
  const value = points * config.POINT_VALUE
  return Math.round(value * 100) / 100 // Round to 2dp HALF-UP
}

/**
 * Convert monetary value to points (clamped to integer)
 * 
 * @param value - Monetary value
 * @param config - Loyalty configuration
 * @returns Points (integer, floored)
 */
export function valueToPoints(value: number, config: LoyaltyConfig): number {
  if (value <= 0) return 0
  return Math.floor(value / config.POINT_VALUE)
}

/**
 * Calculate maximum points that can be redeemed for a given total
 * Ensures redemption never creates negative totals
 * 
 * @param availablePoints - Customer's available point balance
 * @param total - Current purchase total
 * @param config - Loyalty configuration
 * @returns Maximum points that can be applied
 */
export function maxRedeemablePoints(
  availablePoints: number,
  total: number,
  config: LoyaltyConfig
): number {
  if (availablePoints <= 0 || total <= 0) return 0
  
  const maxPointsByValue = valueToPoints(total, config)
  return Math.min(availablePoints, maxPointsByValue)
}