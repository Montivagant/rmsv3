import { EventStore, IdempotencyConflictError } from '../events/types';
import { hashParams } from '../events/hash';

export interface WebhookParams {
  provider: string;
  sessionId: string;
  eventType: 'succeeded' | 'failed';
  ticketId: string;
  amount: number;
  currency?: string;
  reason?: string;
}

export interface WebhookResult {
  success: boolean;
  deduped: boolean;
  error?: string;
}

// Generate idempotency keys for payment events
export function generatePaymentKeys(provider: string, sessionId: string) {
  return {
    initiated: `pay:init:${provider}:${sessionId}`,
    webhook: `pay:webhook:${provider}:${sessionId}`
  };
}

// Handle payment webhook with idempotency and deduplication
export function handleWebhook(store: EventStore, params: WebhookParams): WebhookResult {
  const { provider, sessionId, eventType, ticketId, amount, currency, reason } = params;
  const keys = generatePaymentKeys(provider, sessionId);
  
  try {
    // Append the webhook event - store handles idempotency and deduplication
    if (eventType === 'succeeded') {
      const result = store.append('payment.succeeded', {
        ticketId,
        provider,
        sessionId,
        amount,
        currency
      }, {
        key: keys.webhook,
        params,
        aggregate: { id: ticketId, type: 'ticket' }
      });
      
      return {
        success: true,
        deduped: result.deduped
      };
    } else if (eventType === 'failed') {
      const result = store.append('payment.failed', {
        ticketId,
        provider,
        sessionId,
        amount,
        currency,
        reason
      }, {
        key: keys.webhook,
        params,
        aggregate: { id: ticketId, type: 'ticket' }
      });
      
      return {
        success: true,
        deduped: result.deduped
      };
    } else {
      return {
        success: false,
        deduped: false,
        error: `Unknown event type: ${eventType}`
      };
    }
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      throw error;
    }
    
    return {
      success: false,
      deduped: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Derive payment status from events
export function derivePaymentStatus(events: any[], ticketId: string): 'pending' | 'paid' | 'failed' | 'none' {
  const paymentEvents = events.filter(e => 
    e.type.startsWith('payment.') && 
    e.payload.ticketId === ticketId
  ).sort((a, b) => a.seq - b.seq);

  if (paymentEvents.length === 0) {
    return 'none';
  }

  // Check if there's an initiated event
  const hasInitiated = paymentEvents.some(e => e.type === 'payment.initiated');
  if (!hasInitiated) {
    return 'none';
  }

  // Find the latest terminal event (succeeded or failed)
  const terminalEvents = paymentEvents.filter(e => 
    e.type === 'payment.succeeded' || e.type === 'payment.failed'
  );

  if (terminalEvents.length === 0) {
    return 'pending';
  }

  // Get the latest terminal event
  const latestTerminal = terminalEvents[terminalEvents.length - 1];
  
  // If there's a succeeded event, the payment is paid (even if there were failures before)
  const hasSucceeded = terminalEvents.some(e => e.type === 'payment.succeeded');
  if (hasSucceeded) {
    return 'paid';
  }

  // Only failed events
  return 'failed';
}