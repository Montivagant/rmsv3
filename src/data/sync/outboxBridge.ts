import type { Event } from '../../events/types';
import type { KnownEvent } from '../remote/client';
import { enqueue, startOutbox } from './outbox';

let outboxEnabled = false;
let stopOutbox: (() => void) | null = null;

export interface OutboxConfig {
  enabled: boolean;
}

export function configureOutbox(config: OutboxConfig) {
  const canRunInBrowser = typeof window !== 'undefined';
  const shouldEnable = config.enabled && canRunInBrowser;

  if (shouldEnable && !outboxEnabled) {
    outboxEnabled = true;
    if (!stopOutbox) {
      stopOutbox = startOutbox();
    }
  } else if (!shouldEnable && outboxEnabled) {
    outboxEnabled = false;
    if (stopOutbox) {
      stopOutbox();
      stopOutbox = null;
    }
  }
}

export function dispatchOutboxEvent(event: Event) {
  if (!outboxEnabled) return;
  if (!event.aggregate || !event.aggregate.id) return;

  const remoteEvent: KnownEvent = {
    id: event.id,
    seq: event.seq,
    type: event.type,
    at: event.at,
    aggregate: event.aggregate,
    payload: event.payload,
    version: (event as any).version,
  };

  enqueue(remoteEvent);
}

