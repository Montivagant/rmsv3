import type { OversellPolicy } from './types'

// Storage keys
export const OVERSELL_POLICY_KEY = 'rms.inventory.oversellPolicy'
export const OVERSELL_POLICY_DEFAULT_KEY = 'rms.inventory.oversellPolicy.default'

// Default policy
const DEFAULT_OVERSELL_POLICY: OversellPolicy = 'block'

/**
 * Get the current oversell policy from localStorage
 * Falls back to technical default if set, otherwise uses system default
 */
export function getOversellPolicy(): OversellPolicy {
  // First check user setting
  const userPolicy = localStorage.getItem(OVERSELL_POLICY_KEY)
  if (userPolicy && isValidOversellPolicy(userPolicy)) {
    return userPolicy as OversellPolicy
  }
  
  // Fall back to technical default
  const defaultPolicy = localStorage.getItem(OVERSELL_POLICY_DEFAULT_KEY)
  if (defaultPolicy && isValidOversellPolicy(defaultPolicy)) {
    return defaultPolicy as OversellPolicy
  }
  
  // System default
  return DEFAULT_OVERSELL_POLICY
}

/**
 * Set the user's oversell policy preference
 */
export function setOversellPolicy(policy: OversellPolicy): void {
  localStorage.setItem(OVERSELL_POLICY_KEY, policy)
}

/**
 * Get the technical default oversell policy
 */
export function getOversellPolicyDefault(): OversellPolicy {
  const defaultPolicy = localStorage.getItem(OVERSELL_POLICY_DEFAULT_KEY)
  if (defaultPolicy && isValidOversellPolicy(defaultPolicy)) {
    return defaultPolicy as OversellPolicy
  }
  return DEFAULT_OVERSELL_POLICY
}

/**
 * Set the technical default oversell policy
 */
export function setOversellPolicyDefault(policy: OversellPolicy): void {
  localStorage.setItem(OVERSELL_POLICY_DEFAULT_KEY, policy)
}

/**
 * Reset user policy to use technical default
 */
export function resetOversellPolicyToDefault(): void {
  localStorage.removeItem(OVERSELL_POLICY_KEY)
}

/**
 * Validate if a string is a valid oversell policy
 */
function isValidOversellPolicy(value: string): boolean {
  return value === 'block' || value === 'allow_negative_alert'
}