import { onOnline, isOnline } from './online';
import { createRemoteClient, type KnownEvent } from '../remote/client';

export interface OutboxItem {
  id: string;
  event: KnownEvent;
  attempts: number;
  nextAttemptAt: number;
}

const queue: OutboxItem[] = [];
let processing = false;
let unsubscribeOnline: (() => void) | null = null;

function backoff(attempts: number): number {
  const base = 1000; // 1s
  const max = 30_000; // 30s
  const jitter = Math.random() * 250;
  return Math.min(max, base * Math.pow(2, Math.max(0, attempts - 1))) + jitter;
}

export function enqueue(event: KnownEvent) {
  queue.push({ id: event.id, event, attempts: 0, nextAttemptAt: Date.now() });
  tick();
}

async function processOnce(now = Date.now()) {
  if (processing) return;
  if (!isOnline()) return;
  const client = createRemoteClient();
  processing = true;
  try {
    const ready = queue.filter((q) => q.nextAttemptAt <= now);
    if (ready.length === 0) return;
    // Batch by small groups to avoid large payloads
    const batch = ready.slice(0, 50);
    await client.postEvents(batch.map((b) => b.event));
    // Remove delivered
    for (const item of batch) {
      const idx = queue.findIndex((q) => q.id === item.id);
      if (idx >= 0) queue.splice(idx, 1);
    }
  } catch (err) {
    // Reschedule with backoff
    const now2 = Date.now();
    for (const item of queue) {
      item.attempts += 1;
      item.nextAttemptAt = now2 + backoff(item.attempts);
    }
  } finally {
    processing = false;
  }
}

function tick() {
  void processOnce();
}

export function startOutbox() {
  if (!unsubscribeOnline) {
    unsubscribeOnline = onOnline(() => tick());
  }
  tick();
  return () => {
    if (unsubscribeOnline) {
      unsubscribeOnline();
      unsubscribeOnline = null;
    }
  };
}

