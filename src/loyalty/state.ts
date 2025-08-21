/**
 * Loyalty state management
 * Provides read models derived from events
 */

import { eventStore } from '../events/store'
import type { LoyaltyAccruedEvent, LoyaltyRedeemedEvent } from '../events/types'

/**
 * Get current loyalty point balance for a customer
 * Reduces loyalty.accrued - loyalty.redeemed from event store
 * 
 * @param customerId - Customer ID
 * @returns Current point balance
 */
export function getBalance(customerId: string): number {
  const events = eventStore.getAll()
  
  let balance = 0
  
  for (const event of events) {
    if (event.type === 'loyalty.accrued') {
      const accruedEvent = event as LoyaltyAccruedEvent
      if (accruedEvent.payload.customerId === customerId) {
        balance += accruedEvent.payload.points
      }
    } else if (event.type === 'loyalty.redeemed') {
      const redeemedEvent = event as LoyaltyRedeemedEvent
      if (redeemedEvent.payload.customerId === customerId) {
        balance -= redeemedEvent.payload.points
      }
    }
  }
  
  return Math.max(0, balance) // Ensure non-negative balance
}

/**
 * Get all loyalty transactions for a customer
 * 
 * @param customerId - Customer ID
 * @returns Array of loyalty events for the customer
 */
export function getTransactions(customerId: string): (LoyaltyAccruedEvent | LoyaltyRedeemedEvent)[] {
  const events = eventStore.getAll()
  
  return events.filter(event => {
    if (event.type === 'loyalty.accrued') {
      return (event as LoyaltyAccruedEvent).payload.customerId === customerId
    } else if (event.type === 'loyalty.redeemed') {
      return (event as LoyaltyRedeemedEvent).payload.customerId === customerId
    }
    return false
  }) as (LoyaltyAccruedEvent | LoyaltyRedeemedEvent)[]
}