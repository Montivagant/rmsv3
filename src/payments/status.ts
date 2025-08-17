import { Event } from '../events/types';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

/**
 * Derives the current payment status from a list of payment events
 * Handles out-of-order events by prioritizing the latest timestamp
 */
export function derivePaymentStatus(events: Event[]): PaymentStatus | null {
  const paymentEvents = events.filter(event => 
    event.type === 'payment.initiated' || 
    event.type === 'payment.succeeded' || 
    event.type === 'payment.failed'
  );

  if (paymentEvents.length === 0) {
    return null;
  }

  // Sort by timestamp to handle out-of-order events
  const sortedEvents = paymentEvents.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const latestEvent = sortedEvents[sortedEvents.length - 1];

  switch (latestEvent.type) {
    case 'payment.initiated':
      return 'pending';
    case 'payment.succeeded':
      return 'paid';
    case 'payment.failed':
      return 'failed';
    default:
      return null;
  }
}