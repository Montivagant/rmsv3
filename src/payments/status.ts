import type { Event as AppEvent } from '../events/types';
import { isPaymentEvent, isPaymentInitiated, isPaymentSucceeded, isPaymentFailed } from '../events/guards';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

/**
 * Derives the current payment status from a list of payment events
 * Handles out-of-order events by prioritizing the latest timestamp
 */
export function derivePaymentStatus(events: AppEvent[], ticketId?: string): PaymentStatus | null {
  let paymentEvents = events.filter(isPaymentEvent);
  
  // Filter by ticketId if provided
  if (ticketId) {
    paymentEvents = paymentEvents.filter(event => {
      return event.payload?.ticketId === ticketId;
    });
  }

  if (paymentEvents.length === 0) {
    return null;
  }

  // Sort by timestamp to handle out-of-order events
  const sortedEvents = paymentEvents.sort((a, b) => 
    a.at - b.at
  );

  const latestEvent = sortedEvents[sortedEvents.length - 1];

  if (isPaymentInitiated(latestEvent)) {
    return 'pending';
  } else if (isPaymentSucceeded(latestEvent)) {
    return 'paid';
  } else if (isPaymentFailed(latestEvent)) {
    return 'failed';
  }
  
  return null;
}