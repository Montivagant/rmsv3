import type { EventStore, Event as AppEvent } from '../events/types';
import { IdempotencyConflictError } from '../events/types';
import { isPaymentInitiated, isPaymentTerminalEvent, isPaymentSucceeded } from '../events/guards';

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
export function derivePaymentStatus(events: AppEvent[], ticketId: string): 'pending' | 'paid' | 'failed' | 'none' {
  const paymentEvents = events.filter(e => {
    if (!e.type.startsWith('payment.')) return false;
    const paymentEvent = e as any; // Type assertion for payload access
    return paymentEvent.payload?.ticketId === ticketId;
  }).sort((a, b) => (a as any).seq - (b as any).seq);

  if (paymentEvents.length === 0) {
    return 'none';
  }

  // Check if there's an initiated event
  const hasInitiated = paymentEvents.some(isPaymentInitiated);
  if (!hasInitiated) {
    return 'none';
  }

  // Find the latest terminal event (succeeded or failed)
  const terminalEvents = paymentEvents.filter(isPaymentTerminalEvent);

  if (terminalEvents.length === 0) {
    return 'pending';
  }

  // Get the latest terminal event
  // const _latestTerminal = terminalEvents[terminalEvents.length - 1];
  
  // If there's a succeeded event, the payment is paid (even if there were failures before)
  const hasSucceeded = terminalEvents.some(isPaymentSucceeded);
  if (hasSucceeded) {
    return 'paid';
  }

  // Only failed events
  return 'failed';
}